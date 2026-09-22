import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from './ui/tooltip';

vi.mock('../store/useAppStore', () => {
  const state = {
    user: { login: 'me', name: 'Me', avatar_url: 'https://github.com/github.png' },
    theme: 'light',
    currentView: 'releases',
    headerMenuConfig: [
      { id: 'repositories', visible: true, order: 0 },
      { id: 'releases', visible: true, order: 1 },
    ],
    setTheme: vi.fn(),
    setCurrentView: vi.fn(),
    logout: vi.fn(),
    language: 'zh',
  };
  return {
    useAppStore: (selector?: (value: typeof state) => unknown) => (selector ? selector(state) : state),
  };
});

vi.mock('../hooks/useDialog', () => ({
  useDialog: () => ({ confirm: vi.fn() }),
}));

import { Header } from './Header';

describe('Header on a phone', () => {
  it('names the current page and leaves page switching to the bottom nav', () => {
    render(
      <TooltipProvider>
        <Header />
      </TooltipProvider>
    );

    expect(screen.getByRole('heading', { name: '发布' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '菜单' })).toBeNull();
    expect(screen.getByRole('button', { name: '切换主题' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '退出登录' })).toBeTruthy();
  });
});
