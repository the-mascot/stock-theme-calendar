import { useEffect, useRef } from 'react';
import './ThemeHeatmap.css';
import type { DayData, Theme, ValueMode } from '../lib/types';
import { bandVar, formatDayLabel } from '../lib/format';

interface ThemeHeatmapProps {
  themes: Theme[];
  days: DayData[];
  mode: ValueMode;
  onSelectDay: (day: DayData) => void;
}

export function ThemeHeatmap({ themes, days, mode, onSelectDay }: ThemeHeatmapProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 제일 최근 영업일이 기본으로 보이게, 달마다 오른쪽 끝으로 스크롤해 둔다.
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [days]);

  return (
    <div className="heatmap-scroll" ref={scrollRef}>
      <div className="heatmap-labels">
        {themes.map((t) => (
          <div key={t.id} className="heatmap-row-label">
            {t.name}
          </div>
        ))}
        <div className="heatmap-row-label heatmap-date-spacer" aria-hidden="true" />
      </div>

      {days.map((day, i) => {
        // 1일 · 5일 단위(5/10/15/20/25/30) · 마지막(가장 최근) 날에 날짜를
        // 적는다 — 영업일 순서가 아니라 실제 날짜 기준이라 주말이 껴도
        // 눈금이 어긋나지 않는다.
        const dom = Number(day.d.slice(8));
        const showDate = dom === 1 || dom % 5 === 0 || i === days.length - 1;
        const lead = day.lead ? themes.find((t) => t.id === day.lead) : null;
        return (
          <button
            key={day.d}
            type="button"
            className="heatmap-col"
            onClick={() => onSelectDay(day)}
            aria-label={`${formatDayLabel(day.d)}${lead ? ` · 1위 ${lead.name}` : ''}`}
          >
            {themes.map((t) => {
              const stat = day.th[t.id];
              const v = stat ? stat[mode] : null;
              return (
                <span
                  key={t.id}
                  className={`heatmap-cell${stat ? '' : ' heatmap-cell-na'}`}
                  style={stat ? { background: bandVar(v) } : undefined}
                />
              );
            })}
            <span className="heatmap-date">{showDate ? `${dom}일` : ''}</span>
          </button>
        );
      })}
    </div>
  );
}
