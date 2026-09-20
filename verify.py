#!/usr/bin/env python3
"""
테마 바스켓 검증 — 종목이 자기 테마랑 같이 움직이는지 상관계수로 확인.

  종목 등락률  vs  같은 테마 '나머지 종목' 평균 등락률  (leave-one-out)
  + 다른 테마 평균과도 비교해서 더 잘 맞는 테마가 있으면 표시

사용:
  python verify.py                  # 최근 1년
  python verify.py --period 2y
  python verify.py --offline        # 직전 실행 캐시 재사용 (API 호출 없음)

산출물: verify_report.md + data/themes.json (+ 캐시 .verify_cache.json)
Build.py 와 같은 폴더에서 실행. 토스 허용 IP에서만 동작.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
from datetime import datetime
from pathlib import Path

import yaml

import Build as B   # Build.py 의 수집 함수 재사용

CACHE = Path(".verify_cache.json")
MIN_DAYS = 60       # 공통 거래일이 이보다 적으면 판정 보류

GOOD, WATCH = 0.6, 0.3   # 판정 기준


# ================================================================= 통계
def pearson(xs, ys):
    n = len(xs)
    if n < 3:
        return None
    mx, my = sum(xs) / n, sum(ys) / n
    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    sxx = sum((x - mx) ** 2 for x in xs)
    syy = sum((y - my) ** 2 for y in ys)
    if sxx == 0 or syy == 0:
        return None
    return sxy / math.sqrt(sxx * syy)


def basket_mean(chg, codes, exclude=None):
    """{날짜: 평균}. 해당 날짜에 데이터 있는 종목이 절반 이상일 때만."""
    members = [c for c in codes if c != exclude and c in chg]
    if not members:
        return {}
    days = set().union(*(chg[c].keys() for c in members))
    out = {}
    for d in days:
        vals = [chg[c][d] for c in members if d in chg[c]]
        if len(vals) * 2 >= len(members):
            out[d] = sum(vals) / len(vals)
    return out


def corr_on_common(a, b):
    days = sorted(set(a) & set(b))
    if len(days) < MIN_DAYS:
        return None, len(days)
    return pearson([a[d] for d in days], [b[d] for d in days]), len(days)


def verdict(r):
    if r is None:
        return "–"
    if r >= GOOD:
        return "✅"
    if r >= WATCH:
        return "⚠️"
    return "❌"


def analyze(cfg, chg):
    """테마별 결과 리스트 반환."""
    themes = cfg["themes"]
    full_means = {t["id"]: basket_mean(chg, t["tickers"]) for t in themes}
    result = []

    for t in themes:
        rows = []
        for code in t["tickers"]:
            if code not in chg:
                rows.append({"code": code, "r": None, "n": 0, "best": None, "missing": True})
                continue
            own = basket_mean(chg, t["tickers"], exclude=code)
            r, n = corr_on_common(chg[code], own)

            # 다른 테마 중 가장 잘 맞는 곳
            best = None
            for o in themes:
                if o["id"] == t["id"]:
                    continue
                ro, _ = corr_on_common(chg[code], full_means[o["id"]])
                if ro is not None and (best is None or ro > best[1]):
                    best = (o["name"], ro)

            rows.append({"code": code, "r": r, "n": n, "best": best, "missing": False})

        # 테마 내부 응집도 = 멤버 r 평균
        rs = [x["r"] for x in rows if x["r"] is not None]
        cohesion = sum(rs) / len(rs) if rs else None
        result.append({"id": t["id"], "name": t["name"], "rows": rows, "cohesion": cohesion})
    return result


# ================================================================= 수집
def collect(cfg, period):
    B.load_env()
    cid = os.environ.get("TOSS_CLIENT_ID", "").strip()
    secret = os.environ.get("TOSS_CLIENT_SECRET", "").strip()
    if not cid or not secret:
        sys.exit("TOSS_CLIENT_ID / TOSS_CLIENT_SECRET 가 비어있어.")

    api = B.Api(B.get_token(cid, secret))
    count = B.parse_period(period)
    clip = cfg["aggregation"]["outlier_clip"]

    codes = sorted({c for t in cfg["themes"] for c in t["tickers"]})
    B.log(f"종목 수집 ({len(codes)}개, 캔들 {count}개)")
    chg = {}
    for i, code in enumerate(codes, 1):
        closes = B.fetch_stock(api, code, count)
        if len(closes) >= 2:
            # 집계와 같은 기준으로 절사
            chg[code] = {d: max(-clip, min(clip, v))
                         for d, v in B.closes_to_chg(closes).items()}
        else:
            B.log(f"  ! {code} 데이터 없음")
        if i % 20 == 0:
            B.log(f"  [{i:3d}/{len(codes)}] 진행 중...")

    B.log("종목명 조회")
    names = B.fetch_names(api, sorted(chg))
    B.log(f"API 호출 {api.calls}회")

    CACHE.write_text(json.dumps({"period": period, "chg": chg, "names": names},
                                ensure_ascii=False), encoding="utf-8")
    return chg, names


# ================================================================= 출력
def fmt_r(r):
    return f"{r:+.2f}" if r is not None else "  – "


def report(result, names, period):
    lines = [
        "# 테마 바스켓 검증 결과",
        "",
        f"- 기간: {period} / 생성: {datetime.now():%Y-%m-%d %H:%M}",
        f"- r = 종목 등락률 vs 같은 테마 나머지 종목 평균 (자기 제외) 상관계수",
        f"- 판정: ✅ {GOOD} 이상 유지 · ⚠️ {WATCH}~{GOOD} 지켜보기 · ❌ {WATCH} 미만 제외 검토",
        f"- '더 맞는 테마'는 다른 테마 평균과의 r 이 자기 테마보다 높을 때만 표시",
        "",
    ]
    flagged = []

    for t in result:
        coh = f"{t['cohesion']:.2f}" if t["cohesion"] is not None else "–"
        lines += [f"## {t['name']} (`{t['id']}`) — 응집도 {coh}", "",
                  "| 판정 | 코드 | 종목 | r | 일수 | 더 맞는 테마 |",
                  "|:-:|---|---|--:|--:|---|"]
        for x in sorted(t["rows"], key=lambda x: -(x["r"] if x["r"] is not None else -9)):
            nm = names.get(x["code"], x["code"])
            if x["missing"]:
                lines.append(f"| ❓ | {x['code']} | {nm} | – | 0 | 데이터 없음 (코드 확인) |")
                flagged.append((t["name"], nm, "데이터 없음"))
                continue
            better = ""
            if x["best"] and x["r"] is not None and x["best"][1] > x["r"]:
                better = f"{x['best'][0]} ({x['best'][1]:+.2f})"
            v = verdict(x["r"])
            lines.append(f"| {v} | {x['code']} | {nm} | {fmt_r(x['r'])} | {x['n']} | {better} |")
            if v in ("⚠️", "❌") or better:
                flagged.append((t["name"], nm, f"r {fmt_r(x['r'])}" + (f", {better} 쪽이 더 높음" if better else "")))
        lines.append("")

    lines += ["## 재검토 대상 요약", ""]
    if flagged:
        lines += ["| 테마 | 종목 | 사유 |", "|---|---|---|"]
        lines += [f"| {a} | {b} | {c} |" for a, b, c in flagged]
    else:
        lines.append("없음 — 전 종목이 자기 테마와 잘 붙어 있음")
    lines.append("")
    return "\n".join(lines), flagged


def export_json(result, names, period, path):
    """미니앱이 fetch 하는 기준 종목표 — 리포트(md)와 같은 계산을 앱이 읽는
       형태로 낸다. themes.yaml 의 전체 바스켓이 프론트로 내려가는 유일한 길."""
    themes = []
    for t in result:
        stocks = [
            {
                "code": x["code"],
                "name": names.get(x["code"], x["code"]),
                "r": None if x["r"] is None else round(x["r"], 2),
                "n": x["n"],
            }
            for x in sorted(t["rows"], key=lambda x: -(x["r"] if x["r"] is not None else -9))
        ]
        themes.append({
            "id": t["id"],
            "name": t["name"],
            "cohesion": None if t["cohesion"] is None else round(t["cohesion"], 2),
            "stocks": stocks,
        })

    payload = {
        "generatedAt": datetime.now().astimezone().isoformat(timespec="seconds"),
        # 캐시로 돌렸든 아니든 앱이 보여 줄 건 집계 기간 그 자체다
        "period": period.replace(" (캐시)", ""),
        "thresholds": {"good": GOOD, "watch": WATCH},
        "themes": themes,
    }
    out = Path(path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--period", default="1y", help="2y / 1y / 6m / 정수(일수)")
    ap.add_argument("--config", default="themes.yaml")
    ap.add_argument("--out", default="verify_report.md")
    ap.add_argument("--json", default="data/themes.json", help="미니앱용 JSON 경로")
    ap.add_argument("--offline", action="store_true", help="캐시 재사용 (API 호출 없음)")
    args = ap.parse_args()

    cfg = yaml.safe_load(Path(args.config).read_text(encoding="utf-8"))

    if args.offline:
        if not CACHE.exists():
            sys.exit("캐시가 없어. 먼저 --offline 없이 한 번 실행해줘.")
        c = json.loads(CACHE.read_text(encoding="utf-8"))
        chg, names, period = c["chg"], c["names"], c["period"] + " (캐시)"
        B.log(f"캐시 사용: {len(chg)}개 종목")
    else:
        chg, names = collect(cfg, args.period)
        period = args.period

    result = analyze(cfg, chg)
    md, flagged = report(result, names, period)
    Path(args.out).write_text(md, encoding="utf-8")
    export_json(result, names, period, args.json)

    B.log("\n== 테마 응집도")
    for t in sorted(result, key=lambda t: -(t["cohesion"] or 0)):
        coh = f"{t['cohesion']:.2f}" if t["cohesion"] is not None else "–"
        B.log(f"  {t['name']:12s} {coh}")
    B.log(f"\n재검토 대상 {len(flagged)}개")
    for a, b, c in flagged:
        B.log(f"  [{a}] {b} — {c}")
    B.log(f"\n리포트: {args.out} · 미니앱 JSON: {args.json}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
