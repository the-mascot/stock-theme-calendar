import { useEffect, useState } from 'react';
import './App.css';
import { DayDetailSheet } from './components/DayDetailSheet';
import { IndexStrip } from './components/IndexStrip';
import { Legend } from './components/Legend';
import { MonthNav } from './components/MonthNav';
import { Segmented } from './components/Segmented';
import { ThemeCalendar } from './components/ThemeCalendar';
import { ThemeHeatmap } from './components/ThemeHeatmap';
import { fetchIndex, fetchMonth } from './lib/data';
import type { DayData, IndexFile, MonthData, ValueMode, ViewMode } from './lib/types';

function App() {
  const [index, setIndex] = useState<IndexFile | null>(null);
  const [monthIdx, setMonthIdx] = useState(0);
  const [monthData, setMonthData] = useState<MonthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ValueMode>('rel');
  const [view, setView] = useState<ViewMode>('heat');
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchIndex()
      .then((idx) => {
        if (cancelled) return;
        setIndex(idx);
        setMonthIdx(idx.months.length - 1);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!index) return;
    const month = index.months[monthIdx];
    if (!month) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchMonth(month)
      .then((data) => {
        if (cancelled) return;
        setMonthData(data);
        setLoading(false);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [index, monthIdx]);

  if (error) {
    return (
      <main className="canvas app-state">
        <p className="app-error">{error}</p>
      </main>
    );
  }

  if (!index || !monthData || loading) {
    return (
      <main className="canvas app-state">
        <p className="app-loading">불러오는 중…</p>
      </main>
    );
  }

  const lastDay = monthData.days.at(-1) ?? null;

  return (
    <main className="canvas app">
      <MonthNav
        month={monthData.month}
        canPrev={monthIdx > 0}
        canNext={monthIdx < index.months.length - 1}
        onPrev={() => setMonthIdx((i) => i - 1)}
        onNext={() => setMonthIdx((i) => i + 1)}
      />

      <IndexStrip day={lastDay} />

      <div className="app-controls">
        <Segmented
          ariaLabel="등락률 기준"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'rel', label: '시장대비' },
            { value: 'chg', label: '원본' },
          ]}
        />
        <Segmented
          ariaLabel="보기 방식"
          value={view}
          onChange={setView}
          options={[
            { value: 'heat', label: '히트맵' },
            { value: 'calendar', label: '캘린더' },
          ]}
        />
      </div>

      <section className="app-section">
        <h2 className="app-section-title">테마 순환</h2>
        <p className="app-section-desc">
          {view === 'heat'
            ? '가로로 넘기면 그달 영업일 전체를 볼 수 있어요. 강세 구간이 행을 옮겨 다니면 그게 순환이에요.'
            : '칸을 누르면 그날 테마 전체 순위를 볼 수 있어요.'}
        </p>
        {view === 'heat' ? (
          <ThemeHeatmap
            themes={monthData.themes}
            days={monthData.days}
            mode={mode}
            onSelectDay={setSelectedDay}
          />
        ) : (
          <ThemeCalendar
            month={monthData.month}
            themes={monthData.themes}
            days={monthData.days}
            mode={mode}
            onSelectDay={setSelectedDay}
          />
        )}
      </section>

      <Legend />

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
