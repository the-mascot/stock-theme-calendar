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
