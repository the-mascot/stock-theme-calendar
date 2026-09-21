#!/usr/bin/env python3
"""
테마 캘린더 데이터 빌더 — 토스증권 Open API → 월별 정적 JSON

사용:
  python build.py --backfill 2y     # 최초 1회 (과거 채우기)
  python build.py --backfill 1y
  python build.py --daily           # 매일 (GitHub Actions)
  python build.py --daily --dry-run # 파일 안 쓰고 결과만 출력

산출물: data/YYYY-MM.json, data/index.json
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
import time
from collections import defaultdict
from datetime import datetime
from pathlib import Path

import requests
import yaml

BASE = os.environ.get("TOSS_API_BASE", "https://openapi.tossinvest.com")
TIMEOUT = 20
CALL_DELAY = 0.08          # MARKET_DATA_CHART 20/s 제한 → 약 12/s 로 여유
MAX_RETRY = 3


# ================================================================= 공통
def load_env(path=".env"):
    p = Path(path)
    if not p.exists():
        return
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


def log(msg):
    print(msg, flush=True)


class Api:
    def __init__(self, token):
        self.h = {"Authorization": f"Bearer {token}"}
        self.calls = 0

    def get(self, path, params=None):
        """성공하면 result dict, 실패하면 None."""
        for attempt in range(MAX_RETRY):
            try:
                r = requests.get(
                    f"{BASE}{path}", headers=self.h, params=params, timeout=TIMEOUT
                )
            except requests.RequestException as e:
                if attempt == MAX_RETRY - 1:
                    log(f"    ! 네트워크 오류 {path}: {e}")
                    return None
                time.sleep(1.5 * (attempt + 1))
                continue

            self.calls += 1
            time.sleep(CALL_DELAY)

            if r.status_code == 200:
                return r.json().get("result")
            if r.status_code == 429 or r.status_code >= 500:
                time.sleep(2.0 * (attempt + 1))
                continue
            # 400 류는 재시도해도 같음
            try:
                err = r.json().get("error", {})
                log(f"    ! {path} <{r.status_code}> {err.get('message')} {err.get('data')}")
            except Exception:
                log(f"    ! {path} <{r.status_code}> {r.text[:200]}")
            return None
        return None


def get_token(cid, secret):
    r = requests.post(
        f"{BASE}/oauth2/token",
        data={
            "grant_type": "client_credentials",
            "client_id": cid,
            "client_secret": secret,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=TIMEOUT,
    )
    r.raise_for_status()
    return r.json()["access_token"]


# ================================================================= 캔들
def candles_to_closes(result):
    """result.candles[] → {날짜: 종가float}. 응답은 최신순이라 정렬해서 반환."""
    if not result:
        return {}
    out = {}
    for c in result.get("candles", []):
        ts = c.get("timestamp", "")
        day = ts[:10]
        try:
            out[day] = float(c["closePrice"])
        except (KeyError, TypeError, ValueError):
            continue
    return out


def closes_to_chg(closes, bases=None):
    """{날짜: 종가} → {날짜: 전일대비 등락률%}. 첫날은 기준이 없어 제외.

    bases 를 주면 전일 종가 대신 그쪽 값을 분모로 쓴다 — KRX 애프터마켓
    이후로는 분모가 '전일 정규장 종가'라야 앱 표시와 맞는다
    (REGULAR_CLOSE_FROM 주석 참고)."""
    days = sorted(closes)
    chg = {}
    for i in range(1, len(days)):
        prev_day = days[i - 1]
        base = (bases or {}).get(prev_day) or closes[prev_day]
        if base:
            chg[days[i]] = (closes[days[i]] / base - 1.0) * 100.0
    return chg


def trunc2(x):
    """소수 둘째 자리 버림(0 쪽으로) — 토스 앱 등락률 표시와 같은 규칙.
    16.8176 → 16.81, -1.8685 → -1.86. round() 를 쓰면 셋째 자리가 5 이상일
    때 앱보다 0.01 크게 나온다.

    가격 나눗셈은 부동소수라 딱 떨어져야 할 값이 1.6999999… 로 나올 수 있다.
    그대로 자르면 1.69 가 되므로 자르기 전에 1e-9 만큼 바깥으로 민다."""
    if x is None:
        return None
    return math.trunc(x * 100 + math.copysign(1e-9, x)) / 100


PAGE_MAX = 200     # API 상한


def fetch_candles(api, path, params, need):
    """count 상한이 200이라 before/nextBefore 로 페이징해서 need 개까지 모은다."""
    out, before, pages = {}, None, 0

    while len(out) < need and pages < 20:
        p = dict(params)
        p["interval"] = "1d"
        p["adjusted"] = "true"                       # 수정주가
        p["count"] = min(PAGE_MAX, need - len(out) + 1)
        if before:
            p["before"] = before

        res = api.get(path, p)
        if not res:
            break
        pages += 1

        batch = candles_to_closes(res)
        if not batch:
            break

        oldest_before = min(out) if out else None
        out.update(batch)
        oldest_after = min(out)

        if oldest_before == oldest_after:             # 더 과거로 안 나감
            break

        before = res.get("nextBefore")
        if not before:
            # nextBefore 없으면 가장 오래된 봉 시각을 상한으로 (inclusive → 중복은 dict가 흡수)
            before = f"{oldest_after}T00:00:00.000+09:00"

    return out


def fetch_index(api, idx, need):
    if idx["source"] == "market_indicator":
        return fetch_candles(
            api, f"/api/v1/market-indicators/{idx['symbol']}/candles", {}, need
        )
    return fetch_candles(api, "/api/v1/candles", {"symbol": idx["symbol"]}, need)


def fetch_stock(api, code, need):
    return fetch_candles(api, "/api/v1/candles", {"symbol": code}, need)


# KRX 애프터마켓(정규장 마감 후 ~20시) 개장일.
#
# 이 날부터 일봉 closePrice 가 20시 애프터마켓 종가로 바뀌었는데, 토스 앱·
# 증권사가 보여 주는 등락률의 **분모는 여전히 전일 정규장 종가**다. 그래서
# 종가끼리 나누면 앱과 어긋난다(2026-09-18 SK하이닉스 +4.70% vs 앱 +5.96%).
#
#   앱 공식 = 그날 표시 종가(20시) ÷ 전일 정규장 종가
#
# 정규장 종가는 1분봉의 **15:31 봉**이다 — 15:20~15:30 은 종가 단일가 접수라
# 거래량 0 이고, 체결이 15:31 봉에 한꺼번에 찍힌다. 애프터마켓 이전 날짜로
# 검증하면 이 값이 증권사 일별시세 종가와 정확히 일치한다(9/11 1,812,000 등).
# 15:30 봉을 쓰면 단일가 체결분이 빠져서 틀린다.
#
# 1분봉은 interval=1m 만 지원하고 2년 전까지 나온다. 호출은 (종목 × 날짜)당 1번.
REGULAR_CLOSE_FROM = "2026-09-14"
REGULAR_CLOSE_MINUTE = "15:31"


def fetch_regular_close(api, code, day):
    """그날 정규장 종가(15:31 봉). 못 받으면 None → 호출부가 일봉 값을 쓴다."""
    res = api.get("/api/v1/candles", {
        "symbol": code, "interval": "1m", "count": 3,
        "before": f"{day}T{REGULAR_CLOSE_MINUTE}:59.000+09:00",
    })
    if not res:
        return None
    same_day = [c for c in res.get("candles", [])
                if c.get("timestamp", "")[:10] == day
                and c.get("timestamp", "")[11:16] <= REGULAR_CLOSE_MINUTE]
    if not same_day:
        return None
    newest = max(same_day, key=lambda c: c["timestamp"])
    try:
        return float(newest["closePrice"])
    except (KeyError, TypeError, ValueError):
        return None


def regular_bases(api, code, closes):
    """{날짜: 정규장 종가} — 분모로 쓸 날짜만. REGULAR_CLOSE_FROM 이후 날의
       분모는 그 직전 영업일이므로 한 칸 앞에서부터 받는다."""
    days = sorted(closes)
    start = next((i for i, d in enumerate(days) if d >= REGULAR_CLOSE_FROM), None)
    if start is None:
        return {}
    out = {}
    for day in days[max(0, start - 1):]:
        rc = fetch_regular_close(api, code, day)
        if rc:
            out[day] = rc
    return out


def extract_names(payload):
    """응답이 배열이든 {stocks:[...]} 든 흡수해서 {코드: 이름} 으로."""
    if isinstance(payload, list):
        items = payload
    elif isinstance(payload, dict):
        items = (payload.get("stocks") or payload.get("items")
                 or payload.get("results") or payload.get("result") or [])
        if isinstance(items, dict):
            items = [items]
    else:
        return {}

    names = {}
    for s in items:
        if not isinstance(s, dict):
            continue
        code = s.get("symbol") or s.get("code") or s.get("stockCode")
        nm = (s.get("name") or s.get("korName") or s.get("nameKr")
              or s.get("koreanName") or s.get("shortName"))
        if code and nm:
            names[str(code)] = nm
    return names


def fetch_names(api, codes, chunk=20):
    """종목코드 → 종목명. 실패해도 치명적이지 않으니 코드로 폴백."""
    try:
        for label, mk in (
            ("symbols(쉼표)", lambda cs: {"symbols": ",".join(cs)}),
            ("symbols(반복)", lambda cs: [("symbols", c) for c in cs]),
        ):
            probe = extract_names(api.get("/api/v1/stocks", mk(codes[:chunk])))
            if not probe:
                continue
            log(f"  종목명 조회 방식: {label}")
            names = dict(probe)
            for i in range(chunk, len(codes), chunk):
                names.update(
                    extract_names(api.get("/api/v1/stocks", mk(codes[i:i + chunk])))
                )
            log(f"  {len(names)}/{len(codes)}개 확인")
            return names
    except Exception as e:
        log(f"  ! 종목명 조회 중 오류: {e}")

    log("  ! 종목명 조회 실패 — 코드로 대체 (툴팁에 코드가 뜸)")
    return {}


# ================================================================= 장 마감 판정
def last_complete_date(api):
    """오늘 장이 끝났으면 오늘, 아니면 직전 영업일. 실패하면 None."""
    cal = api.get("/api/v1/market-calendar/KR")
    if not cal:
        return None

    today = cal.get("today") or {}
    prev = (cal.get("previousBusinessDay") or {}).get("date")
    end = ((today.get("integrated") or {}).get("regularMarket") or {}).get("endTime")

    if not end:                       # 휴장일
        return prev
    try:
        if datetime.now(datetime.fromisoformat(end).tzinfo) >= datetime.fromisoformat(end):
            return today.get("date")
    except ValueError:
        pass
    return prev


# ================================================================= 집계
def aggregate(cfg, theme_chg, kospi_chg, day):
    """하루치 테마 집계. 유효 종목이 모자라면 None."""
    clip = cfg["outlier_clip"]
    rows = []
    for code, chg_map in theme_chg.items():
        v = chg_map.get(day)
        if v is None:
            continue
        rows.append((code, max(-clip, min(clip, v))))

    if not rows or len(rows) / len(theme_chg) < cfg["min_valid_ratio"]:
        return None

    mean = sum(v for _, v in rows) / len(rows)
    top = sorted(rows, key=lambda x: x[1], reverse=True)[: cfg["top_n"]]
    k = kospi_chg.get(day)

    return {
        "chg": trunc2(mean),
        "rel": trunc2(mean - k) if k is not None else None,
        "n": len(rows),
        "top": [[c, trunc2(v)] for c, v in top],
    }


def nasdaq_for(qqq_chg, qqq_days, day):
    """한국 날짜 day 직전의 미국 세션 등락률."""
    prev = None
    for d in qqq_days:
        if d < day:
            prev = d
        else:
            break
    return trunc2(qqq_chg[prev]) if prev else None


# ================================================================= main
def parse_period(s):
    s = s.strip().lower()
    if s.endswith("y"):
        return int(float(s[:-1]) * 250) + 15
    if s.endswith("m"):
        return int(float(s[:-1]) * 21) + 15
    return int(s)


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--backfill", metavar="PERIOD", help="2y / 1y / 6m / 정수(일수)")
    g.add_argument("--daily", action="store_true")
    ap.add_argument("--config", default="themes.yaml")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    load_env()
    cid = os.environ.get("TOSS_CLIENT_ID", "").strip()
    secret = os.environ.get("TOSS_CLIENT_SECRET", "").strip()
    if not cid or not secret:
        log("TOSS_CLIENT_ID / TOSS_CLIENT_SECRET 가 비어있어.")
        return 1

    cfg = yaml.safe_load(Path(args.config).read_text(encoding="utf-8"))
    agg_cfg = cfg["aggregation"]
    out_dir = Path(cfg["backfill"]["output_dir"])

    count = parse_period(args.backfill) if args.backfill else 10
    mode = f"backfill {args.backfill}" if args.backfill else "daily"
    pages = -(-count // PAGE_MAX)        # 올림
    log(f"== 모드: {mode} (캔들 {count}개, 종목당 {pages}페이지)\n")

    api = Api(get_token(cid, secret))
    log("토큰 발급 완료")

    cutoff = last_complete_date(api)
    if not cutoff:
        log("장 운영 정보를 못 받아서 중단. 토큰/네트워크 확인 필요.")
        return 1
    log(f"기준일(장 마감 확정): {cutoff}\n")

    # ---- 지수
    log("지수 수집")
    idx_chg = {}
    for idx in cfg["indices"]:
        closes = fetch_index(api, idx, count)
        if not closes:
            log(f"  ! {idx['name']}({idx['symbol']}) 수집 실패")
            continue
        idx_chg[idx["id"]] = closes_to_chg(closes)
        log(f"  {idx['name']:6s} {len(closes)}일")

    kospi_chg = idx_chg.get(agg_cfg["relative_to"], {})
    if not kospi_chg:
        log(f"! 기준지수({agg_cfg['relative_to']}) 없음 → rel 계산 불가")

    qqq_chg = idx_chg.get("nasdaq", {})
    qqq_days = sorted(qqq_chg)

    # ---- 종목
    all_codes = sorted({c for t in cfg["themes"] for c in t["tickers"]})
    log(f"\n종목 수집 ({len(all_codes)}개)")
    stock_chg, skipped = {}, []
    fixed_total = 0
    for i, code in enumerate(all_codes, 1):
        closes = fetch_stock(api, code, count)
        if len(closes) < 2:
            skipped.append(code)
            log(f"  [{i:3d}/{len(all_codes)}] {code} ! 데이터 없음 — 스킵")
            continue
        bases = regular_bases(api, code, closes)
        fixed_total += len(bases)
        stock_chg[code] = closes_to_chg(closes, bases)
        if i % 20 == 0:
            log(f"  [{i:3d}/{len(all_codes)}] 진행 중...")

    if fixed_total:
        log(f"  정규장 종가를 분모로 사용: {fixed_total}건 ({REGULAR_CLOSE_FROM} 이후)")

    if skipped:
        log(f"\n! 스킵된 종목코드 ({len(skipped)}개): {', '.join(skipped)}")
        log("  themes.yaml 에서 확인/수정 필요")

    # ---- 날짜 축 = 기준지수 영업일
    days = [d for d in sorted(kospi_chg) if d <= cutoff]
    log(f"\n집계 대상 {len(days)}일 ({days[0] if days else '-'} ~ {days[-1] if days else '-'})")

    # ---- 일별 집계
    by_month = defaultdict(list)
    for day in days:
        th = {}
        for t in cfg["themes"]:
            member = {c: stock_chg[c] for c in t["tickers"] if c in stock_chg}
            if member:
                r = aggregate(agg_cfg, member, kospi_chg, day)
                if r:
                    th[t["id"]] = r

        lead = None
        ranked = [(k, v["rel"]) for k, v in th.items() if v["rel"] is not None]
        if ranked:
            lead = max(ranked, key=lambda x: x[1])[0]

        by_month[day[:7]].append({
            "d": day,
            "idx": {
                "kospi": trunc2(idx_chg.get("kospi", {}).get(day)),
                "kosdaq": trunc2(idx_chg.get("kosdaq", {}).get(day)),
                "nasdaq": nasdaq_for(qqq_chg, qqq_days, day),
            },
            "th": th,
            "lead": lead,
        })

    # ---- 출력
    theme_meta = [{"id": t["id"], "name": t["name"]} for t in cfg["themes"]]

    log("\n종목명 조회")
    valid_codes = sorted(stock_chg)
    names = fetch_names(api, valid_codes)
    stock_names = {c: names.get(c, c) for c in valid_codes}

    now = datetime.now().astimezone().isoformat(timespec="seconds")

    if args.dry_run:
        last = by_month[days[-1][:7]][-1] if days else None
        log("\n== dry-run: 마지막 날 결과")
        log(json.dumps(last, ensure_ascii=False, indent=2)[:1500])
        log(f"\n총 API 호출: {api.calls}회")
        return 0

    out_dir.mkdir(parents=True, exist_ok=True)
    for month, rows in sorted(by_month.items()):
        path = out_dir / f"{month}.json"

        # daily 모드는 기존 파일에 해당 일자만 갱신(upsert)
        if args.daily and path.exists():
            old = json.loads(path.read_text(encoding="utf-8"))
            merged = {r["d"]: r for r in old.get("days", [])}
            merged.update({r["d"]: r for r in rows})
            rows = [merged[d] for d in sorted(merged)]

        path.write_text(
            json.dumps(
                {
                    "month": month,
                    "updatedAt": now,
                    "themes": theme_meta,
                    "stocks": stock_names,
                    "days": rows,
                },
                ensure_ascii=False,
                separators=(",", ":"),
            ),
            encoding="utf-8",
        )
        log(f"  {path}  ({len(rows)}일, {path.stat().st_size // 1024}KB)")

    months = sorted(p.stem for p in out_dir.glob("20*.json"))
    (out_dir / "index.json").write_text(
        json.dumps(
            {
                "updatedAt": now,
                "lastDate": days[-1] if days else None,
                "months": months,
                "themes": theme_meta,
                "skippedTickers": skipped,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    log(f"\n완료. API 호출 {api.calls}회, 월 파일 {len(by_month)}개")
    return 0


if __name__ == "__main__":
    sys.exit(main())