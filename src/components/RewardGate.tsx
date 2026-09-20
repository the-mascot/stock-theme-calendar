import type { ReactNode } from 'react';
import './Gate.css';
import { useRewardedAd } from '../lib/useRewardedAd';

interface RewardGateProps {
  /** 이번 방문에서 리워드 광고를 이미 봤는지 — 월을 넘겨도 유지되도록 App이 들고 있다. */
  unlocked: boolean;
  onUnlock: () => void;
  title: string;
  desc: string;
  buttonLabel: string;
  note: string;
  children: ReactNode;
}

/**
 * 리워드 광고 게이트 하나로 여러 섹션을 한꺼번에 연다.
 *
 * 앱인토스(토스 애즈 SSP) 정책이 "동일 화면에 동일 포맷 광고를 2개 이상 배치"를
 * UI/UX 품질 저하로 금지한다. 이 앱은 스크롤 하나짜리 단일 화면이라 리워드
 * 게이트를 섹션마다 두면 그대로 위반이므로, 게이트는 화면 전체에서 하나만 둔다.
 * (배너는 포맷이 달라 함께 있어도 된다.)
 */
export function RewardGate({
  unlocked,
  onUnlock,
  title,
  desc,
  buttonLabel,
  note,
  children,
}: RewardGateProps) {
  const { status, show } = useRewardedAd({ enabled: !unlocked, onReward: onUnlock });

  // 광고를 볼 수 없는 상황(미지원·로드 실패·시간 초과)에서는 잠그지 않고 바로 보여 준다 — 막다른 화면 방지.
  if (unlocked || status === 'unavailable') return <>{children}</>;

  return (
    <section className="app-section">
      <h2 className="app-section-title">{title}</h2>
      <p className="app-section-desc">{desc}</p>
      <div className="ad-gate">
        <button type="button" className="ad-gate-btn" disabled={status !== 'ready'} onClick={show}>
          {buttonLabel}
        </button>
        <p className="ad-gate-note">{status === 'loading' ? '광고를 불러오고 있어요.' : note}</p>
      </div>
    </section>
  );
}
