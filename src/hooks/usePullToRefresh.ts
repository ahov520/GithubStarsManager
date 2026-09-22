import { useEffect, useRef, useState } from 'react';

export type PullRefreshAction = 'ignore' | 'pull' | 'refresh';

/** 下拉距离足够且主要是竖直方向时才触发同步，横向滑动分类条不会误触。 */
export const pullRefreshAction = (dx: number, dy: number, threshold: number): PullRefreshAction => {
  if (dy <= 0 || Math.abs(dx) > Math.abs(dy)) return 'ignore';
  return dy >= threshold ? 'refresh' : 'pull';
};

const IGNORE_SELECTOR = 'input, textarea, select, button, a, [role="dialog"], [role="menu"], [data-slot="sheet-overlay"]';

interface UsePullToRefreshOptions {
  enabled?: boolean;
  threshold?: number;
  onRefresh: () => void | Promise<void>;
}

export const usePullToRefresh = ({
  enabled = true,
  threshold = 80,
  onRefresh,
}: UsePullToRefreshOptions): { distance: number; refreshing: boolean } => {
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;
    const media = window.matchMedia?.('(max-width: 767px)');
    if (media && !media.matches) return undefined;

    let startX = 0;
    let startY = 0;
    let tracking = false;
    let current = 0;

    const reset = () => {
      tracking = false;
      current = 0;
      setDistance(0);
    };

    const onStart = (event: TouchEvent) => {
      if (refreshing || window.scrollY > 8 || event.touches.length !== 1) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(IGNORE_SELECTOR)) return;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
      tracking = true;
      current = 0;
    };

    const onMove = (event: TouchEvent) => {
      if (!tracking || event.touches.length !== 1) return;
      const dx = event.touches[0].clientX - startX;
      const dy = event.touches[0].clientY - startY;
      const action = pullRefreshAction(dx, dy, threshold);
      current = action === 'ignore' ? 0 : Math.min(dy, 120);
      setDistance(current);
    };

    const onEnd = () => {
      if (!tracking) return;
      const shouldRefresh = current >= threshold;
      reset();
      if (!shouldRefresh) return;
      setRefreshing(true);
      Promise.resolve(onRefreshRef.current()).finally(() => setRefreshing(false));
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', reset);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', reset);
    };
  }, [enabled, refreshing, threshold]);

  return { distance, refreshing };
};
