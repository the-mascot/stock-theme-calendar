import { getSafeAreaInsets } from '@apps-in-toss/web-framework';
import { useEffect, useState } from 'react';
import { Close } from './icons';
import './Sheet.css';
import './ThemeBasketSheet.css';
import { fetchThemeBaskets } from '../lib/data';
import type { ThemeBasketFile } from '../lib/types';

interface ThemeBasketSheetProps {
  onClose: () => void;
}

/** 판정 3단계 — verify.py 의 ✅/⚠️/❌ 와 같은 경계를 쓴다. 경계값은
    data/themes.json 의 thresholds 에서 받아서, 파이썬 쪽만 고쳐도 따라온다. */
type Grade = 'good' | 'watch' | 'weak' | 'none';

function gradeOf(r: number | null, good: number, watch: number): Grade {
  if (r == null) return 'none';
  if (r >= good) return 'good';
  if (r >= watch) return 'watch';
  return 'weak';
}

function formatR(r: number | null): string {
  return r == null ? '–' : r.toFixed(2);
}

/** "1y" → "최근 1년" */
function formatPeriod(period: string): string {
  const m = /^(\d+)([ym])$/.exec(period.trim());
  if (!m) return period;
  return `최근 ${m[1]}${m[2] === 'y' ? '년' : '개월'}`;
}

export function ThemeBasketSheet({ onClose }: ThemeBasketSheetProps) {
  const insets = getSafeAreaInsets();
  const [data, setData] = useState<ThemeBasketFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchThemeBaskets()
      .then((d) => !cancelled && setData(d))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const good = data?.thresholds.good ?? 0.6;
  const watch = data?.thresholds.watch ?? 0.3;

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label="테마 기준 종목"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-header">
          <span className="sheet-title">테마 기준 종목</span>
          <button type="button" className="sheet-close" aria-label="닫기" onClick={onClose}>
            <Close size={20} />
          </button>
        </div>

        <div className="basket-body">
          {error && <p className="sheet-empty">{error}</p>}
          {!error && !data && <p className="sheet-empty">불러오는 중…</p>}

          {data && (
            <>
              <section className="basket-intro">
                <p className="basket-intro-text">
                  테마 등락률은 아래 종목들의 일간 등락률을 <strong>단순평균</strong>한 값이에요. 시가총액
                  가중이 아니라서 대장주 한 종목에 테마 신호가 묻히지 않아요.
                </p>
                <div className="basket-note">
                  <p className="basket-note-title">응집도가 뭔가요?</p>
                  <p className="basket-note-text">
                    같은 테마 종목들이 얼마나 <strong>한 몸처럼 움직였는지</strong>를 나타내는 값이에요.
                    종목마다 “나를 뺀 나머지 테마 종목 평균”과 얼마나 같이 오르내렸는지(상관도)를 구하고,
                    그 평균을 테마의 응집도로 썼어요. 1에 가까울수록 테마 뉴스에 함께 반응했다는 뜻이고,
                    낮으면 종목들이 따로 놀아서 그 테마 등락률이 덜 또렷해요.
                  </p>
                  <ul className="basket-legend">
                    <li>
                      <span className="basket-dot basket-dot-good" aria-hidden="true" />
                      {good.toFixed(1)} 이상 — 테마와 잘 붙어 움직여요
                    </li>
                    <li>
                      <span className="basket-dot basket-dot-watch" aria-hidden="true" />
                      {watch.toFixed(1)}~{good.toFixed(1)} — 느슨해요, 지켜보는 중
                    </li>
                    <li>
                      <span className="basket-dot basket-dot-weak" aria-hidden="true" />
                      {watch.toFixed(1)} 미만 — 따로 놀아서 교체를 검토해요
                    </li>
                  </ul>
                  <p className="basket-note-meta">{formatPeriod(data.period)} 일간 등락률 기준</p>
                </div>
              </section>

              {data.themes.map((theme) => (
                <section key={theme.id} className="basket-theme">
                  <div className="basket-theme-head">
                    <h3 className="basket-theme-name">{theme.name}</h3>
                    <span className="basket-theme-count">{theme.stocks.length}종목</span>
                    <span className={`basket-cohesion basket-cohesion-${gradeOf(theme.cohesion, good, watch)}`}>
                      응집도 {formatR(theme.cohesion)}
                    </span>
                  </div>
                  <table className="basket-table">
                    <thead>
                      <tr>
                        <th scope="col">종목</th>
                        <th scope="col" className="basket-col-r">
                          상관도
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {theme.stocks.map((s) => (
                        <tr key={s.code}>
                          <td>{s.name}</td>
                          <td className={`basket-col-r basket-r-${gradeOf(s.r, good, watch)}`}>{formatR(s.r)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
