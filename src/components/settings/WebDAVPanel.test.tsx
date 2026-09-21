import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WebDAVPanel } from './WebDAVPanel';

vi.mock('../../store/useAppStore', () => {
  const state = {
    webdavConfigs: [{
      id: 'nut',
      name: '坚果云',
      url: 'https://dav.example.com/dav/very/long/path',
      username: 'me',
      password: 'secret',
      path: '/github-stars-manager/',
    }],
    activeWebDAVConfig: 'nut',
    deleteWebDAVConfig: vi.fn(),
    setActiveWebDAVConfig: vi.fn(),
  };
  return {
    useAppStore: (selector?: (value: typeof state) => unknown) => (selector ? selector(state) : state),
  };
});

vi.mock('../../hooks/useDialog', () => ({
  useDialog: () => ({ confirm: vi.fn(), toast: vi.fn() }),
}));

vi.mock('../../features/settings/hooks/useWebDAVActions', () => ({
  useWebDAVActions: () => ({ testingId: null, save: vi.fn(), test: vi.fn() }),
}));

describe('WebDAVPanel on a phone', () => {
  it('keeps configuration actions at 44px and opens a tall form', async () => {
    render(<WebDAVPanel t={(zh) => zh} />);

    const remove = screen.getByRole('button', { name: '删除' });
    expect(remove.className).toContain('h-11');
    expect(remove.parentElement?.className).toContain('self-end');
    expect(screen.getByRole('button', { name: '添加WebDAV' }).className).toContain('h-11');

    await userEvent.click(screen.getByRole('button', { name: '添加WebDAV' }));

    expect(document.getElementById('webdav-name')?.className).toContain('h-11');
    expect(screen.getByRole('button', { name: '保存' }).className).toContain('h-11');
    expect(screen.getByRole('button', { name: '取消' }).className).toContain('h-11');
  });
});
