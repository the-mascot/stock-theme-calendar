import type { DayData, Theme } from './types';

/** 이번 달 날마다 상위 등락(day.th[theme].top)에 뜬 종목코드를 모아 등장
    횟수순으로 정렬한다 — themes.yaml의 전체 바스켓 정의는 프론트엔드로
    내려오지 않아서, 실제로 관찰된 종목만 보여주는 근사치다. */
export function collectThemeStocks(theme: Theme, days: DayData[]): string[] {
  const seen = new Map<string, number>();
  for (const day of days) {
    const stat = day.th[theme.id];
    if (!stat) continue;
    for (const [code] of stat.top) {
      seen.set(code, (seen.get(code) ?? 0) + 1);
    }
  }
  return [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([code]) => code);
}
