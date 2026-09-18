import './IndexStrip.css';
import type { DayData } from '../lib/types';
import { formatPct, toneOf } from '../lib/format';

interface IndexStripProps {
  day: DayData | null;
}

const LABELS: { key: keyof DayData['idx']; label: string }[] = [
  { key: 'kospi', label: '코스피' },
  { key: 'kosdaq', label: '코스닥' },
  { key: 'nasdaq', label: '나스닥' },
];

export function IndexStrip({ day }: IndexStripProps) {
  if (!day) {
    return <div className="index-strip index-strip-empty">이 달 지수 데이터가 없어요</div>;
  }
  return (
    <div className="index-strip">
      {LABELS.map(({ key, label }) => {
        const v = day.idx[key];
        return (
          <div key={key} className="index-strip-item">
            <span className="index-strip-label">{label}</span>
            <span className={`index-strip-value tone-${toneOf(v)}`}>{formatPct(v)}</span>
          </div>
        );
      })}
    </div>
  );
}
