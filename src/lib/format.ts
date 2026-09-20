export type Tone = 'up' | 'down' | 'flat';

export function formatPct(v: number | null | undefined): string {
  if (v == null) return '–';
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}%`;
}

/** 캘린더 칸처럼 폭이 아주 좁은 자리용 — %를 뺀다(색으로 방향은 이미 보임). */
export function formatPctCompact(v: number | null | undefined): string {
  if (v == null) return '–';
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}`;
}

export function toneOf(v: number | null | undefined): Tone {
  if (v == null || v === 0) return 'flat';
  return v > 0 ? 'up' : 'down';
}

const BAND_SCALE = 5;

/** 발산 스케일 상한(%) — 넘으면 최강 단계로 고정. 값은 초기 프로토타입과 동일(CLAUDE.md 참고).
    0=중립, 1=약세/강세, 2=강한 약세/강한 강세 — 총 5색(중립 1 + 방향당 2단계). */
function bandStep(v: number | null | undefined): number {
  if (v == null) return 0;
  const a = Math.min(Math.abs(v), BAND_SCALE) / BAND_SCALE;
  return a < 0.12 ? 0 : a < 0.5 ? 1 : 2;
}

export function bandVar(v: number | null | undefined): string {
  const step = bandStep(v);
  if (step === 0 || v == null) return 'var(--band-zero)';
  const side = v > 0 ? 'pos' : 'neg';
  const tier = step === 1 ? 'weak' : 'strong';
  return `var(--band-${side}-${tier})`;
}

/** 칩 배경(bandVar) 위에 얹는 글자색 — 중립·weak 단계는 어두운 글자, strong
    단계는 흰 글자라야 대비가 유지된다. */
export function bandInk(v: number | null | undefined): string {
  return bandStep(v) >= 2 ? 'var(--color-text-inverse)' : 'var(--band-chip-ink)';
}

export function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-');
  return `${y}년 ${Number(m)}월`;
}

/** "2026-08" → "8월" */
export function formatMonthNumber(month: string): string {
  return `${Number(month.split('-')[1])}월`;
}

export function formatDayLabel(d: string): string {
  const date = new Date(`${d}T00:00:00+09:00`);
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
  const [, m, day] = d.split('-');
  return `${Number(m)}월 ${Number(day)}일 (${weekday})`;
}
