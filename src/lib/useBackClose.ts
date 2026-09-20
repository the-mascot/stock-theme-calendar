import { graniteEvent } from '@apps-in-toss/web-framework';
import { useEffect, useRef } from 'react';

/**
 * 시트가 열려 있는 동안 안드로이드 시스템 뒤로가기를 가로채 시트만 닫는다.
 *
 * 이 처리가 없으면 뒤로가기가 그대로 WebView로 가서 **미니앱이 통째로 종료된다**
 * (2026-09-21 실기기에서 확인). 바텀시트가 떠 있을 때 기대되는 동작은
 * "시트만 닫기"다.
 *
 * 리스너가 등록돼 있는 동안에는 기본 뒤로가기가 차단되므로, 시트가 닫히면서
 * 반드시 해제돼야 한 번 더 누를 때 정상적으로 앱을 빠져나갈 수 있다 —
 * 뒤로가기를 계속 막아 두는 건 정책 위반이다("Back 버튼을 차단하거나
 * 비정상적으로 제어하여 정상적인 화면 종료를 방해하는 경우").
 */
export function useBackClose(onClose: () => void) {
  const latest = useRef(onClose);

  useEffect(() => {
    latest.current = onClose;
  }, [onClose]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = graniteEvent.addEventListener('backEvent', {
        onEvent: () => latest.current(),
        onError: (error) => console.error('뒤로가기 이벤트 처리 실패:', error),
      });
    } catch (error) {
      // 토스 앱 밖(브라우저 개발 환경)에서는 지원되지 않는다 — 닫기 버튼·딤 탭은 그대로 동작한다.
      console.warn('뒤로가기 이벤트를 구독할 수 없어요:', error);
    }
    return () => unsubscribe?.();
  }, []);
}
