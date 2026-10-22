import { getSafeAreaInsets } from '@apps-in-toss/web-framework';
import { useMemo, useState } from 'react';
import { ChevronDown, Close } from './icons';
import './Sheet.css';
import './DayDetailSheet.css';
import type { DayData, Theme, ValueMode } from '../lib/types';
import { bandInk, bandVar, formatDayLabel, formatPct, toneOf } from '../lib/format';
import { useBackClose } from '../lib/useBackClose';
import { useBodyScrollLock } from '../lib/useBodyScrollLock';

interface DayDetailSheetProps {
  day: DayData;
  /** 그달 전체 — 테마별 바스켓 크기(달 중 최대 n)를 뽑는 데만 쓴다 */
  days: DayData[];
  themes: Theme[];
  stocks: Record<string, string>;
  mode: ValueMode;
  onClose: () => void;
}

const IDX_LABELS: { key: keyof DayData['idx']; label: string }[] = [
  { key: 'kospi', label: '코스피' },
  { key: 'kosdaq', label: '코스닥' },
];

export function DayDetailSheet({ day, days, themes, stocks, mode, onClose }: DayDetailSheetProps) {
  const insets = getSafeAreaInsets();
  useBodyScrollLock();
  useBackClose(onClose);
  const ranked = useMemo(() => {
    return themes
      .map((t) => ({ theme: t, stat: day.th[t.id] }))
      .filter((r) => r.stat != null)
      .sort((a, b) => (b.stat?.[mode] ?? 0) - (a.stat?.[mode] ?? 0));
  }, [themes, day, mode]);
  // 바스켓 크기 — 월 파일엔 정의가 없어서 그달 가장 많이 잡힌 n으로 갈음한다.
  // 원래 작은 바스켓(반도체 종합 2종목)이 늘 "신뢰도 낮음"으로 뜨지 않게, 빠진 종목이 있을 때만 경고한다.
  const basketSize = useMemo(() => {
    const size: Record<string, number> = {};
    for (const d of days) for (const [id, s] of Object.entries(d.th)) size[id] = Math.max(size[id] ?? 0, s.n);
    return size;
  }, [days]);
  // 한 번에 한 테마만 펼친다(전체 종목이라 여러 개 펴면 시트가 끝없이 길어진다). 처음엔 1위.
  const [openId, setOpenId] = useState<string | null>(() => ranked[0]?.theme.id ?? null);

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
            const isOpen = openId === theme.id;
            const panelId = `sheet-stocks-${theme.id}`;
            return (
              <div key={theme.id} className="sheet-row">
                <button
                  type="button"
                  className="sheet-row-head"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenId(isOpen ? null : theme.id)}
                >
                  <span className="sheet-rank">{i + 1}</span>
                  <span className="sheet-row-main">
                    <span className="sheet-row-name">{theme.name}</span>
                    {/* 평소엔 종목 수를 감춘다 — 유효 종목이 모자라 값이 흔들릴 때만 경고로 띄운다. */}
                    {stat.n < 5 && stat.n < (basketSize[theme.id] ?? 0) && <span className="sheet-row-sub">신뢰도 낮음 · 유효 종목 {stat.n}개</span>}
                  </span>
                  <span className="sheet-row-chip" style={{ background: bandVar(v), color: bandInk(v) }}>
                    {formatPct(v)}
                  </span>
                  <span className={`sheet-row-chevron${isOpen ? ' is-open' : ''}`}>
                    <ChevronDown size={18} />
                  </span>
                </button>
                {isOpen && stat.top.length > 0 && (
                  <ul id={panelId} className="sheet-stocks">
                    {stat.top.map(([code, pct]) => (
                      <li key={code} className="sheet-stock">
                        <span className="sheet-stock-name">{stocks[code] ?? code}</span>
                        <span className={`sheet-stock-pct tone-${toneOf(pct)}`}>{formatPct(pct)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
