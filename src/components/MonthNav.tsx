import { ChevronLeft, ChevronRight } from './icons';
import './MonthNav.css';
import { formatMonthLabel } from '../lib/format';

interface MonthNavProps {
  month: string;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export function MonthNav({ month, canPrev, canNext, onPrev, onNext }: MonthNavProps) {
  return (
    <div className="month-nav">
      <button type="button" className="month-nav-btn" aria-label="이전 달" disabled={!canPrev} onClick={onPrev}>
        <ChevronLeft size={20} />
      </button>
      <span className="month-nav-label">{formatMonthLabel(month)}</span>
      <button type="button" className="month-nav-btn" aria-label="다음 달" disabled={!canNext} onClick={onNext}>
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
