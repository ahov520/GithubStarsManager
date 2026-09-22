import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ForkTimeline } from './ForkTimeline';

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

vi.mock('../features/forks/hooks/useForkTimelineActions', () => ({
  useForkTimelineActions: () => ({
    readForks: new Set<number>(),
    language: 'zh' as const,
    markForkAsRead: vi.fn(),
    forkSearchQuery: '',
    forkIsRefreshing: false,
    setForkSearchQuery: vi.fn(),
    isLoadingOrganizations: false,
    personalOwnerLogin: 'me',
    activeForkOwner: 'me',
    ownerForks: [],
    forkOwnerOptions: [{ id: 'me', login: 'me', isPersonal: true }],
    lastRefreshTime: null,
    expandedWorkflows: new Set<number>(),
    workflowsMap: {},
    loadingWorkflows: new Set<number>(),
    syncingForks: new Set<number>(),
    runningWorkflows: new Set<number>(),
    needsSyncMap: {},
    syncModal: { isOpen: false, forkId: null, owner: '', repo: '', branch: 'main', full_name: '' },
    setSyncModal: vi.fn(),
    syncModalBranches: [],
    isFetchingBranches: false,
    t: (zh: string) => zh,
    handleRefresh: harness.handleRefresh,
    handleForkOwnerChange: vi.fn(),
    toggleWorkflows: vi.fn(),
    handleSyncUpstream: vi.fn(),
    confirmSyncUpstream: vi.fn(),
    handleRunWorkflow: vi.fn(),
  }),
}));

describe('ForkTimeline phone refresh', () => {
  it('refreshes forks from the phone pull hint', () => {
    render(<ForkTimeline />);

    const hint = screen.getByRole('status');
    expect(hint).toHaveTextContent('松开刷新');
    expect(hint.className).toContain('md:hidden');
    harness.onRefresh?.();
    expect(harness.handleRefresh).toHaveBeenCalledTimes(1);
  });
});
