import './Legend.css';

const BANDS = [
  'var(--band-neg-4)',
  'var(--band-neg-3)',
  'var(--band-neg-2)',
  'var(--band-neg-1)',
  'var(--band-zero)',
  'var(--band-pos-1)',
  'var(--band-pos-2)',
  'var(--band-pos-3)',
  'var(--band-pos-4)',
];

export function Legend() {
  return (
    <div className="legend">
      <span className="legend-label">약세</span>
      <span className="legend-swatches">
        {BANDS.map((b, i) => (
          <i key={i} style={{ background: b }} />
        ))}
      </span>
      <span className="legend-label">강세</span>
      <span className="legend-note">빗금 = 데이터 부족</span>
    </div>
  );
}
