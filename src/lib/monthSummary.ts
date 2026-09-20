import type { DayData, Theme, ValueMode } from './types';

export interface MonthSummary {
  /** 월간 등락률(%) — 일간 등락률을 복리로 이은 값. 첫 영업일 등락률이 전월 말 종가 대비라 전월 말 대비 월간 수익률과 같다. */
  kospi: number | null;
  kosdaq: number | null;
  lead: { theme: Theme; avg: number } | null;
}

function compound(values: (number | null | undefined)[]): number | null {
  const vals = values.filter((v): v is number => v != null);
  if (vals.length === 0) return null;
  return (vals.reduce((acc, v) => acc * (1 + v / 100), 1) - 1) * 100;
}

/** 지난 달 요약 — 지수는 월간 등락률, 1위 테마는 일간 값의 월평균이 가장 높은 테마(저조 테마 표와 같은 기준). */
export function summarizeMonth(days: DayData[], themes: Theme[], mode: ValueMode): MonthSummary {
  let lead: MonthSummary['lead'] = null;
  for (const theme of themes) {
    const vals = days.map((d) => d.th[theme.id]?.[mode]).filter((v): v is number => v != null);
    if (vals.length === 0) continue;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (!lead || avg > lead.avg) lead = { theme, avg };
  }
  return {
    kospi: compound(days.map((d) => d.idx.kospi)),
    kosdaq: compound(days.map((d) => d.idx.kosdaq)),
    lead,
  };
}
