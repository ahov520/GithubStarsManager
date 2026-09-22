import { useCallback, useEffect, useRef } from 'react';

const MOVE_TOLERANCE_PX = 10;
const LONG_PRESS_DELAY_MS = 480;

export function viewportAllowsLongPress(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.innerWidth < 768) return true;
  return typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
}

export function useCompactLongPress(onLongPress: () => void, delay = LONG_PRESS_DELAY_MS) {
  const onLongPressRef = useRef(onLongPress);
  const timerRef = useRef<number | null>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    onLongPressRef.current = onLongPress;
  }, [onLongPress]);

  useEffect(() => () => {
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
  }, []);

  const cancel = useCallback(() => {
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    originRef.current = null;
  }, []);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
    firedRef.current = false;
    if (!viewportAllowsLongPress() || (event.button != null && event.button !== 0)) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('button, a, input, textarea, select, [draggable="true"]')) return;
    originRef.current = { x: event.clientX, y: event.clientY };
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      firedRef.current = true;
      onLongPressRef.current();
    }, delay);
  }, [delay]);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (!originRef.current) return;
    const dx = event.clientX - originRef.current.x;
    const dy = event.clientY - originRef.current.y;
    if (dx * dx + dy * dy > MOVE_TOLERANCE_PX * MOVE_TOLERANCE_PX) cancel();
  }, [cancel]);

  const consumeFollowUpClick = useCallback(() => {
    if (!firedRef.current) return false;
    firedRef.current = false;
    return true;
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp: cancel, onPointerCancel: cancel, consumeFollowUpClick };
}
