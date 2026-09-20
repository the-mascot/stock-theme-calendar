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
├── verify.py         # 바스켓 상관계수 검증 → verify_report.md + data/themes.json
├── themes.yaml       # 테마 바스켓 정의 (손으로 관리)
├── themes-reference.md  # 바스켓 정의서 — 종목별 선정 사유·제외 사유
├── .env              # TOSS_CLIENT_ID / TOSS_CLIENT_SECRET  (커밋 금지, gitignore됨)
├── data/              # GitHub Pages 루트 (repo root를 그대로 서빙)
│   ├── index.json
│   ├── themes.json    # 기준 종목 + 응집도 (앱 푸터 시트가 fetch)
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
python verify.py                   # 바스켓 검증 (themes.yaml 바꿀 때마다)
python verify.py --offline         # 직전 캐시 재사용, API 호출 없음
npm run dev                        # 미니앱 로컬 실행 (src/)
```

**`themes.yaml`을 고치면 세 개를 같이 돌려야 한다** — `Build.py --backfill`
(과거 집계 다시), `verify.py`(응집도 + `data/themes.json`), 그리고 커밋.
`verify.py`를 빼먹으면 앱 푸터의 기준 종목표만 옛 바스켓으로 남아 조용히
어긋난다. 콘솔이 cp949라 한글 로그에서 터지면 `PYTHONIOENCODING=utf-8`을 앞에
붙인다.

`npm run dev`는 데이터를 GitHub Pages에서 받는다. 아직 push 안 한 `data/`로
로컬 확인하려면 CORS 헤더 붙인 정적 서버를 띄우고
`VITE_DATA_BASE_URL=http://127.0.0.1:8787/data npm run dev` 로 실행한다.

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

`data/themes.json` — `verify.py`가 낸다. `themes.yaml`의 **전체 바스켓이
프론트로 내려가는 유일한 경로**다(`YYYY-MM.json`의 `stocks`는 그날 상위 5개만
담는다):

```json
{
  "generatedAt": "2026-09-20T22:55:21+09:00",
  "period": "1y",
  "thresholds": { "good": 0.6, "watch": 0.3 },
  "themes": [{
    "id": "semi", "name": "반도체", "cohesion": 0.72,
    "stocks": [{ "code": "039030", "name": "이오테크닉스", "r": 0.78, "n": 265 }]
  }]
}
```

- `r` — 그 종목 등락률 vs **자기를 뺀** 같은 테마 평균의 상관계수 (leave-one-out)
- `cohesion` — 바스켓 멤버 `r`의 평균. 테마가 한 몸처럼 움직인 정도
- `thresholds` — 판정 경계. 앱이 이 값을 읽어 색·범례를 그리므로 기준을
  바꿀 땐 `verify.py`의 `GOOD`/`WATCH`만 고치면 UI가 따라온다
- 거래일이 `MIN_DAYS`(60) 미만이면 `r`은 `null`

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

시총순이 **아니다**. `themes.yaml` 주석에도 있지만:

1. **순도** — 그 테마 뉴스에 반응하는 종목. 한미반도체 > 삼성전자
2. **유동성** — 거래 얇으면 등락률이 튄다
3. **8개 권장, 최소 6개** — 순도 낮은 종목으로 억지로 채우지 않는다
4. **초대형주는 1~2개까지** — 테마 신호가 시장 신호에 묻힌다
5. **중복 금지** — 지주-자회사처럼 똑같이 움직이는 건 하나만

종목별 선정·제외 사유는 `themes-reference.md`에 적는다. 2026-09-20 개편으로
92 → **97종목**(코드 오류 1건 수정, 2차전지 → 2차전지·ESS 등).

검증은 `verify.py`가 한다 — 종목 등락률 vs **자기를 뺀** 같은 테마 평균의
상관계수 `r`, 그 평균이 테마 **응집도**. 산출물은 사람이 읽는
`verify_report.md`(재검토 대상 요약 포함)와 앱이 읽는 `data/themes.json`.
다른 테마 평균과의 `r`이 더 높으면 "더 맞는 테마"로 표시되니, 그런 종목은
옮기거나 뺀다. 현재 응집도 0.65~0.82, 재검토 대상 15종목(전부 ⚠️, ❌ 없음).

## 남은 작업

**끝난 것**

