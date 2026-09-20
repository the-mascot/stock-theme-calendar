import { TossAds } from '@apps-in-toss/web-framework';
import { useEffect, useRef, useState } from 'react';
import './BannerAd.css';
import { initTossAds, isBannerSupported, loadInSequence } from '../lib/tossAds';

// 개발 중에는 공식 테스트 ID(리스트형)만 쓴다 — 실제 ID로 테스트하면 정책 위반이다.
// 출시 빌드는 콘솔에서 발급받은 ID를 VITE_TOSS_BANNER_AD_GROUP_ID로 주입한다. 없으면 광고 자리를 아예 그리지 않는다.
const TEST_AD_GROUP_ID = 'ait-ad-test-banner-id';
const AD_GROUP_ID: string | undefined = import.meta.env.DEV
  ? TEST_AD_GROUP_ID
  : import.meta.env.VITE_TOSS_BANNER_AD_GROUP_ID;

/** 본문 맨 아래(푸터 위) 배너 광고. 지원 안 되는 환경·광고 없음(no fill)·렌더 실패면 자리째 사라져 빈 칸이 남지 않는다. */
export function BannerAd() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(() => Boolean(AD_GROUP_ID) && isBannerSupported());

  useEffect(() => {
    if (!visible || !AD_GROUP_ID) return;
    const adGroupId = AD_GROUP_ID;
    let cancelled = false;
    let attached: { destroy: () => void } | undefined;

    initTossAds().then((ok) => {
      if (cancelled) return;
      if (!ok) {
        setVisible(false);
        return;
      }
      // 리워드 광고 로드와 겹치지 않게 순서대로 — 로드가 끝나야(렌더·실패·no fill) 다음 차례로 넘어간다.
      loadInSequence((done) => {
        const el = containerRef.current;
        if (cancelled || !el) {
          done();
          return;
        }
        attached = TossAds.attachBanner(adGroupId, el, {
          theme: 'light', // 이 앱은 라이트 고정이라 배너도 맞춘다
          tone: 'blackAndWhite',
          variant: 'expanded',
          callbacks: {
            onAdRendered: done,
            onNoFill: () => {
              setVisible(false);
              done();
            },
            onAdFailedToRender: (payload) => {
              console.error('배너 광고 렌더링 실패:', payload.error.message);
              setVisible(false);
              done();
            },
          },
        });
      });
    });

    return () => {
      cancelled = true;
      attached?.destroy();
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <aside className="banner-ad" aria-label="광고">
      <div ref={containerRef} className="banner-ad-slot" />
    </aside>
  );
}
