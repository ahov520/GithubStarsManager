import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SubscriptionRepoCard } from './SubscriptionRepoCard';
import { TooltipProvider } from './ui/tooltip';
import type { DiscoveryRepo } from '../types';

const actions = vi.hoisted(() => ({
  analyze: vi.fn(),
  star: vi.fn(),
  executeUnstar: vi.fn(),
}));

vi.mock('../store/useAppStore', () => ({
  useAppStore: (selector: (state: { language: string; githubToken: string }) => unknown) =>
    selector({ language: 'zh', githubToken: 'token' }),
}));

vi.mock('../features/discovery/hooks/useDiscoveryRepoActions', () => ({
  useDiscoveryRepoActions: () => ({
    analyze: actions.analyze,
    star: actions.star,
    executeUnstar: actions.executeUnstar,
    isAnalyzing: false,
    isStarring: false,
    isStarred: false,
  }),
}));

vi.mock('./ReadmeModal', () => ({ ReadmeModal: () => null }));

const repo: DiscoveryRepo = {
  id: 7,
  name: 'demo',
  full_name: 'octocat/demo',
  description: 'a phone friendly repo',
  html_url: 'https://github.com/octocat/demo',
  stargazers_count: 10,
  forks_count: 1,
  forks: 1,
  language: 'TypeScript',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-02-01T00:00:00.000Z',
  pushed_at: '2026-02-02T00:00:00.000Z',
  owner: { login: 'octocat', avatar_url: 'https://github.com/octocat.png' },
  topics: [],
  rank: 1,
  channel: 'trending',
  platform: 'All',
};

describe('SubscriptionRepoCard phone actions', () => {
  it('opens labeled discovery actions from the phone sheet', () => {
    render(<TooltipProvider><SubscriptionRepoCard repo={repo} /></TooltipProvider>);

    fireEvent.click(screen.getByRole('button', { name: '发现操作' }));

    const analyze = screen.getAllByRole('button', { name: 'AI分析' }).find((node) => node.className.includes('w-full'));
    const zread = screen.getAllByRole('button', { name: '在ZRead打开' }).find((node) => node.className.includes('w-full'));
    const github = screen.getAllByRole('link', { name: '在GitHub打开' }).find((node) => node.className.includes('w-full'));
    const star = screen.getAllByRole('button', { name: '添加Star' }).find((node) => node.className.includes('w-full'));

    expect(analyze?.className).toContain('min-h-11');
    expect(zread.className).toContain('w-full');
    expect(github).toHaveAttribute('href', repo.html_url);
    expect(github.className).toContain('min-h-11');
    expect(star.className).toContain('min-h-11');
    const copyLink = screen.getByRole('button', { name: '复制链接' });
    const copyClone = screen.getByRole('button', { name: '复制克隆命令' });
    expect(copyLink.className).toContain('min-h-11');
    expect(copyClone.className).toContain('w-full');

    fireEvent.click(analyze!);
    expect(actions.analyze).toHaveBeenCalledTimes(1);
  });
});
