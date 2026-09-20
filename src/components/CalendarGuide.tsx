import { useId, useState } from 'react';
import { CalendarLegend } from './CalendarLegend';
import { ChevronDown, ChevronUp } from './icons';
import { Legend } from './Legend';
import './CalendarGuide.css';

// 사용자가 직접 접었을 때만 기록한다 — 기록이 없으면(첫 방문·저장소를 못 쓰는 환경) 항상 펼쳐 둔다.
const COLLAPSED_KEY = 'theme-calendar-guide-collapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false; // 저장소를 못 쓰는 환경 — 펼친 채로 시작
  }
}

function writeCollapsed(collapsed: boolean) {
  try {
    if (collapsed) localStorage.setItem(COLLAPSED_KEY, '1');
    else localStorage.removeItem(COLLAPSED_KEY);
  } catch {
    // 저장소를 못 쓰는 환경 — 기록 없이 진행
  }
}

/** "테마 캘린더" 제목 줄 + 접었다 펼치는 "보는 법". 펼치면 기준(시장대비/원본) → 색 5단계·빗금 → 예시 칸 순서로 설명한다. */
export function CalendarGuide() {
  const [open, setOpen] = useState(() => !readCollapsed());
  const panelId = useId();

  const toggle = () => {
    const next = !open;
    setOpen(next);
    writeCollapsed(!next);
  };

  return (
    <>
      <div className="app-section-heading">
        <h2 className="app-section-title">테마 캘린더</h2>
        <button type="button" className="guide-toggle" aria-expanded={open} aria-controls={panelId} onClick={toggle}>
          <span className="guide-toggle-label">테마 캘린더 보는 법</span>
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {open && (
        <div id={panelId} className="guide-panel">
          <div className="guide-block guide-modes">
            <div>
              <p className="guide-mode-name">시장대비</p>
              <p className="guide-mode-desc">
                테마 등락률에서 코스피 등락률을 뺀 값이에요. 시장 전체가 오르내리는 날에도 테마만의 힘을 볼 수 있어요.
              </p>
            </div>
            <div>
              <p className="guide-mode-name">원본</p>
              <p className="guide-mode-desc">테마 바스켓에 속한 종목들의 실제 평균 등락률이에요.</p>
            </div>
          </div>

          <div className="guide-block">
            <Legend />
          </div>

          <div className="guide-block">
            <CalendarLegend />
          </div>
        </div>
      )}
    </>
  );
}
