import type { DayData, Theme } from './types';

export interface LeadShareRow {
  theme: Theme;
  /** 코스피 상승일 중 이 테마가 1위였던 날 수 */
  count: number;
  /** count / 상승일 수 */
  share: number;
}

export interface LeadShareResult {
  rows: LeadShareRow[];
  upDays: number;
  totalDays: number;
}

/**
 * 코스피가 오른 날만 추려서 테마별 1위 횟수를 센다.
 *
 * 장기 구간에서 '누적 등락률'로 순위를 매기면 변동성이 큰 테마가 구조적으로
 * 불리해진다(복리 손실 — 6개월이면 테마에 따라 15%p 넘게 벌어졌다). 1위 횟수는
 * 그 왜곡이 없고, "시장이 오른 날 누가 앞장섰나"라 주도주 개념 그대로다.
 *
 * 하락일을 빼는 이유: 빠지는 날의 1위는 '덜 빠진 테마'라 의미가 다르고,
 * 실제로 하락일에는 1위가 거의 무작위로 튄다(6개월 표본 기준).
 */
export function computeLeadShare(days: DayData[], themes: Theme[]): LeadShareResult {
  const up = days.filter((d) => (d.idx.kospi ?? 0) > 0);
  const counts = new Map<string, number>();
  for (const d of up) {
    if (d.lead) counts.set(d.lead, (counts.get(d.lead) ?? 0) + 1);
  }

  const rows = themes
    .map((theme) => {
      const count = counts.get(theme.id) ?? 0;
      return { theme, count, share: up.length ? count / up.length : 0 };
    })
    .sort((a, b) => b.count - a.count || a.theme.name.localeCompare(b.theme.name));

  return { rows, upDays: up.length, totalDays: days.length };
}
