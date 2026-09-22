import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { DiscoveryView } from './DiscoveryView';

beforeAll(() => {
  if (typeof HTMLElement.prototype.scrollTo !== 'function') {
    HTMLElement.prototype.scrollTo = () => undefined;
  }
});

const harness = vi.hoisted(() => ({
  channel: 'trending' as 'trending' | 'code-search',
  pull: { distance: 100, refreshing: false },
  pullOptions: [] as Array<{ enabled?: boolean }>,
}));

vi.mock('../store/useAppStore', () => {
  const useAppStore = vi.fn((selector?: (state: { language: string; readmeModalOpen: boolean }) => unknown) => {
    const state = { language: 'zh', readmeModalOpen: false };
    return selector ? selector(state) : state;
  });
  Object.assign(useAppStore, {
    getState: () => ({
      discoveryRepos: { trending: [{ id: 1 }] },
      discoveryIsLoading: { trending: false },
    }),
  });
  return { useAppStore };
});

vi.mock('../hooks/usePullToRefresh', () => ({
  usePullToRefresh: (options: { enabled?: boolean }) => {
    harness.pullOptions.push(options);
    return harness.pull;
  },
}));

vi.mock('../features/discovery/hooks/useDiscoveryActions', () => ({
  useDiscoveryActions: () => ({
    githubToken: 'token',
    language: 'zh',
    discoveryChannels: [{
      id: 'trending',
      name: '趋势',
      nameEn: 'Trending',
      icon: 'trending',
      description: '趋势',
      enabled: true,
    }, {
      id: 'code-search',
      name: '代码搜索',
      nameEn: 'Code Search',
      icon: 'search',
      description: '代码',
      enabled: true,
    }],
    discoveryRepos: { trending: [], 'code-search': [] },
    discoveryLastRefresh: { trending: new Date().toISOString(), 'code-search': null },
    discoveryIsLoading: { trending: false, 'code-search': false },
    discoveryIsLoadingMore: {},
    discoveryLoadMoreError: {},
    selectedDiscoveryChannel: harness.channel,
    setSelectedDiscoveryChannel: vi.fn(),
    setDiscoveryScrollPosition: vi.fn(),
    analysisProgress: { current: 0, total: 0 },
    discoveryPlatform: 'All',
    setDiscoveryPlatform: vi.fn(),
    discoveryLanguage: 'All',
    setDiscoveryLanguage: vi.fn(),
    discoverySortBy: 'stars',
    setDiscoverySortBy: vi.fn(),
    discoverySortOrder: 'desc',
    setDiscoverySortOrder: vi.fn(),
    discoverySearchQuery: '',
    setDiscoverySearchQuery: vi.fn(),
    discoverySelectedTopic: null,
    setDiscoverySelectedTopic: vi.fn(),
    discoveryHasMore: { trending: false },
    discoveryNextPage: { trending: 1 },
    discoveryTotalCount: { trending: 0 },
    trendingTimeRange: 'daily',
    setTrendingTimeRange: vi.fn(),
    weeklyOnlyCollected: false,
    setWeeklyOnlyCollected: vi.fn(),
    weeklySyncStatus: null,
    xTweetFollows: [],
    xTweetAuth: null,
    xTweetAuthRevision: 0,
    xTweetSyncStatus: null,
    telegramFollows: [],
    telegramSyncStatus: null,
    t: (zh: string) => zh,
    isAnalyzing: false,
    refreshChannel: vi.fn(),
    handleAnalyzePage: vi.fn(),
    handleAbortAnalysis: vi.fn(),
  }),
}));

vi.mock('./CodeSearchView', () => ({
  CodeSearchView: () => <div>code-search-view</div>,
}));

vi.mock('./XTweetSettingsModal', () => ({
  XTweetSettingsModal: () => null,
}));

vi.mock('./TelegramSettingsModal', () => ({
  TelegramSettingsModal: () => null,
}));

describe('DiscoveryView phone refresh', () => {
  it('shows a pull-to-refresh hint and the selected platform on a phone', () => {
    harness.channel = 'trending';
    harness.pull = { distance: 100, refreshing: false };
    harness.pullOptions.length = 0;

    render(<DiscoveryView />);

    const analyze = screen.getByRole('button', { name: 'AI分析' });
    expect(analyze.className).toContain('h-11');
    expect(analyze.textContent).toContain('分析');

    const hint = screen.getByRole('status');
    expect(hint).toHaveTextContent('松开刷新');
    expect(hint.className).toContain('md:hidden');
    expect(screen.getByText(/更新于/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '平台筛选：全部平台' })).toHaveTextContent('全部平台');
    expect(harness.pullOptions.at(-1)?.enabled).toBe(true);
  });

  it('does not pull-refresh the code search channel', () => {
    harness.channel = 'code-search';
    harness.pull = { distance: 100, refreshing: false };
    harness.pullOptions.length = 0;

    render(<DiscoveryView />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(harness.pullOptions.at(-1)?.enabled).toBe(false);
  });
});
