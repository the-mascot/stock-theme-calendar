#!/usr/bin/env python3
"""
토스증권 Open API 탐침 스크립트.

목적 2개:
  1) OAuth 토큰 발급 방식 확정 (문서에 바디 형식이 안 나와서 3가지 시도)
  2) 토큰 받으면 우리가 쓸 엔드포인트들 응답 형태 확인

실행:
  pip install requests
  python probe.py

성공하면 probe_result.json 에 확정된 설정이 저장됨.
"""

import base64
import json
import os
import sys
from pathlib import Path

import requests

BASE = os.environ.get("TOSS_API_BASE", "https://openapi.tossinvest.com")
TIMEOUT = 15


# ---------------------------------------------------------------- .env 로드
def load_env(path=".env"):
    p = Path(path)
    if not p.exists():
        return
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())


# ---------------------------------------------------------------- 출력 헬퍼
def show(label, resp, limit=900):
    ok = 200 <= resp.status_code < 300
    mark = "OK  " if ok else "FAIL"
    print(f"  [{mark}] {label}  <{resp.status_code}>")
    body = resp.text or ""
    try:
        body = json.dumps(resp.json(), ensure_ascii=False, indent=2)
    except Exception:
        pass
    if len(body) > limit:
        body = body[:limit] + f"\n  ... (총 {len(resp.text)}자)"
    for ln in body.splitlines():
        print(f"       {ln}")
    print()
    return ok


# ---------------------------------------------------------------- 토큰 발급
def get_token(cid, secret):
    """3가지 방식 순서대로 시도. 성공한 방식을 함께 반환."""
    url = f"{BASE}/oauth2/token"
    basic = base64.b64encode(f"{cid}:{secret}".encode()).decode()

    attempts = [
        (
            "form-urlencoded + body creds",
            dict(
                data={
                    "grant_type": "client_credentials",
                    "client_id": cid,
                    "client_secret": secret,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            ),
        ),
        (
            "form-urlencoded + Basic auth",
            dict(
                data={"grant_type": "client_credentials"},
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Authorization": f"Basic {basic}",
                },
            ),
        ),
        (
            "JSON body",
            dict(
                json={
                    "grant_type": "client_credentials",
                    "client_id": cid,
                    "client_secret": secret,
                },
                headers={"Content-Type": "application/json"},
            ),
        ),
    ]

    print(f"== 토큰 발급 시도: POST {url}\n")
    for name, kw in attempts:
        try:
            r = requests.post(url, timeout=TIMEOUT, **kw)
        except requests.RequestException as e:
            print(f"  [FAIL] {name}  <네트워크 오류: {e}>\n")
            continue

        if show(name, r):
            data = r.json()
            token = data.get("access_token") or data.get("accessToken")
            if token:
                return token, name, data
            print("  응답은 200인데 access_token 필드를 못 찾음. 위 응답 확인 필요.\n")

    return None, None, None


# ---------------------------------------------------------------- 엔드포인트 탐침
def probe_endpoints(token):
    """확정해야 할 것: 지수 심볼, 캔들 파라미터 이름, 랭킹 타입."""
    h = {"Authorization": f"Bearer {token}"}
    found = {}

    def get(label, path, params=None):
        try:
            r = requests.get(f"{BASE}{path}", headers=h, params=params, timeout=TIMEOUT)
        except requests.RequestException as e:
            print(f"  [FAIL] {label}  <네트워크 오류: {e}>\n")
            return None
        return r if show(label, r) else None

    print("== 엔드포인트 탐침\n")

    # 1) 장 운영 정보 — 가장 단순, 토큰이 실제로 먹는지 확인용
    r = get("장 운영 정보 (KR)", "/api/v1/market-calendar/KR")
    found["market_calendar"] = bool(r)

    # 2) 시장 지표 현재가 — 지원 심볼 목록을 여기서 확인
    r = get("시장 지표 현재가", "/api/v1/market-indicators/prices")
    found["market_indicator_prices"] = bool(r)

    # 3) 지수 일봉 — 파라미터 이름을 몰라서 몇 가지 시도
    for params in (
        {"interval": "1d", "count": 5},
        {"period": "DAY", "count": 5},
        {"timeframe": "1d", "limit": 5},
        None,
    ):
        label = f"코스피 일봉 {params}"
        r = get(label, "/api/v1/market-indicators/KOSPI/candles", params)
        if r:
            found["index_candle_params"] = params
            break

    # 4) 종목 일봉 — QQQ (나스닥 대용) + 삼성전자
    for sym in ("QQQ", "005930"):
        p = found.get("index_candle_params") or {"interval": "1d", "count": 5}
        get(f"종목 일봉 {sym}", "/api/v1/candles", {**p, "symbol": sym})

    # 5) 랭킹 — 타입 파라미터 이름/값 확인
    for params in ({"type": "RISE"}, {"rankingType": "RISE"}, None):
        if get(f"랭킹 {params}", "/api/v1/rankings", params):
            found["ranking_params"] = params
            break

    return found


# ---------------------------------------------------------------- main
def main():
    load_env()
    cid = os.environ.get("TOSS_CLIENT_ID", "").strip()
    secret = os.environ.get("TOSS_CLIENT_SECRET", "").strip()

    if not cid or not secret:
        print(
            "TOSS_CLIENT_ID / TOSS_CLIENT_SECRET 가 비어있어.\n"
            ".env.example 을 .env 로 복사하고 secret 채운 다음 다시 실행해줘.",
            file=sys.stderr,
        )
        return 1

    token, method, raw = get_token(cid, secret)
    if not token:
        print("토큰 발급 실패. 위 3개 응답 그대로 복사해서 보내줘.", file=sys.stderr)
        return 1

    print(f"== 토큰 발급 성공 (방식: {method})")
    print(f"   만료: {raw.get('expires_in', '?')}초, 타입: {raw.get('token_type', '?')}\n")

    found = probe_endpoints(token)

    Path("probe_result.json").write_text(
        json.dumps(
            {"token_method": method, "token_response_keys": sorted(raw), "endpoints": found},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print("== probe_result.json 저장 완료")
    return 0


if __name__ == "__main__":
    sys.exit(main())