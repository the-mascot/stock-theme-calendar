import { getSafeAreaInsets } from '@apps-in-toss/web-framework';
import { useMemo } from 'react';
import { Close } from './icons';
import './Sheet.css';
import './ThemeStocksSheet.css';
import type { DayData, Theme } from '../lib/types';
import { collectThemeStocks } from '../lib/themeStocks';

interface ThemeStocksSheetProps {
  theme: Theme;
  days: DayData[];
  stocks: Record<string, string>;
  onClose: () => void;
}

export function ThemeStocksSheet({ theme, days, stocks, onClose }: ThemeStocksSheetProps) {
  const insets = getSafeAreaInsets();
  const codes = useMemo(() => collectThemeStocks(theme, days), [theme, days]);

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`${theme.name} 기준 종목`}
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-header">
          <span className="sheet-title">{theme.name} 기준 종목</span>
          <button type="button" className="sheet-close" aria-label="닫기" onClick={onClose}>
            <Close size={20} />
          </button>
        </div>

        <p className="stocks-caveat">이번 달 상위 등락 종목으로 모은 목록이에요. 전체 바스켓과 다를 수 있어요.</p>

        <div className="stocks-list">
          {codes.length === 0 && <p className="sheet-empty">이번 달엔 상위 등락으로 뜬 종목이 없어요.</p>}
          {codes.map((code) => (
            <span key={code} className="stocks-chip">
              {stocks[code] ?? code}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
