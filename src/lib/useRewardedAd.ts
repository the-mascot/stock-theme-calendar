import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework';
import { useCallback, useEffect, useState } from 'react';
import { loadInSequence } from './tossAds';

// 개발 중에는 공식 테스트 ID만 쓴다. 출시 빌드는 콘솔에서 만든 리워드 광고 그룹 ID를
// VITE_TOSS_REWARDED_AD_GROUP_ID로 주입한다. 없으면 광고 없이 바로 열어 준다(아래 'unavailable').
const TEST_REWARDED_AD_GROUP_ID = 'ait-ad-test-rewarded-id';
const REWARDED_AD_GROUP_ID: string | undefined = import.meta.env.DEV
  ? TEST_REWARDED_AD_GROUP_ID
  : import.meta.env.VITE_TOSS_REWARDED_AD_GROUP_ID;

// 광고가 이 시간 안에 안 뜨면 포기하고 광고 없이 열어 준다 — 사용자를 막다른 길에 두지 않는다.
// (공식 문서: 토스 애즈는 보통 1~2초, AdMob은 5~20초, 최대 60초까지 걸릴 수 있다 — 5초는 그보다 짧게 잡은 값이라
//  AdMob 광고가 걸리는 느린 환경에서는 광고 없이 열릴 수 있다.)
const LOAD_TIMEOUT_MS = 5_000;
// 재생을 요청한 뒤 광고 화면이 뜨기 시작하기까지 기다려 줄 시간.
const SHOW_START_TIMEOUT_MS = 8_000;

/**
 * loading     — 광고를 미리 불러오는 중(버튼 비활성)
 * ready       — 불러옴, 버튼을 누르면 재생
 * showing     — 재생 중
 * unavailable — 미지원 환경·ID 없음·로드/재생 실패·시간 초과 → 광고 없이 바로 보여 준다
 */
export type RewardedAdStatus = 'loading' | 'ready' | 'showing' | 'unavailable';

function isRewardedSupported(): boolean {
  try {
    return loadFullScreenAd.isSupported() && showFullScreenAd.isSupported();
  } catch {
    return false;
  }
}

interface Options {
  /** false면(이미 보상을 받았으면) 광고를 불러오지 않는다. */
  enabled: boolean;
  /** 사용자가 광고를 끝까지 봐서 userEarnedReward가 온 순간에만 호출된다. */
  onReward: () => void;
}

export function useRewardedAd({ enabled, onReward }: Options) {
  const [status, setStatus] = useState<RewardedAdStatus>(() =>
    enabled && REWARDED_AD_GROUP_ID && isRewardedSupported() ? 'loading' : 'unavailable',
  );
  // 광고를 중간에 닫아 보상 없이 끝나면 값을 올려 다음 광고를 다시 불러온다.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    // ID가 없거나 미지원이면 초기 상태가 이미 'unavailable'이라 여기서 할 일이 없다.
    if (!REWARDED_AD_GROUP_ID || !isRewardedSupported()) return;
    const adGroupId = REWARDED_AD_GROUP_ID;
    let cancelled = false;
    let unregister: (() => void) | undefined;

    const timeout = setTimeout(() => {
      if (cancelled) return;
      console.warn('리워드 광고 로드 시간 초과 — 광고 없이 열어 줍니다.');
      setStatus('unavailable');
    }, LOAD_TIMEOUT_MS);

    // 배너 광고 로드와 겹치지 않게 순서대로(공식: 광고 그룹 ID는 하나씩 순차 로드).
    loadInSequence((done) => {
      if (cancelled) {
        done();
        return;
      }
      try {
        unregister = loadFullScreenAd({
          options: { adGroupId },
          onEvent: (event) => {
            if (event.type !== 'loaded') return;
            clearTimeout(timeout);
            if (!cancelled) setStatus('ready');
            done();
          },
          onError: (error) => {
            console.error('리워드 광고 로드 실패:', error);
            clearTimeout(timeout);
            if (!cancelled) setStatus('unavailable');
            done();
          },
        });
      } catch (error) {
        // 미지원 환경에서 로드 호출 자체가 예외를 던지는 경우 — 기다리지 않고 바로 광고 없이 열어 준다.
        console.error('리워드 광고 로드 호출 실패:', error);
        clearTimeout(timeout);
        if (!cancelled) setStatus('unavailable');
        done();
      }
    }, LOAD_TIMEOUT_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      unregister?.();
    };
  }, [enabled, attempt]);

  const show = useCallback(() => {
    if (status !== 'ready' || !REWARDED_AD_GROUP_ID) return;
    setStatus('showing');
    let earned = false;
    // 재생을 요청했는데 광고 화면이 안 뜨고 아무 이벤트도 안 오는 환경이면 "재생 중"에서 영영 못 벗어난다 —
    // 이 시간 안에 시작 신호(requested/show)가 없으면 광고 없이 열어 준다.
    const startTimer = setTimeout(() => {
      console.warn('리워드 광고 재생이 시작되지 않아 광고 없이 열어 줍니다.');
      setStatus('unavailable');
    }, SHOW_START_TIMEOUT_MS);
    const fail = (error: unknown) => {
      clearTimeout(startTimer);
      console.error('리워드 광고 재생 실패:', error);
      setStatus('unavailable');
    };

    try {
      showFullScreenAd({
        options: { adGroupId: REWARDED_AD_GROUP_ID },
        onEvent: (event) => {
          switch (event.type) {
            case 'requested':
            case 'show':
              clearTimeout(startTimer);
              break;
            case 'userEarnedReward':
              // 공식: 보상은 이 이벤트에서만 지급한다. dismissed만으로는 지급하지 않는다.
              clearTimeout(startTimer);
              earned = true;
              onReward();
              break;
            case 'dismissed':
              clearTimeout(startTimer);
              if (!earned) {
                // 중간에 닫음 → 보상 없이 다시 대기, 다음 광고를 미리 불러온다
                setStatus('loading');
                setAttempt((n) => n + 1);
              }
              break;
            case 'failedToShow':
              fail(event);
              break;
          }
        },
        onError: fail,
      });
    } catch (error) {
      fail(error);
    }
  }, [status, onReward]);

  return { status, show };
}
