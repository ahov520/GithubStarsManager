import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../../services/logger';
import { DiagnosticLogsPanel } from './DiagnosticLogsPanel';

vi.mock('../../store/useAppStore', () => {
  const state = { language: 'zh' };
  const useAppStore = (selector?: (value: typeof state) => unknown) => (selector ? selector(state) : state);
  useAppStore.getState = () => state;
  return { useAppStore };
});

describe('DiagnosticLogsPanel on a phone', () => {
  afterEach(() => {
    logger.clear();
    Reflect.deleteProperty(navigator, 'share');
  });

  it('uses 44px filters and can share an HTTP log', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    logger.info('api', '拉取星标', { method: 'GET', status: 200, url: 'https://api.github.com/user/starred' });

    render(<DiagnosticLogsPanel t={(zh) => zh} />);

    expect(screen.getByRole('button', { name: 'debug' }).className).toContain('h-11');
    expect(screen.getByRole('button', { name: '全部' }).className).toContain('h-11');
    expect(screen.getByRole('textbox', { name: '搜索日志模块或消息' }).className).toContain('h-11');

    await userEvent.click(screen.getByRole('button', { name: /查看 HTTP 详情/ }));
    await userEvent.click(screen.getByRole('button', { name: '分享日志' }));

    expect(share).toHaveBeenCalledWith(expect.objectContaining({
      title: '拉取星标',
      text: expect.stringContaining('拉取星标'),
    }));
    expect(document.querySelector('.mobile-fullscreen-dialog')).not.toBeNull();
    expect(screen.getByRole('button', { name: '关闭日志详情' }).className).toContain('h-11');
  });
});
