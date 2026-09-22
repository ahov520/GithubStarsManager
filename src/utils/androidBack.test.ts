import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleAndroidBack } from './androidBack';

const state = {
  isAuthenticated: true,
  similarView: null as { active: boolean } | null,
  currentView: 'repositories' as string,
  searchFilters: {
    query: '',
    tags: [] as string[],
    languages: [] as string[],
    platforms: [] as string[],
    licenses: [] as string[],
    sortBy: 'stars',
    sortOrder: 'desc',
  },
  exitSimilarView: vi.fn(),
  setSearchFilters: vi.fn(),
  setCurrentView: vi.fn(),
};

vi.mock('../store/useAppStore', () => ({
  useAppStore: { getState: () => state },
}));

describe('handleAndroidBack', () => {
  beforeEach(() => {
    state.isAuthenticated = true;
    state.similarView = null;
    state.currentView = 'repositories';
    state.searchFilters = {
      query: '',
      tags: [],
      languages: [],
      platforms: [],
      licenses: [],
      sortBy: 'stars',
      sortOrder: 'desc',
    };
    state.exitSimilarView.mockReset();
    state.setSearchFilters.mockReset();
    state.setCurrentView.mockReset();
    document.body.innerHTML = '';
  });

  it('closes an open dialog before leaving the page', () => {
    document.body.innerHTML = '<div data-state="open" role="dialog" id="sheet"></div>';
    expect(handleAndroidBack()).toBe('handled');
    expect(state.setCurrentView).not.toHaveBeenCalled();
  });

  it('exits when the same dialog is still open on the next back press', () => {
    document.body.innerHTML = '<div data-state="open" role="dialog" id="sheet"></div>';
    expect(handleAndroidBack()).toBe('handled');
    expect(handleAndroidBack()).toBe('exit');
  });

  it('returns to the repository list from another page', () => {
    state.currentView = 'gists';
    expect(handleAndroidBack()).toBe('handled');
    expect(state.setCurrentView).toHaveBeenCalledWith('repositories');
  });

  it('clears repository search before exiting', () => {
    state.searchFilters = { ...state.searchFilters, query: 'android' };
    expect(handleAndroidBack()).toBe('handled');
    expect(state.setSearchFilters).toHaveBeenCalled();
    expect(state.setCurrentView).not.toHaveBeenCalled();
  });

  it('leaves the app from the repository list', () => {
    expect(handleAndroidBack()).toBe('exit');
  });
});
