import './ThemeCalendar.css';
import type { DayData, Theme, ValueMode } from '../lib/types';
import { bandVar, formatPct } from '../lib/format';

interface ThemeCalendarProps {
  month: string;
  themes: Theme[];
  days: DayData[];
  mode: ValueMode;
  onSelectDay: (day: DayData) => void;
}

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

export function ThemeCalendar({ month, themes, days, mode, onSelectDay }: ThemeCalendarProps) {
  const [y, mo] = month.split('-').map(Number);
  const byDate = new Map(days.map((d) => [d.d, d]));
  const first = new Date(y, mo - 1, 1);
  const last = new Date(y, mo, 0);
  const leadingBlanks = first.getDay();

  const cells: (DayData | null)[] = Array.from({ length: leadingBlanks }, () => null);
  for (let d = 1; d <= last.getDate(); d++) {
    const key = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push(byDate.get(key) ?? null);
  }

  return (
    <div className="cal">
      <div className="cal-dow">
        {DOW.map((label) => (
          <div key={label} className="cal-dow-cell">
            {label}
          </div>
        ))}
      </div>
      <div className="cal-grid">
        {cells.map((day, i) => {
          if (!day) {
            const dayNum = i < leadingBlanks ? null : i - leadingBlanks + 1;
            return (
              <div key={i} className="cal-cell cal-cell-nodata">
                {dayNum && <span className="cal-daynum">{dayNum}</span>}
              </div>
            );
          }
          const dayNum = Number(day.d.slice(8));
          const lead = day.lead ? themes.find((t) => t.id === day.lead) : null;
          const stat = lead ? day.th[lead.id] : null;
          const v = stat ? stat[mode] : null;
          return (
            <button
              key={day.d}
              type="button"
              className="cal-cell"
              onClick={() => onSelectDay(day)}
              aria-label={`${dayNum}일${lead ? ` · 1위 ${lead.name} ${formatPct(v)}` : ''}`}
            >
              <span className="cal-daynum">{dayNum}</span>
              {lead && (
                <span className="cal-chip" style={{ background: bandVar(v) }}>
                  {lead.name}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
