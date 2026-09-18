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
  return (
    <div className="heatmap-scroll">
      <div className="heatmap-labels">
        {themes.map((t) => (
          <div key={t.id} className="heatmap-row-label">
            {t.name}
          </div>
        ))}
        <div className="heatmap-row-label heatmap-date-spacer" aria-hidden="true" />
      </div>

      {days.map((day, i) => {
        const showDate = i % 5 === 0 || i === days.length - 1;
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
            <span className="heatmap-date">{showDate ? Number(day.d.slice(8)) : ''}</span>
          </button>
        );
      })}
    </div>
  );
}
