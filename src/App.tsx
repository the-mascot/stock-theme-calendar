import { useEffect, useState } from 'react';
import './App.css';
import { BannerAd } from './components/BannerAd';
import { CalendarGuide } from './components/CalendarGuide';
import { DayDetailSheet } from './components/DayDetailSheet';
import { IndexStrip } from './components/IndexStrip';
import { MonthNav } from './components/MonthNav';
import { Segmented } from './components/Segmented';
import { ThemeCalendar } from './components/ThemeCalendar';
import { ThemeHeatmap } from './components/ThemeHeatmap';
import { WeakThemes } from './components/WeakThemes';
import { fetchIndex, fetchMonth } from './lib/data';
import { formatDayLabel, formatMonthNumber } from './lib/format';
import { summarizeMonth } from './lib/monthSummary';
import type { DayData, IndexFile, MonthData, ValueMode } from './lib/types';

function App() {
  const [index, setIndex] = useState<IndexFile | null>(null);
  const [monthIdx, setMonthIdx] = useState(0);
  // 월 데이터는 어느 달의 결과인지 함께 들고 있어서, 달을 넘기는 순간 로딩 상태가 렌더 중에 파생된다.
  const [monthResult, setMonthResult] = useState<{ month: string; data?: MonthData; error?: string } | null>(null);
  const [indexError, setIndexError] = useState<string | null>(null);
  const [mode, setMode] = useState<ValueMode>('rel');
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  // 저조 테마 표는 리워드 광고를 본 뒤 열린다. 월을 넘겨도 다시 보게 하지 않도록 여기서 들고 있는다.
  const [weakUnlocked, setWeakUnlocked] = useState(false);

  const targetMonth = index?.months[monthIdx];
  const currentResult = monthResult?.month === targetMonth ? monthResult : null;
  const monthData = currentResult?.data ?? null;
  const error = indexError ?? currentResult?.error ?? null;

  useEffect(() => {
    let cancelled = false;
    fetchIndex()
      .then((idx) => {
        if (cancelled) return;
        setIndex(idx);
        setMonthIdx(idx.months.length - 1);
      })
      .catch((e: Error) => !cancelled && setIndexError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!targetMonth) return;
    let cancelled = false;
    fetchMonth(targetMonth)
      .then((data) => !cancelled && setMonthResult({ month: targetMonth, data }))
      .catch((e: Error) => !cancelled && setMonthResult({ month: targetMonth, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [targetMonth]);

  if (error) {
    return (
      <main className="canvas app-state">
        <p className="app-error">{error}</p>
      </main>
    );
  }

  if (!index || !monthData) {
    return (
      <main className="canvas app-state">
        <p className="app-loading">불러오는 중…</p>
      </main>
    );
  }

  const lastDay = monthData.days.at(-1) ?? null;
  // 이번 달은 가장 최근 영업일 기준, 지난 달은 말일 하루가 아니라 한 달 전체 요약을 보여 준다.
  const isCurrentMonth = monthIdx === index.months.length - 1;
  const summary = isCurrentMonth ? null : summarizeMonth(monthData.days, monthData.themes, mode);
  const lastLead = lastDay?.lead ? monthData.themes.find((t) => t.id === lastDay.lead) : undefined;
  const stripLead = summary
    ? summary.lead && { theme: summary.lead.theme, value: summary.lead.avg }
    : lastLead && lastDay && { theme: lastLead, value: lastDay.th[lastLead.id]?.[mode] ?? null };

  return (
    <main className="canvas app">
      <MonthNav
        month={monthData.month}
        canPrev={monthIdx > 0}
        canNext={monthIdx < index.months.length - 1}
        onPrev={() => setMonthIdx((i) => i - 1)}
        onNext={() => setMonthIdx((i) => i + 1)}
      />

      <div className="app-section">
        {lastDay ? (
          <>
            <p className="app-asof">
              {isCurrentMonth ? `${formatDayLabel(lastDay.d)} 기준` : `${formatMonthNumber(monthData.month)} 한 달 기준`}
            </p>
            <IndexStrip
              kospi={summary ? summary.kospi : lastDay.idx.kospi}
              kosdaq={summary ? summary.kosdaq : lastDay.idx.kosdaq}
              lead={stripLead || null}
              leadLabel={summary ? '일평균 등락' : '종목 평균 등락'}
            />
          </>
        ) : (
          <div className="index-strip index-strip-empty">이 달 지수 데이터가 없어요</div>
        )}
      </div>

      <section className="app-section app-intro">
          <h2 className="app-intro-title">테마 캘린더가 뭔가요?</h2>
          <p className="app-section-desc">
              매일 코스피·코스닥에서 강했던 테마를 모아 보여줘요.{' '}
              <strong className="app-intro-highlight">
                  강세장에서는 한 테마가 계속 오르기보다, 힘이 이 테마 저 테마로 옮겨 다니는 순환이 자주 나타나요.
              </strong>{' '}
              이 캘린더로 그 흐름을 한눈에 잡아보세요.
          </p>
      </section>

      <section className="app-section">
        <CalendarGuide />
        <div className="app-section-spaced">
          <Segmented
            ariaLabel="등락률 기준"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'rel', label: '시장대비' },
              { value: 'chg', label: '원본' },
            ]}
          />
        </div>
        <p className="app-section-desc">칸을 누르면 그날 테마 전체 순위를 볼 수 있어요.</p>
        <ThemeCalendar
          month={monthData.month}
          themes={monthData.themes}
          days={monthData.days}
          mode={mode}
          onSelectDay={setSelectedDay}
        />
      </section>

      <section className="app-section">
        <h2 className="app-section-title">테마 순환 히트맵</h2>
        <p className="app-section-desc">
          가로로 넘기면 그달 영업일 전체를 볼 수 있어요. 강세 구간이 행을 옮겨 다니면 그게 순환이에요.
        </p>
        <ThemeHeatmap
          themes={monthData.themes}
          days={monthData.days}
          mode={mode}
          onSelectDay={setSelectedDay}
        />
      </section>

      <WeakThemes
        themes={monthData.themes}
        days={monthData.days}
        mode={mode}
        stocks={monthData.stocks}
        unlocked={weakUnlocked}
        onUnlock={() => setWeakUnlocked(true)}
      />

      <BannerAd />

      <footer className="app-footer">
        <p className="app-footer-text">이 정보는 참고용으로 제공되며, 투자 판단과 그 결과에 대한 책임은 본인에게 있습니다.</p>
        <p className="app-footer-text">매일 정규장 마감(오후 3시 30분) 후, 오후 4시경 업데이트돼요.</p>
      </footer>

      {selectedDay && (
        <DayDetailSheet
          day={selectedDay}
          themes={monthData.themes}
          stocks={monthData.stocks}
          mode={mode}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </main>
  );
}

export default App;
