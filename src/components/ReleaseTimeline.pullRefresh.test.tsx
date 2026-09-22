import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReleaseTimeline } from './ReleaseTimeline';
import { defaultReleaseSourceSettings } from '../types';

const harness = vi.hoisted(() => ({
  handleRefresh: vi.fn(),
  onRefresh: undefined as undefined | (() => void),
}));

vi.mock('../hooks/usePullToRefresh', () => ({
  usePullToRefresh: (options: { onRefresh: () => void }) => {
    harness.onRefresh = options.onRefresh;
    return { distance: 100, refreshing: false };
  },
}));

vi.mock('../store/useAppStore', () => ({
  useAppStore: Object.assign(vi.fn(), {
    getState: () => ({ readReleases: new Set<number>() }),
  }),
}));

vi.mock('./ReleaseSourceSettingsModal', () => ({
  ReleaseSourceSettingsModal: () => null,
}));

vi.mock('../features/releases/hooks/useReleaseTimelineActions', () => ({
  useReleaseTimelineActions: () => ({
    releases: [],
    repositories: [],
    releaseSubscriptions: new Set<number>(),
    releaseSourceSettings: defaultReleaseSourceSettings,
    readReleases: new Set<number>(),
    language: 'zh' as const,
    assetFilters: [],
    markReleaseAsRead: vi.fn(),
    markAssetAsRead: vi.fn(),
    releaseViewMode: 'list' as const,
    releaseSelectedFilters: [],
    releaseSearchQuery: '',
    releaseExpandedRepositories: new Set<number>(),
    releaseIsRefreshing: false,
    setReleaseViewMode: vi.fn(),
    toggleReleaseSelectedFilter: vi.fn(),
    clearReleaseSelectedFilters: vi.fn(),
    setReleaseSearchQuery: vi.fn(),
    toggleReleaseExpandedRepository: vi.fn(),
    includePreRelease: false,
    setIncludePreRelease: vi.fn(),
    releaseShowMode: 'all' as const,
    setReleaseShowMode: vi.fn(),
    releaseLatestMode: 'all' as const,
    setReleaseLatestMode: vi.fn(),
    lastRefreshTime: null,
    isMarkingAllRead: false,
    handleRefresh: harness.handleRefresh,
    handleMarkAllRead: vi.fn(),
    handleUnsubscribeRelease: vi.fn(),
  }),
}));

describe('ReleaseTimeline phone refresh', () => {
  it('refreshes releases from the phone pull hint', () => {
    render(<ReleaseTimeline />);

    const hint = screen.getByRole('status');
    expect(hint).toHaveTextContent('松开刷新');
    expect(hint.className).toContain('md:hidden');
    harness.onRefresh?.();
    expect(harness.handleRefresh).toHaveBeenCalledTimes(1);
  });
});
