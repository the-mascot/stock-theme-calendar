<!-- ait:design-guide v1 -->
@AGENTS.md
<!-- /ait:design-guide -->
# 테마 캘린더 (토스 미니앱)

일자별 주요 지수 등락률과 강세 테마를 캘린더로 보여줘서, **테마 순환 패턴을
눈으로 잡는 것**이 목적. 개인용으로 먼저 쓰고, 이후 앱인토스 미니앱으로 출시해
광고 수익화까지 가는 게 목표.

## 구조

```
toss/
├── Build.py          # 토스증권 API → 월별 정적 JSON
├── themes.yaml       # 테마 바스켓 정의 (손으로 관리)
├── .env              # TOSS_CLIENT_ID / TOSS_CLIENT_SECRET  (커밋 금지, gitignore됨)
├── data/              # GitHub Pages 루트 (repo root를 그대로 서빙)
│   ├── index.json
│   └── YYYY-MM.json   × 26개월
├── src/               # 미니앱 화면 (Apps in Toss web-framework, React)
└── .github/workflows/daily-batch.yml   # 평일 KST 16시 자동 배치
```

**서버 없음.** GitHub Actions(`daily-batch.yml`)가 매일 배치를 돌려 `data/`의
JSON을 커밋하고, GitHub Pages가 repo root를 그대로 서빙하고, 미니앱은
`https://<user>.github.io/<repo>/data/...`를 fetch만 한다. DB도 백엔드도 없다.

```bash
python Build.py --backfill 2y      # 최초 1회
python Build.py --daily            # 매일 (GitHub Actions가 자동 실행)
python Build.py --daily --dry-run  # 파일 안 쓰고 결과만
npm run dev                        # 미니앱 로컬 실행 (src/)
```

GitHub Pages 소스를 **"/ (root)"**로 설정해야 한다 — `docs/` 폴더를 없애고
`data/`를 repo root로 옮겼기 때문에, Pages 설정이 예전 `/docs` 소스로 남아있으면
아무것도 서빙되지 않는다. (저장소 Settings → Pages → Source)

## 데이터 스키마

`data/YYYY-MM.json`:

```json
{
  "month": "2026-09",
  "updatedAt": "2026-09-18T13:23:04+09:00",
  "themes": [{ "id": "semi", "name": "반도체" }],
  "stocks": { "005930": "삼성전자" },
  "days": [{
    "d": "2026-09-17",
    "idx": { "kospi": -0.04, "kosdaq": 0.76, "nasdaq": 0.03 },
    "th": {
      "semi": { "chg": 1.8, "rel": 1.84, "n": 10, "top": [["067310", 6.75]] }
    },
    "lead": "semi"
  }]
}
```

- `chg` — 바스켓 종목 일간 등락률의 **단순평균** (시총가중 아님)
- `rel` — `chg - 코스피 등락률`. **시장 대비 초과분.** 순환 관찰에는 이쪽이 핵심.
  시장이 +2% 오른 날은 모든 테마가 빨갛게 보여서 `chg`만으로는 구분이 안 된다
- `n` — 그날 유효했던 종목 수. 낮으면 신뢰도가 낮으니 UI에 같이 노출할 것
- `top` — `[종목코드, 등락률]` 상위 5개. 종목명은 `stocks` 맵에서 조회
- `lead` — `rel` 기준 1등 테마. UI에서 기준을 바꾸면 다시 뽑아야 한다

## 토스증권 Open API

문서에 없어서 직접 확인한 것들:

- 토큰: `POST /oauth2/token`, **form-urlencoded + 바디에 creds**. 유효 24시간
- 일봉: `GET /api/v1/candles?symbol=&interval=1d&count=&adjusted=true`
- 지수: `GET /api/v1/market-indicators/{KOSPI|KOSDAQ}/candles` — **8종만 지원**
- 휴장일: `GET /api/v1/market-calendar/KR` → `today`, `previousBusinessDay`
- 종목명: `GET /api/v1/stocks?symbols=005930,000660` — **응답이 배열로 온다** (객체 아님)

주의:

