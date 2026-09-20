/** 기준 종목표(data/themes.json)를 화면에 올릴 때 쓰는 공용 도구 —
    푸터 전체 목록 시트와 저조 테마의 단일 테마 시트가 같이 쓴다. */

/** 판정 3단계 — verify.py 의 ✅/⚠️/❌ 와 같은 경계다. 경계값은 JSON의
    thresholds 에서 받으므로 파이썬 쪽만 고쳐도 UI가 따라온다. */
export type Grade = 'good' | 'watch' | 'weak' | 'none';

export function gradeOf(r: number | null, good: number, watch: number): Grade {
  if (r == null) return 'none';
  if (r >= good) return 'good';
  if (r >= watch) return 'watch';
  return 'weak';
}

export function formatR(r: number | null): string {
  return r == null ? '–' : r.toFixed(2);
}

/** "1y" → "최근 1년" */
export function formatPeriod(period: string): string {
  const m = /^(\d+)([ym])$/.exec(period.trim());
  if (!m) return period;
  return `최근 ${m[1]}${m[2] === 'y' ? '년' : '개월'}`;
}
