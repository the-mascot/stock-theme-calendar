import { getSafeAreaInsets } from '@apps-in-toss/web-framework';
import { useMemo } from 'react';
import { Close } from './icons';
import './Sheet.css';
import './DayDetailSheet.css';
import type { DayData, Theme, ValueMode } from '../lib/types';
import { bandInk, bandVar, formatDayLabel, formatPct, toneOf } from '../lib/format';
import { useBodyScrollLock } from '../lib/useBodyScrollLock';

interface DayDetailSheetProps {
  day: DayData;
  themes: Theme[];
  stocks: Record<string, string>;
  mode: ValueMode;
  onClose: () => void;
}

const IDX_LABELS: { key: keyof DayData['idx']; label: string }[] = [
  { key: 'kospi', label: '코스피' },
  { key: 'kosdaq', label: '코스닥' },
];

export function DayDetailSheet({ day, themes, stocks, mode, onClose }: DayDetailSheetProps) {
  const insets = getSafeAreaInsets();
  useBodyScrollLock();
  const ranked = useMemo(() => {
    return themes
      .map((t) => ({ theme: t, stat: day.th[t.id] }))
      .filter((r) => r.stat != null)
      .sort((a, b) => (b.stat?.[mode] ?? 0) - (a.stat?.[mode] ?? 0));
  }, [themes, day, mode]);

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`${formatDayLabel(day.d)} 테마 순위`}
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-header">
          <span className="sheet-title">{formatDayLabel(day.d)}</span>
          <button type="button" className="sheet-close" aria-label="닫기" onClick={onClose}>
            <Close size={20} />
          </button>
        </div>

        <div className="sheet-idx">
          {IDX_LABELS.map(({ key, label }) => {
            const v = day.idx[key];
            return (
              <div key={key} className="sheet-idx-item">
                <span className="sheet-idx-label">{label}</span>
                <span className={`sheet-idx-value tone-${toneOf(v)}`}>{formatPct(v)}</span>
              </div>
            );
          })}
        </div>

        <div className="sheet-list">
          {ranked.length === 0 && <p className="sheet-empty">이 날은 유효한 테마 데이터가 없어요.</p>}
          {ranked.map(({ theme, stat }, i) => {
            if (!stat) return null;
            const v = stat[mode];
            return (
              <div key={theme.id} className="sheet-row">
                <span className="sheet-rank">{i + 1}</span>
                <div className="sheet-row-main">
                  <div className="sheet-row-top">
                    <span className="sheet-row-name">{theme.name}</span>
                    <span className="sheet-row-chip" style={{ background: bandVar(v), color: bandInk(v) }}>
                      {formatPct(v)}
                    </span>
                  </div>
                  {/* 평소엔 종목 수를 감춘다 — 바로 아래 상위 종목 목록을 설명하는 줄로 읽혀서 헷갈렸다.
                      유효 종목이 모자라 값이 흔들릴 때만 경고로 띄운다. */}
                  {stat.n < 5 && (
                    <div className="sheet-row-sub">
                      <span>신뢰도 낮음 · 유효 종목 {stat.n}개</span>
                    </div>
                  )}
                  {stat.top.length > 0 && (
                    <div className="sheet-row-top-stocks">
                      {stat.top.slice(0, 3).map(([code, pct]) => (
                        <span key={code} className={`sheet-stock tone-${toneOf(pct)}`}>
                          {stocks[code] ?? code} {formatPct(pct)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
