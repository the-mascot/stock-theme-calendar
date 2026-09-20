import { useMemo, useState } from 'react';
import './WeakThemes.css';
import type { DayData, Theme, ValueMode } from '../lib/types';
import { formatPct, toneOf } from '../lib/format';
import { ThemeStocksSheet } from './ThemeStocksSheet';

interface WeakThemesProps {
  themes: Theme[];
  days: DayData[];
  mode: ValueMode;
  stocks: Record<string, string>;
}

interface ThemeAvg {
  theme: Theme;
  avg: number;
  leadCount: number;
}

/** 이번 달 순위 — 평균 등락률이 가장 낮은 5개. 같은 계산으로 "1위였던 날
    수"도 같이 보여줘서, 아직 주도권을 못 잡은(1위 0회) 테마인지도 드러난다.
    "곧 순환이 온다"는 식의 예측성 표현은 쓰지 않는다 — 6개월 데이터에서
    순환(어제 1위가 오늘 밀림) 근거를 못 찾았고, 정책상으로도 위험하다. */
function computeWeakest(themes: Theme[], days: DayData[], mode: ValueMode): ThemeAvg[] {
  const rows: ThemeAvg[] = themes.map((theme) => {
    const vals = days
      .map((d) => d.th[theme.id]?.[mode])
      .filter((v): v is number => v != null);
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const leadCount = days.filter((d) => d.lead === theme.id).length;
    return { theme, avg, leadCount };
  });
  return rows.sort((a, b) => a.avg - b.avg).slice(0, 5);
}

export function WeakThemes({ themes, days, mode, stocks }: WeakThemesProps) {
  const weakest = useMemo(() => computeWeakest(themes, days, mode), [themes, days, mode]);
  const [openTheme, setOpenTheme] = useState<Theme | null>(null);
  if (weakest.length === 0) return null;

  return (
    <section className="app-section">
      <h2 className="app-section-title">이번 달 저조했던 테마</h2>
      <p className="app-section-desc">
        이번 달 평균 등락률이 가장 낮았던 테마예요. 아직 한 번도 1위를 못 한 테마도 있어요. 테마명을 누르면
        상위 5종목을 볼 수 있어요.
      </p>

      <div className="weak-list">
        {weakest.map(({ theme, avg, leadCount }, i) => (
          <button key={theme.id} type="button" className="weak-row" onClick={() => setOpenTheme(theme)}>
            <span className="weak-rank">{i + 1}</span>
            <div className="weak-main">
              <span className="weak-name">{theme.name}</span>
              <span className="weak-sub">
                이번 달 1위 {leadCount}회{leadCount === 0 ? ' · 아직 1위 없음' : ''}
              </span>
            </div>
            <span className={`weak-value tone-${toneOf(avg)}`}>{formatPct(avg)}</span>
          </button>
        ))}
      </div>

      {openTheme && (
        <ThemeStocksSheet theme={openTheme} days={days} stocks={stocks} onClose={() => setOpenTheme(null)} />
      )}
    </section>
  );
}
