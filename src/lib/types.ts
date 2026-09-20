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

/** verify.py 가 내는 기준 종목표 — themes.yaml 의 전체 바스켓과 응집도. */
export interface BasketStock {
  code: string;
  name: string;
  /** 자기 테마 나머지 종목 평균과의 상관계수. 거래일이 모자라면 null */
  r: number | null;
  n: number;
}

export interface ThemeBasket {
  id: string;
  name: string;
  /** 바스켓 멤버 r의 평균 */
  cohesion: number | null;
  stocks: BasketStock[];
}

export interface ThemeBasketFile {
  generatedAt: string;
  period: string;
  thresholds: { good: number; watch: number };
  themes: ThemeBasket[];
}
