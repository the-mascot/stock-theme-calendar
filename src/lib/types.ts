export interface Theme {
  id: string;
  name: string;
}

export interface DayIndex {
  kospi: number | null;
  kosdaq: number | null;
  nasdaq: number | null;
}

export interface ThemeDayStat {
  chg: number;
  rel: number;
  n: number;
  top: [string, number][];
}

export interface DayData {
  d: string;
  idx: DayIndex;
  th: Record<string, ThemeDayStat>;
  lead: string | null;
}

export interface MonthData {
  month: string;
  updatedAt: string;
  themes: Theme[];
  stocks: Record<string, string>;
  days: DayData[];
}

export interface IndexFile {
  updatedAt: string;
  lastDate: string;
  months: string[];
  themes: Theme[];
  skippedTickers: string[];
}

export type ValueMode = 'rel' | 'chg';
export type ViewMode = 'heat' | 'calendar';
