import './CalendarLegend.css';

function PointLeft() {
  return (
    <svg width="18" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 12 H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M9 6 L4 12 L9 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** 캘린더 칸을 실제와 같은 색·톤·테두리로 재현한 예시 카드 — 옆에 화살표로
    각 줄이 뭘 뜻하는지 바로 가리켜서 문장 설명보다 한눈에 들어오게 한다. */
export function CalendarLegend() {
  return (
    <div className="cal-legend">
      <div className="cal-legend-body">
        <div className="cal-legend-card">
          <span className="cal-legend-daynum">15</span>
          <span className="cal-legend-value tone-up">+0.23</span>
          <span className="cal-legend-value tone-down">-1.56</span>
          <span className="cal-legend-chip">
            <span className="cal-legend-chip-name">반도체</span>
            <span className="cal-legend-chip-pct">+7.01%</span>
          </span>
        </div>
        <div className="cal-legend-notes">
          <span className="cal-legend-note-spacer" aria-hidden="true" />
          <span className="cal-legend-note">
            <PointLeft /> 코스피 등락률
          </span>
          <span className="cal-legend-note">
            <PointLeft /> 코스닥 등락률
          </span>
          <span className="cal-legend-note cal-legend-note-chip">
            <PointLeft /> 그날 1위 테마 · 등락률
          </span>
        </div>
      </div>
    </div>
  );
}
