import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GistView } from './GistView';

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
    expect(screen.getByRole('button', { name: /全部gist/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新建' })).toBeInTheDocument();
  });
});
