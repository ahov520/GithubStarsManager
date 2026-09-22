import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UpdateNotificationBanner } from './UpdateNotificationBanner';
import { TooltipProvider } from './ui/tooltip';

vi.mock('../store/useAppStore', () => ({
  useAppStore: (selector?: (state: {
    updateNotification: {
      version: string;
      downloadUrl: string;
      releaseDate: string;
      changelog: string[];
      dismissed: boolean;
    };
    dismissUpdateNotification: () => void;
    language: 'zh';
  }) => unknown) => {
    const state = {
      updateNotification: {
        version: '0.9.0',
        downloadUrl: 'https://example.com/app.apk',
        releaseDate: '2026-09-22T00:00:00.000Z',
        changelog: ['安卓安装包'],
        dismissed: false,
      },
      dismissUpdateNotification: vi.fn(),
      language: 'zh' as const,
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock('../features/settings/hooks/useUpdateActions', () => ({
  useUpdateActions: () => ({ openDownloadUrl: vi.fn(), checkForUpdates: vi.fn() }),
}));

describe('UpdateNotificationBanner on a phone', () => {
  it('keeps download and dismiss at 44px', () => {
    render(
      <TooltipProvider>
        <UpdateNotificationBanner />
      </TooltipProvider>,
    );

    expect(screen.getByRole('button', { name: '立即下载' }).className).toContain('h-11');
    expect(screen.getByRole('button', { name: '关闭' }).className).toContain('h-11');
    expect(screen.getByRole('button', { name: '关闭' }).className).toContain('w-11');
  });
});
