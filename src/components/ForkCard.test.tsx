import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ForkCard from './ForkCard';
import type { ForkRepo } from '../types';

vi.mock('../hooks/useDialog', () => ({
  useDialog: () => ({ toast: vi.fn() }),
}));

const fork: ForkRepo = {
  id: 1,
  name: 'demo',
  fork: true,
  full_name: 'me/demo',
  description: 'A fork',
  html_url: 'https://github.com/me/demo',
  stargazers_count: 1,
  forks_count: 0,
  forks: 0,
  language: 'TypeScript',
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-02T00:00:00Z',
  pushed_at: '2026-09-02T00:00:00Z',
  default_branch: 'main',
  owner: { login: 'me', avatar_url: 'https://example.com/a.png' },
  source: {
    id: 2,
    full_name: 'upstream/demo',
    name: 'demo',
    description: null,
    html_url: 'https://github.com/upstream/demo',
    stargazers_count: 10,
    forks_count: 1,
    updated_at: '2026-09-03T00:00:00Z',
    owner: { login: 'upstream', avatar_url: 'https://example.com/b.png' },
  },
};

describe('ForkCard phone actions', () => {
  it('updates the branch from a labeled phone sheet', () => {
    const onSyncUpstream = vi.fn();
    const onMarkAsRead = vi.fn();
    render(
      <ForkCard
        fork={fork}
        isUnread={false}
        isWorkflowsExpanded={false}
        onToggleWorkflows={vi.fn()}
        onSyncUpstream={onSyncUpstream}
        onMarkAsRead={onMarkAsRead}
        onRunWorkflow={vi.fn()}
        workflows={[]}
        isLoadingWorkflows={false}
        isSyncing={false}
        isRunningWorkflow={false}
        needsSync
        language="zh"
      />,
    );

    expect(screen.getByRole('heading', { name: 'demo' }).className).toContain('break-words');
    expect(screen.getByText('me/demo').className).toContain('break-all');
    expect(screen.getByRole('link', { name: 'upstream/demo' }).className).toContain('break-all');
    expect(screen.getByRole('button', { name: '显示工作流' }).className).toContain('h-11');
    fireEvent.click(screen.getByRole('button', { name: '复刻操作' }));
    const update = screen.getAllByRole('button', { name: '更新分支' }).find((node) => node.className.includes('w-full'));
    expect(update?.className).toContain('min-h-11');
    expect(screen.getAllByRole('link', { name: '在GitHub上查看' }).some((node) => node.className.includes('min-h-11'))).toBe(true);
    fireEvent.click(update!);
    expect(onSyncUpstream).toHaveBeenCalledOnce();
    expect(onMarkAsRead).toHaveBeenCalled();
  });
});
