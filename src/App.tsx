import { useEffect, useState } from 'react';
import './App.css';
import { BannerAd } from './components/BannerAd';
import { CalendarGuide } from './components/CalendarGuide';
import { DayDetailSheet } from './components/DayDetailSheet';
import { IndexStrip } from './components/IndexStrip';
import { LeadShare } from './components/LeadShare';
import { MonthNav } from './components/MonthNav';
import { RewardGate } from './components/RewardGate';
import { Segmented } from './components/Segmented';
import { ChevronRight } from './components/icons';
import { ThemeBasketSheet } from './components/ThemeBasketSheet';
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
  const [basketOpen, setBasketOpen] = useState(false);
  // 심화 분석 두 섹션은 리워드 광고 하나로 함께 열린다(정책: 동일 화면에 같은
  // 포맷 광고 2개 금지). 월을 넘겨도 다시 보게 하지 않도록 상태를 여기서 들고 있는다.
  const [analysisUnlocked, setAnalysisUnlocked] = useState(false);

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
    ? summary.lead && { theme: summary.lead.theme, value: summary.lead.value }
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
              leadLabel={summary ? (mode === 'rel' ? '한 달 시장대비' : '한 달 등락') : '종목 평균 등락'}
            />
          </>
        ) : (
          <div className="index-strip index-strip-empty">이 달 지수 데이터가 없어요</div>
        )}
      </div>

      {/* 배너는 상단 요약 바로 아래. 정책상 금지되는 건 '진입 직후 전면 배너'라
          인라인 리스트형은 괜찮고, 아래쪽에 두면 '테마 기준 종목 보기' 버튼과
          인접해서 의도치 않은 클릭 유발 구조로 읽힐 수 있어 위로 올렸다. */}
      <BannerAd />

      <section className="app-section app-intro">
        <span className="app-intro-emoji tf" aria-hidden="true">
          📅
        </span>
        <h2 className="app-intro-title">테마 캘린더가 뭔가요?</h2>
        <p className="app-intro-text">
          매일 코스피·코스닥에서 강했던 테마를 모아 보여줘요.{' '}
          <strong className="app-intro-highlight">
            주도 테마가 며칠씩 이어지기도 하고, 힘이 다른 테마로 옮겨가기도 해요.
          </strong>{' '}
          <strong>이 캘린더로 그 흐름을 한눈에 잡아보세요.</strong>
        </p>
      </section>

      <section className="app-section" aria-label="테마 캘린더">
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
          가로로 넘기면 그달 영업일 전체를 볼 수 있어요. 한 행에 붉은 칸이 이어지면 주도 테마가 유지된 거고, 다른 행으로 옮겨가면 순환이에요.
        </p>
        <ThemeHeatmap
          themes={monthData.themes}
          days={monthData.days}
          mode={mode}
          onSelectDay={setSelectedDay}
        />
      </section>

      <RewardGate
        unlocked={analysisUnlocked}
        onUnlock={() => setAnalysisUnlocked(true)}
        title="테마 심화 분석"
        desc="이번 달 저조했던 테마와, 최근 6개월 코스피가 오른 날의 강세 테마를 함께 볼 수 있어요."
        buttonLabel="광고 보고 분석 보기"
        note="짧은 광고를 보고 확인해 보세요."
      >
        <WeakThemes
          themes={monthData.themes}
          days={monthData.days}
          mode={mode}
          stocks={monthData.stocks}
        />

        <LeadShare months={index.months} themes={index.themes} />
      </RewardGate>

      <button type="button" className="app-basket-link" onClick={() => setBasketOpen(true)}>
        <span>테마 기준 종목 보기</span>
        <ChevronRight size={16} />
      </button>

      <footer className="app-footer">
        <ul className="app-footer-notes">
          <li className="app-footer-text">이 정보는 참고용으로 제공되며, 투자 판단과 그 결과에 대한 책임은 본인에게 있습니다.</li>
          <li className="app-footer-text">평일 오후 3시 40분경, 시간외 거래 마감 후 오후 8시 10분경 두 번 업데이트돼요. 최종 수치는 저녁 갱신 기준이에요.</li>
        </ul>
      </footer>

      {basketOpen && <ThemeBasketSheet onClose={() => setBasketOpen(false)} />}

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
