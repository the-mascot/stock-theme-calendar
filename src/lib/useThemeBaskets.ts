import { useEffect, useState } from 'react';
import { fetchThemeBaskets } from './data';
import type { ThemeBasketFile } from './types';

/** data/themes.json 을 받아오는 훅 — 시트를 열 때만 부르고, 두 번째부터는
    data.ts 의 캐시에서 바로 온다. 판정 경계는 JSON이 없을 때를 대비해
    verify.py 의 기본값(0.6 / 0.3)으로 떨어진다. */
export function useThemeBaskets() {
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

  return {
    data,
    error,
    good: data?.thresholds.good ?? 0.6,
    watch: data?.thresholds.watch ?? 0.3,
  };
}
