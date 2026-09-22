import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TelegramSettingsModal } from './TelegramSettingsModal';

vi.mock('../store/useAppStore', () => {
  const state = {
    language: 'zh',
    telegramFollows: [{ channel: 'a-very-long-telegram-channel-name' }],
    addTelegramFollow: vi.fn(),
    removeTelegramFollow: vi.fn(),
  };
  return {
    useAppStore: (selector: (value: typeof state) => unknown) => selector(state),
  };
});

vi.mock('../hooks/useDialog', () => ({
  useDialog: () => ({ toast: vi.fn() }),
}));

vi.mock('../features/discovery/hooks/useTelegramProbe', () => ({
  useTelegramProbe: () => ({ probe: vi.fn(), isProbing: false, message: '', probeOk: false }),
}));

describe('TelegramSettingsModal on a phone', () => {
  it('gives follow actions a 44px target and wraps a long channel name', () => {
    render(<TelegramSettingsModal isOpen onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: '测试连接' }).className).toContain('h-11');
    expect(screen.getByRole('button', { name: '测试连接' }).className).toContain('w-full');
    expect(screen.getByRole('button', { name: '添加' }).className).toContain('h-11');
    const unfollow = screen.getByRole('button', { name: '取消关注 @a-very-long-telegram-channel-name' });
    expect(unfollow.className).toContain('h-11');
    expect(unfollow.className).toContain('w-11');
    expect(screen.getByRole('button', { name: '完成' }).className).toContain('w-full');
    expect(screen.getByText('@a-very-long-telegram-channel-name').className).toContain('break-all');
  });
});
