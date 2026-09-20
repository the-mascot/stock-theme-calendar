import type { IndexFile, MonthData, ThemeBasketFile } from './types';

const DATA_BASE =
  import.meta.env.VITE_DATA_BASE_URL ?? 'https://the-mascot.github.io/stock-theme-calendar/data';

export async function fetchIndex(): Promise<IndexFile> {
  const res = await fetch(`${DATA_BASE}/index.json`);
  if (!res.ok) throw new Error(`index.json을 불러오지 못했어요 (${res.status})`);
  return res.json();
}

export async function fetchMonth(month: string): Promise<MonthData> {
  const res = await fetch(`${DATA_BASE}/${month}.json`);
  if (!res.ok) throw new Error(`${month} 데이터를 불러오지 못했어요 (${res.status})`);
  return res.json();
}

/** 여러 달을 한 번에 — 중장기 패널이 쓴다. 이미 받은 달은 캐시에서 준다.
    첫 화면에는 필요 없고 리워드를 본 뒤에만 부르므로 초기 로딩에 영향이 없다. */
const monthCache = new Map<string, Promise<MonthData>>();

export function fetchMonths(months: string[]): Promise<MonthData[]> {
  return Promise.all(
    months.map((m) => {
      let p = monthCache.get(m);
      if (!p) {
        p = fetchMonth(m);
        monthCache.set(m, p);
        p.catch(() => monthCache.delete(m));
      }
      return p;
    }),
  );
}

/** 기준 종목표 — 첫 화면에 필요 없으니 시트를 열 때 한 번만 받는다. */
let basketCache: Promise<ThemeBasketFile> | null = null;

export function fetchThemeBaskets(): Promise<ThemeBasketFile> {
  basketCache ??= fetch(`${DATA_BASE}/themes.json`).then((res) => {
    if (!res.ok) throw new Error(`기준 종목을 불러오지 못했어요 (${res.status})`);
    return res.json();
  });
  // 실패한 약속을 캐시에 남겨 두면 다시 열어도 계속 실패한다.
  basketCache.catch(() => (basketCache = null));
  return basketCache;
}
