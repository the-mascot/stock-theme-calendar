import { TossAds } from '@apps-in-toss/web-framework';

let initPromise: Promise<boolean> | null = null;
let loadQueue: Promise<void> = Promise.resolve();

/** 배너 광고 API를 쓸 수 있는 환경인지 — 토스 앱 5.241.0 미만이면 false라 슬롯 자체를 그리지 않는다. */
export function isBannerSupported(): boolean {
  try {
    return TossAds.initialize.isSupported() && TossAds.attachBanner.isSupported();
  } catch {
    return false;
  }
}

/** SDK 초기화는 앱 전체에서 한 번만 한다 — 두 번 부르면 "Already initialized" 에러가 난다. */
export function initTossAds(): Promise<boolean> {
  if (!initPromise) {
    initPromise = new Promise((resolve) => {
      TossAds.initialize({
        callbacks: {
          onInitialized: () => resolve(true),
          onInitializationFailed: (error) => {
            console.error('Toss Ads SDK 초기화 실패:', error);
            resolve(false);
          },
        },
      });
    });
  }
  return initPromise;
}

/**
 * 광고 그룹은 한 번에 하나씩만 로드한다 — 배너와 리워드를 동시에 로드하면 Android 일부 버전
 * (5.266.0~5.267.x)에서 이벤트가 안 온다는 공식 안내가 있다. task는 로드가 끝나면(성공·실패 무관)
 * done()을 불러야 다음 로드가 시작된다. 안 불러도 timeoutMs 뒤엔 넘어가서 큐가 막히지 않는다.
 */
export function loadInSequence(task: (done: () => void) => void, timeoutMs = 10_000): Promise<void> {
  const run = loadQueue.then(
    () =>
      new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, timeoutMs);
        const done = () => {
          clearTimeout(timer);
          resolve();
        };
        // 미지원 환경에서 광고 API가 예외를 던져도 대기열이 멈추지 않게 한다(뒤의 배너 로드까지 막힌다).
        try {
          task(done);
        } catch (error) {
          console.error('광고 로드 호출 실패:', error);
          done();
        }
      }),
  );
  loadQueue = run;
  return run;
}
