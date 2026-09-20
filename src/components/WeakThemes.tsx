import { useMemo, useState } from 'react';
import './WeakThemes.css';
import type { DayData, Theme, ValueMode } from '../lib/types';
import { formatPct, toneOf } from '../lib/format';
import { useRewardedAd } from '../lib/useRewardedAd';
import { ThemeStocksSheet } from './ThemeStocksSheet';

interface WeakThemesProps {
  themes: Theme[];
  days: DayData[];
  mode: ValueMode;
  stocks: Record<string, string>;
  /** 이번 방문에서 리워드 광고를 이미 봤는지 — 월을 넘겨도 유지되도록 App이 들고 있다. */
  unlocked: boolean;
  onUnlock: () => void;
}

interface ThemeAvg {
  theme: Theme;
  avg: number;
  leadCount: number;
}

/** 이번 달 순위 — 평균 등락률이 가장 낮은 5개. 같은 계산으로 "1위였던 날
    수"도 같이 보여줘서, 순환이 아직 안 온(1위 0회) 테마인지도 드러난다. */
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

export function WeakThemes({ themes, days, mode, stocks, unlocked, onUnlock }: WeakThemesProps) {
  const weakest = useMemo(() => computeWeakest(themes, days, mode), [themes, days, mode]);
  const [openTheme, setOpenTheme] = useState<Theme | null>(null);
  const { status, show } = useRewardedAd({ enabled: !unlocked, onReward: onUnlock });
  if (weakest.length === 0) return null;

  // 광고를 볼 수 없는 상황(미지원·로드 실패·시간 초과)에서는 잠그지 않고 바로 보여 준다 — 막다른 화면 방지.
  const showList = unlocked || status === 'unavailable';

  return (
    <section className="app-section">
      <h2 className="app-section-title">이번 달 저조했던 테마</h2>
      <p className="app-section-desc">
        이번 달 평균 등락률이 가장 낮았던 테마예요. 아직 순환이 안 온 테마일 수 있어요.
        {showList && ' 테마명을 누르면 기준 종목을 볼 수 있어요.'}
      </p>

      {showList ? (
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
      ) : (
        <div className="weak-gate">
          <button type="button" className="weak-gate-btn" disabled={status !== 'ready'} onClick={show}>
            광고 보고 테마 확인하기
          </button>
          <p className="weak-gate-note">
            {status === 'loading' ? '광고를 불러오고 있어요.' : '짧은 광고를 보고 테마를 확인해 보세요.'}
          </p>
        </div>
      )}

      {openTheme && (
        <ThemeStocksSheet theme={openTheme} days={days} stocks={stocks} onClose={() => setOpenTheme(null)} />
      )}
    </section>
  );
}
