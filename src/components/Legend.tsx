import './Legend.css';

const STEPS = ['neg-strong', 'neg-weak', 'zero', 'pos-weak', 'pos-strong'];
// 색 5단계의 실제 경계값(%) — lib/format.ts의 bandStep 판정 기준과 동일하게 맞춘다.
const TICKS = [
  { pct: 20, label: '-2.5' },
  { pct: 40, label: '-0.6' },
  { pct: 60, label: '0.6' },
  { pct: 80, label: '2.5' },
];

export function Legend() {
  return (
    <div className="legend">
      <div className="legend-scale">
        <span className="legend-label">약세</span>
        <div className="legend-bar-group">
          <div className="legend-swatches">
            {STEPS.map((step) => (
              <span key={step} className="legend-swatch" style={{ background: `var(--band-${step})` }} />
            ))}
          </div>
          <div className="legend-ticks">
            {TICKS.map((t) => (
              <span key={t.label} style={{ left: `${t.pct}%` }}>
                {t.label}
              </span>
            ))}
          </div>
        </div>
        <span className="legend-label">강세</span>
      </div>
      <p className="legend-note legend-hint">칸이 진할수록 시장 대비 등락폭이 커요</p>
      <p className="legend-note">빗금 무늬 = 그날 유효 종목 부족으로 집계 제외</p>
    </div>
  );
}
