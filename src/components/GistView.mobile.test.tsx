import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GistView } from './GistView';

const harness = vi.hoisted(() => ({
  pull: { distance: 0, refreshing: false },
  onRefresh: undefined as undefined | (() => void),
}));

vi.mock('../hooks/usePullToRefresh', () => ({
  usePullToRefresh: (options: { onRefresh: () => void }) => {
    harness.onRefresh = options.onRefresh;
    return harness.pull;
  },
}));

const actions = {
  user: { login: 'me' },
  gists: [],
  starredGists: [],
  gistSearchFilters: { query: '', sortBy: 'updated' as const, sortOrder: 'desc' as const },
  gistSearchResults: [],
  selectedGistCategory: 'all' as const,
  language: 'zh' as const,
  setGistSearchFilters: vi.fn(),
  setGistSearchResults: vi.fn(),
  setSelectedGistCategory: vi.fn(),
  setStarredGists: vi.fn(),
  isRefreshing: false,
  isSearching: false,
  isAnalyzingAll: false,
  refreshGists: vi.fn(),
  aiSearch: vi.fn(),
  analyzeVisibleGists: vi.fn(),
  fetchGistDetail: vi.fn(),
  submitGist: vi.fn(),
};

vi.mock('../features/gists/hooks/useGistActions', () => ({
  useGistActions: () => actions,
}));

vi.mock('../store/useAppStore', () => ({
  useAppStore: Object.assign(() => ({ language: 'zh' }), { getState: () => ({ starredGists: [] }) }),
}));

vi.mock('./GistDetailModal', () => ({ GistDetailModal: () => null }));
vi.mock('./GistEditorModal', () => ({ GistEditorModal: () => null }));

describe('GistView mobile', () => {
  it('opens the gist permission note from a button instead of hover', () => {
    render(<GistView />);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Gist 权限说明' }));
    expect(screen.getByRole('note')).toHaveTextContent('访问 Gist 需要 gist 权限');
    const allGists = screen.getByRole('button', { name: /全部gist/ });
    expect(allGists).toBeInTheDocument();
    expect(allGists.parentElement).toHaveClass('flex-wrap');
    expect(allGists.parentElement?.className).not.toContain('overflow-x-auto');
    expect(screen.getByRole('button', { name: '新建' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '搜索 gist、文件名或摘要' })).toHaveClass('h-11');
    expect(screen.getByRole('combobox', { name: 'Gist 排序方式' })).toHaveClass('w-full');
  });

  it('syncs gists from the phone pull hint', () => {
    harness.pull = { distance: 100, refreshing: false };
    render(<GistView />);

    const hint = screen.getByRole('status');
    expect(hint).toHaveTextContent('松开同步');
    expect(hint.className).toContain('md:hidden');
    harness.onRefresh?.();
    expect(actions.refreshGists).toHaveBeenCalledTimes(1);
  });
});
