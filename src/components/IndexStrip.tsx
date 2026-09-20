import './IndexStrip.css';
import type { Theme } from '../lib/types';
import { formatPct, toneOf } from '../lib/format';

interface IndexStripProps {
  kospi: number | null;
  kosdaq: number | null;
  lead: { theme: Theme; value: number | null } | null;
  /** 값 라벨 — 하루 기준이면 "종목 평균 등락", 한 달 기준이면 "한 달 등락"/"한 달 시장대비". */
  leadLabel: string;
}

export function IndexStrip({ kospi, kosdaq, lead, leadLabel }: IndexStripProps) {
  const indices = [
    { label: '코스피', value: kospi },
    { label: '코스닥', value: kosdaq },
  ];

  return (
    <div className="index-strip">
      <div className="index-strip-row">
        {indices.map(({ label, value }) => (
          <div key={label} className="index-strip-item">
            <span className="index-strip-label">{label}</span>
            <span className={`index-strip-value tone-${toneOf(value)}`}>{formatPct(value)}</span>
          </div>
        ))}
      </div>
      <div className="index-strip-divider" />
      <div className="index-strip-row">
        <div className="index-strip-item">
          <span className="index-strip-label">1위 테마</span>
          <span className="index-strip-value index-strip-value-name">{lead ? lead.theme.name : '–'}</span>
        </div>
        <div className="index-strip-item">
          <span className="index-strip-label">{leadLabel}</span>
          <span className={`index-strip-value tone-${toneOf(lead?.value)}`}>{formatPct(lead?.value)}</span>
        </div>
      </div>
    </div>
  );
}
