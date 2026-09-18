export type Tone = 'up' | 'down' | 'flat';

export function formatPct(v: number | null | undefined): string {
  if (v == null) return '–';
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}%`;
}

export function toneOf(v: number | null | undefined): Tone {
  if (v == null || v === 0) return 'flat';
  return v > 0 ? 'up' : 'down';
}

const BAND_SCALE = 5;

/** 발산 스케일 상한(%) — 넘으면 최강 단계로 고정. 값은 docs/index.html 프로토타입과 동일. */
export function bandVar(v: number | null | undefined): string {
  if (v == null) return 'var(--band-zero)';
  const a = Math.min(Math.abs(v), BAND_SCALE) / BAND_SCALE;
  const step = a < 0.12 ? 0 : a < 0.35 ? 1 : a < 0.6 ? 2 : a < 0.82 ? 3 : 4;
  if (step === 0) return 'var(--band-zero)';
  return `var(--band-${v > 0 ? 'pos' : 'neg'}-${step})`;
}

export function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-');
  return `${y}년 ${Number(m)}월`;
}

export function formatDayLabel(d: string): string {
  const date = new Date(`${d}T00:00:00+09:00`);
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
  const [, m, day] = d.split('-');
  return `${Number(m)}월 ${Number(day)}일 (${weekday})`;
}
