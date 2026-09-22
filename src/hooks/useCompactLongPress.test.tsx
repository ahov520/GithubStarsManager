import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCompactLongPress } from './useCompactLongPress';

function Harness({ onLongPress }: { onLongPress: () => void }) {
  const { consumeFollowUpClick, ...pointerHandlers } = useCompactLongPress(onLongPress, 480);
  return (
    <div
      data-testid="surface"
      {...pointerHandlers}
      onClick={() => {
        if (consumeFollowUpClick()) return;
        surfaceClicks.current += 1;
      }}
    >
      正文
      <button type="button">按钮</button>
    </div>
  );
}

const surfaceClicks = { current: 0 };

describe('useCompactLongPress', () => {
  it('fires after a hold on a narrow viewport and swallows the follow-up click', () => {
    vi.useFakeTimers();
    const original = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    const onLongPress = vi.fn();
    surfaceClicks.current = 0;
    render(<Harness onLongPress={onLongPress} />);
    const surface = screen.getByTestId('surface');

    fireEvent.pointerDown(surface, { button: 0, clientX: 8, clientY: 8 });
    vi.advanceTimersByTime(479);
    expect(onLongPress).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onLongPress).toHaveBeenCalledTimes(1);

    fireEvent.pointerUp(surface);
    fireEvent.click(surface);
    expect(surfaceClicks.current).toBe(0);

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: original });
    vi.useRealTimers();
  });

  it('ignores a short tap and a hold on a wide fine-pointer viewport', () => {
    vi.useFakeTimers();
    const original = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
    const onLongPress = vi.fn();
    render(<Harness onLongPress={onLongPress} />);
    const surface = screen.getByTestId('surface');

    fireEvent.pointerDown(surface, { button: 0, clientX: 8, clientY: 8 });
    vi.advanceTimersByTime(600);
    expect(onLongPress).not.toHaveBeenCalled();

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    fireEvent.pointerDown(screen.getByRole('button', { name: '按钮' }), { button: 0, clientX: 4, clientY: 4 });
    vi.advanceTimersByTime(600);
    expect(onLongPress).not.toHaveBeenCalled();

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: original });
    vi.useRealTimers();
  });
});
