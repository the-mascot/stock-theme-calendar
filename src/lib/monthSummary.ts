import type { DayData, Theme, ValueMode } from './types';

export interface MonthSummary {
  /** 월간 등락률(%) — 일간 등락률을 복리로 이은 값. 첫 영업일 등락률이 전월 말 종가 대비라 전월 말 대비 월간 수익률과 같다. */
  kospi: number | null;
  kosdaq: number | null;
  /** 1위 테마와 그 테마의 월간 값 — 지수와 같은 '한 달 누적' 단위다. */
  lead: { theme: Theme; value: number } | null;
}

function compound(values: (number | null | undefined)[]): number | null {
  const vals = values.filter((v): v is number => v != null);
  if (vals.length === 0) return null;
  return (vals.reduce((acc, v) => acc * (1 + v / 100), 1) - 1) * 100;
}

/**
 * 지난 달 요약 — 지수도 테마도 '한 달 누적' 등락률로 맞춘다.
 *
 * 예전에는 테마만 일간 값의 산술평균(하루 평균)이라, 옆에 붙은 월간 누적
 * 지수와 단위가 달라 비교가 안 됐다(코스피 +8% 옆에 테마 +0.5% 라고 뜨면
 * 뒤처진 것처럼 보이지만, 하루 0.5%면 한 달로는 +10%에 가깝다).
 *
 * 테마 일간 chg 는 바스켓 종목 등락률의 단순평균이라, 그걸 복리로 이으면
 * '매일 동일비중으로 재조정하는 바스켓'의 한 달 수익률이 된다.
 * rel 모드에서는 차이값을 복리로 잇는 게 의미가 없으므로, 테마 누적에서
 * 같은 기간 코스피 누적을 빼 '시장 대비 초과분'으로 낸다.
 */
export function summarizeMonth(days: DayData[], themes: Theme[], mode: ValueMode): MonthSummary {
  const kospi = compound(days.map((d) => d.idx.kospi));
  const kosdaq = compound(days.map((d) => d.idx.kosdaq));

  let lead: MonthSummary['lead'] = null;
  for (const theme of themes) {
    const cum = compound(days.map((d) => d.th[theme.id]?.chg));
    if (cum == null) continue;
    const value = mode === 'rel' ? cum - (kospi ?? 0) : cum;
    if (!lead || value > lead.value) lead = { theme, value };
  }

  return { kospi, kosdaq, lead };
}