- **UI** — 데스크톱 전용 프로토타입(`docs/index.html`, 삭제됨)을 `src/`
  미니앱 화면으로 이전. 호버 툴팁은 칸 탭 → 하단 시트(그날 12개 테마 전체
  순위 + 상위 종목)로, 7열 캘린더는 히트맵(가로 스크롤, 세로축 테마 고정)을
  기본 뷰로 바꿔 해소. 지수 3종은 칸에서 빼서 월 상단 요약으로 이동
- **GitHub Actions** — `.github/workflows/daily-batch.yml`, 평일 KST 16시
  이후(`Build.py --daily`) 자동 실행 + `data/` 변경분 자동 커밋
- **`verify.py`** — 바스켓 상관계수 검증. `verify_report.md` + `data/themes.json`
- **중장기 강세 테마** — 최근 6개월 코스피 **상승일**만 추려 테마별 1위 횟수·
  점유율을 막대로 (`LeadShare`). 리워드 게이트 뒤에서 열리고 그때 6개월치
  JSON을 받는다(gzip 약 54KB). 누적 등락률을 안 쓰는 건 장기 구간에서 변동성
  큰 테마가 복리 손실로 불리해지기 때문 — `CALCULATIONS.md` 2-5 참고
- **리워드 게이트는 화면에 하나뿐** (`RewardGate`) — 저조 테마 + 중장기 강세
  테마를 한 번에 연다. **토스 애즈 SSP 정책이 "동일 화면에 동일 포맷 광고
  2개 이상 배치"를 금지**하는데 이 앱은 스크롤 하나짜리 단일 화면이라,
  섹션마다 리워드 버튼을 달면 그대로 위반이다(중대하면 단일 위반으로도 30일
  제한). 배너는 포맷이 달라 함께 둬도 된다. 섹션이 더 늘어도 게이트는
  `RewardGate` 하나 안에 넣을 것
- **시트는 뒤로가기·배경 스크롤을 직접 막는다** — 바텀시트를 조건부 렌더만
  해 두면 안드로이드 시스템 뒤로가기가 WebView로 그대로 가서 **미니앱이 통째로
  종료된다**(실기기에서 확인). `useBackClose`가 `graniteEvent`의 `backEvent`를
  시트가 떠 있는 동안만 구독해 시트만 닫고, 닫히면 해제해서 한 번 더 누르면
  정상 종료되게 한다 — 계속 막아 두면 정책 위반이다. 배경 스크롤 잠금은
  `useBodyScrollLock`. **새 시트를 만들면 두 훅을 같이 부를 것**
- **기준 종목 시트** — 본문 맨 아래 "테마 기준 종목 보기"(전체 12개,
  `ThemeBasketSheet`)와 저조 테마 탭(단일 테마, `ThemeStocksSheet`)이
  `ThemeBasketTable`로 같은 표를 그린다. 둘 다 `useThemeBaskets`로 같은
  `themes.json`을 보므로 종목이 어긋나지 않는다. 시트를 열 때 한 번만 받아
  캐시한다(`fetchThemeBaskets`)

**SDK: WebView로 결정**

앱인토스는 두 SDK를 준다. 전면형·보상형 광고는 둘 다 공통 API로 지원하고
배너만 갈린다.

- **WebView (채택)** — 캘린더 + 색칠된 격자가 전부라 네이티브 성능이 필요한
  구석이 없다
- Granite RN은 스크롤·제스처가 더 부드럽지만 **Expo 코드 재사용이 안 돼서**
  (파일 기반 라우팅이 다르고 Tailwind 미지원) 이 프로젝트 규모엔 비용 대비
  이득이 낮다고 판단해 보류

**나중**

- 재검토 대상 15종목 정리 — `verify_report.md` 맨 아래 표. 옮길지 뺄지는
  숫자만 보고 자동으로 정하지 말 것(순도·유동성이 우선)
- 앱인토스 등록 → 심사

## 정책 (참고만, 개발 막지 말 것)

앱인토스 오픈 정책에 "특정 종목 추천이나 투자 전략 안내" 서비스는 등록 불가
조항이 있다. **지수·테마 등락률을 사실대로 표시하는 것**과 "다음 순환 테마 예측"
같은 기능은 다르다. 후자는 넣지 않는다. 안 되면 개인용 로컬로 쓴다.