- **`count` 최대 200.** 2년치는 `before` / `nextBefore` 로 페이징해야 한다
- **응답 가격은 전부 문자열.** float 변환 필요
- **나스닥 지수는 없다.** `QQQ`(나스닥100 ETF)를 `/candles`로 받아 대용.
  한국 날짜 `d`에는 `d` 직전의 미국 세션을 붙인다
- **장중에 돌리면 당일 캔들이 미완성**이다. `regularMarket.endTime` 지나기 전이면
  직전 영업일까지만 집계 (`last_complete_date()`)
- Rate limit: `MARKET_DATA_CHART` 20/s. 호출 간격 0.08초로 여유

## 확정된 결정

| 항목 | 결정 | 이유 |
|---|---|---|
| 테마 | 12개 | 순환이 보이려면 이 정도 폭은 필요 |
| 백필 | 2년 | 순환 사이클 6~10회 + 계절성 확인 |
| 집계 | 단순평균 | 시총가중은 대장주에 테마 신호가 묻힘 |
| 기준 | `rel` 우선, `chg` 토글 | 시장 전체 등락에 가려지는 문제 |
| 색 | **상승 빨강 / 하락 파랑** | 한국 관행. 발산 스케일(빨강↔회색↔파랑) |
| 랭킹 API | 안 씀 | 종목 단위라 테마 집계에 무용 |
| 앱인토스 SDK | WebView | 캘린더+히트맵뿐이라 네이티브 성능 불필요 |

발산 팔레트는 색맹 검증 통과 (두 극 ΔE 21.6, protan). 값의 정본은
`src/styles/chart-colors.css`.

## 테마 바스켓 선정 기준

시총순이 **아니다**. `stock-theme-calendar-app/themes.yaml` 주석에도 있지만:

1. **순도** — 그 테마 뉴스에 반응하는 종목. 한미반도체 > 삼성전자
2. **유동성** — 거래 얇으면 등락률이 튄다
3. **8개 이상** — 개별 이슈 희석
4. **초대형주는 1~2개까지** — 테마 신호가 시장 신호에 묻힌다

바스켓은 데이터로 검증할 수 있다. 종목별로 "소속 테마 평균과의 상관계수"를 뽑아
상관 낮은 종목은 빼거나 다른 테마로 옮기면 된다. (`verify.py` — 아직 없음)

## 남은 작업

**끝난 것**

- **UI** — 데스크톱 전용 프로토타입(`docs/index.html`, 삭제됨)을 `src/`
  미니앱 화면으로 이전. 호버 툴팁은 칸 탭 → 하단 시트(그날 12개 테마 전체
  순위 + 상위 종목)로, 7열 캘린더는 히트맵(가로 스크롤, 세로축 테마 고정)을
  기본 뷰로 바꿔 해소. 지수 3종은 칸에서 빼서 월 상단 요약으로 이동
- **GitHub Actions** — `.github/workflows/daily-batch.yml`, 평일 KST 16시
  이후(`Build.py --daily`) 자동 실행 + `data/` 변경분 자동 커밋

**SDK: WebView로 결정**

앱인토스는 두 SDK를 준다. 전면형·보상형 광고는 둘 다 공통 API로 지원하고
배너만 갈린다.

- **WebView (채택)** — 캘린더 + 색칠된 격자가 전부라 네이티브 성능이 필요한
  구석이 없다
- Granite RN은 스크롤·제스처가 더 부드럽지만 **Expo 코드 재사용이 안 돼서**
  (파일 기반 라우팅이 다르고 Tailwind 미지원) 이 프로젝트 규모엔 비용 대비
  이득이 낮다고 판단해 보류

**나중**

- `verify.py` — 바스켓 상관계수 검증
- 앱인토스 등록 → 심사

## 정책 (참고만, 개발 막지 말 것)

앱인토스 오픈 정책에 "특정 종목 추천이나 투자 전략 안내" 서비스는 등록 불가
조항이 있다. **지수·테마 등락률을 사실대로 표시하는 것**과 "다음 순환 테마 예측"
같은 기능은 다르다. 후자는 넣지 않는다. 안 되면 개인용 로컬로 쓴다.
