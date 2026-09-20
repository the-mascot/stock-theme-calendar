import { useEffect } from 'react';

/** 열려 있는 시트 수 — 시트가 겹쳐 떠도 마지막 하나가 닫힐 때만 풀리게 센다. */
let openCount = 0;
let savedY = 0;

/**
 * 시트가 떠 있는 동안 뒤 화면이 스크롤되지 않게 막는다.
 *
 * body에 overflow:hidden만 주면 iOS WebView에서 터치 드래그가 그대로 새서,
 * 오버레이를 잡고 끌면 뒤 페이지가 움직인다. body를 position:fixed로 올리고
 * 스크롤 위치를 top에 음수로 넣어 두는 게 확실하다 — 닫을 때 그 값으로
 * 되돌려 놓으면 보던 위치가 유지된다.
 */
export function useBodyScrollLock() {
  useEffect(() => {
    const body = document.body;
    if (openCount === 0) {
      savedY = window.scrollY;
      body.style.position = 'fixed';
      body.style.top = `-${savedY}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
      body.style.overflow = 'hidden';
    }
    openCount += 1;

    return () => {
      openCount -= 1;
      if (openCount > 0) return;
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.width = '';
      body.style.overflow = '';
      window.scrollTo(0, savedY);
    };
  }, []);
}
