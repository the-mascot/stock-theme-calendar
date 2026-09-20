import { useEffect, useMemo, useState } from 'react';
import './LeadShare.css';
import { fetchMonths } from '../lib/data';
import { formatMonthLabel } from '../lib/format';
import { computeLeadShare } from '../lib/leadShare';
import type { DayData, Theme } from '../lib/types';

/** 집계 구간 — 순환 사이클을 몇 번 담으면서도 받는 양이 부담 없는 길이(6개월 = gzip 약 54KB). */
const WINDOW_MONTHS = 6;

interface LeadShareProps {
  /** index.json의 전체 월 목록. 뒤에서 WINDOW_MONTHS개를 쓴다. */
  months: string[];
  themes: Theme[];
}

/** 이 컴포넌트는 리워드 게이트(RewardGate) 안에서만 마운트된다 — 마운트 시점에
    6개월치를 받으므로 첫 화면 로딩에는 영향이 없다. */
export function LeadShare({ months, themes }: LeadShareProps) {
  const range = useMemo(() => months.slice(-WINDOW_MONTHS), [months]);
  const [days, setDays] = useState<DayData[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (range.length === 0) return;
    let cancelled = false;
    fetchMonths(range)
      .then((list) => {
        if (cancelled) return;
        setDays(list.flatMap((m) => m.days).sort((a, b) => a.d.localeCompare(b.d)));
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [range]);

  const result = useMemo(() => (days ? computeLeadShare(days, themes) : null), [days, themes]);
  if (range.length === 0) return null;

  const top = result?.rows[0]?.count ?? 0;
  const label = `${formatMonthLabel(range[0])} ~ ${formatMonthLabel(range[range.length - 1])}`;

  return (
    <section className="app-section">
      <h2 className="app-section-title">중장기 강세 테마</h2>
      <p className="app-section-desc">
        최근 {WINDOW_MONTHS}개월 동안 코스피가 오른 날 중에서, 어떤 테마가 1위를 몇 번 했는지 알려줘요.
      </p>

      {error ? (
        <p className="lead-share-state">{error}</p>
      ) : !result ? (
        <p className="lead-share-state">불러오는 중…</p>
      ) : (
        <>
          <p className="lead-share-range">
            {label} · 코스피 상승 {result.upDays}일 / 전체 {result.totalDays}영업일
          </p>
          <ol className="lead-share-list">
            {result.rows.map(({ theme, count, share }) => (
              <li key={theme.id} className="lead-share-row">
                <span className="lead-share-name">{theme.name}</span>
                <span className="lead-share-track">
                  <span
                    className="lead-share-bar"
                    style={{ width: top ? `${(count / top) * 100}%` : '0%' }}
                  />
                </span>
                <span className="lead-share-value">
                  {count}회<span className="lead-share-pct">{Math.round(share * 100)}%</span>
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
