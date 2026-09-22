import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateNotificationBanner } from './UpdateNotificationBanner';
import { TooltipProvider } from './ui/tooltip';

const bannerState = vi.hoisted(() => ({
  changelog: ['安卓安装包'] as string[],
}));

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
        changelog: bannerState.changelog,
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
  beforeEach(() => {
    bannerState.changelog = ['安卓安装包'];
  });

  it('keeps download and dismiss at 44px', () => {
    render(
      <TooltipProvider>
        <UpdateNotificationBanner />
      </TooltipProvider>,
    );

    expect(screen.getByRole('button', { name: '立即下载' }).className).toContain('h-11');
    expect(screen.getByRole('button', { name: '关闭' }).className).toContain('h-11');
    expect(screen.getByRole('button', { name: '关闭' }).className).toContain('w-11');
    expect(screen.queryByRole('button', { name: '展开说明' })).not.toBeInTheDocument();
  });

  it('expands the full changelog from a tap', async () => {
    const user = userEvent.setup();
    bannerState.changelog = [
      '第一项：安卓安装包改为在手机上直接下载',
      '第二项：仓库描述可以就地展开',
      '第三项：分析失败的原因不再只靠悬停',
    ];
    render(
      <TooltipProvider>
        <UpdateNotificationBanner />
      </TooltipProvider>,
    );
    const toggle = screen.getByRole('button', { name: '展开说明' });
    expect(toggle.className).toContain('h-11');
    expect(screen.queryByText('第三项：分析失败的原因不再只靠悬停')).not.toBeInTheDocument();
    await user.click(toggle);
    expect(screen.getByText('第三项：分析失败的原因不再只靠悬停').className).toContain('break-words');
    expect(screen.getByRole('button', { name: '收起说明' })).toHaveAttribute('aria-expanded', 'true');
  });
});
