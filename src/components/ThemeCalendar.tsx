import './ThemeCalendar.css';
import type { DayData, Theme, ValueMode } from '../lib/types';
import { bandInk, bandVar, formatPct, formatPctCompact, toneOf } from '../lib/format';

interface ThemeCalendarProps {
  month: string;
  themes: Theme[];
  days: DayData[];
  mode: ValueMode;
  onSelectDay: (day: DayData) => void;
}

interface Cell {
  dayNum: number;
  data: DayData | null;
}

const DOW = ['월', '화', '수', '목', '금'];

function todayKey(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

export function ThemeCalendar({ month, themes, days, mode, onSelectDay }: ThemeCalendarProps) {
  const [y, mo] = month.split('-').map(Number);
  const byDate = new Map(days.map((d) => [d.d, d]));
  const first = new Date(y, mo - 1, 1);
  const last = new Date(y, mo, 0);
  const firstDow = first.getDay();
  // 주말은 개장하지 않으니 칸 자체를 없앤다 — 월요일 기준 5열, 앞에 남는
  // 칸만큼만 빈 칸을 채운다(월=0 ... 금=4, 토·일이면 0).
  const leadingBlanks = firstDow === 0 || firstDow === 6 ? 0 : firstDow - 1;
  const today = todayKey();

  const cells: Cell[] = [];
  for (let d = 1; d <= last.getDate(); d++) {
    const dow = new Date(y, mo - 1, d).getDay();
    if (dow === 0 || dow === 6) continue;
    const key = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (key > today) break; // 오늘 이후는 항상 빈 칸이라 아예 그리지 않는다
    cells.push({ dayNum: d, data: byDate.get(key) ?? null });
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
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <div key={`blank-${i}`} className="cal-cell cal-cell-blank" aria-hidden="true" />
        ))}
        {cells.map(({ dayNum, data: day }) => {
          if (!day) {
            return (
              <div key={dayNum} className="cal-cell cal-cell-nodata">
                <span className="cal-daynum">{dayNum}</span>
              </div>
            );
          }
          const lead = day.lead ? themes.find((t) => t.id === day.lead) : null;
          const stat = lead ? day.th[lead.id] : null;
          const v = stat ? stat[mode] : null;
          const isToday = day.d === today;
          return (
            <button
              key={day.d}
              type="button"
              className={`cal-cell${isToday ? ' cal-cell-today' : ''}`}
              onClick={() => onSelectDay(day)}
              aria-label={`${dayNum}일 · 코스피 ${formatPct(day.idx.kospi)} · 코스닥 ${formatPct(day.idx.kosdaq)}${lead ? ` · 1위 ${lead.name} ${formatPct(v)}` : ''}`}
            >
              <span className="cal-daynum">{dayNum}</span>
              <span className="cal-idx">
                <span className={`tone-${toneOf(day.idx.kospi)}`}>{formatPctCompact(day.idx.kospi)}</span>
                <span className={`tone-${toneOf(day.idx.kosdaq)}`}>{formatPctCompact(day.idx.kosdaq)}</span>
              </span>
              {lead && (
                <span className="cal-chip" style={{ background: bandVar(v), color: bandInk(v) }}>
                  <span className="cal-chip-name">{lead.name}</span>
                  <span className="cal-chip-pct">{formatPct(v)}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
