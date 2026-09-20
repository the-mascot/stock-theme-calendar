import { getSafeAreaInsets } from '@apps-in-toss/web-framework';
import { useMemo } from 'react';
import { Close } from './icons';
import './Sheet.css';
import './ThemeStocksSheet.css';
import { formatDayLabel, formatPct, toneOf } from '../lib/format';
import type { DayData, Theme } from '../lib/types';
import { useBackClose } from '../lib/useBackClose';
import { useBodyScrollLock } from '../lib/useBodyScrollLock';

interface ThemeStocksSheetProps {
  theme: Theme;
  days: DayData[];
  stocks: Record<string, string>;
  onClose: () => void;
}

/** 테마의 상위 5종목 — 저조 테마 목록에서 연다. 월 데이터에는 날마다
    상위 5개(th[테마].top)만 들어 있어서, 이 달에서 그 테마 데이터가 있는
    가장 최근 영업일을 기준으로 보여 준다. */
export function ThemeStocksSheet({ theme, days, stocks, onClose }: ThemeStocksSheetProps) {
  const insets = getSafeAreaInsets();
  useBodyScrollLock();
  useBackClose(onClose);
  const latest = useMemo(
    () => [...days].reverse().find((d) => (d.th[theme.id]?.top.length ?? 0) > 0) ?? null,
    [days, theme.id],
  );
  const top = latest?.th[theme.id]?.top.slice(0, 5) ?? [];

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`${theme.name} 상위 종목`}
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-header">
          <span className="sheet-title">{theme.name} 상위 종목</span>
          <button type="button" className="sheet-close" aria-label="닫기" onClick={onClose}>
            <Close size={20} />
          </button>
        </div>

        <div className="stocks-body">
          {top.length === 0 || !latest ? (
            <p className="sheet-empty">이 달엔 이 테마의 종목 데이터가 없어요.</p>
          ) : (
            <>
              <p className="stocks-caveat">{formatDayLabel(latest.d)} 기준으로 가장 많이 오른 5종목이에요.</p>
              <table className="stocks-table">
                <thead>
                  <tr>
                    <th scope="col">종목</th>
                    <th scope="col" className="stocks-col-pct">
                      등락률
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {top.map(([code, pct]) => (
                    <tr key={code}>
                      <td>{stocks[code] ?? code}</td>
                      <td className={`stocks-col-pct tone-${toneOf(pct)}`}>{formatPct(pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="stocks-meta">테마 전체 기준 종목은 맨 아래 ‘테마 기준 종목 보기’에서 볼 수 있어요.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
