import type { IndexFile, MonthData } from './types';

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
