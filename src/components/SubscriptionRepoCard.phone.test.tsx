import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SubscriptionRepoCard } from './SubscriptionRepoCard';
import { TooltipProvider } from './ui/tooltip';
import type { DiscoveryRepo } from '../types';

const actions = vi.hoisted(() => ({
  analyze: vi.fn(),
  star: vi.fn(),
  executeUnstar: vi.fn(),
  isStarred: false,
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
    isStarred: actions.isStarred,
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
  beforeEach(() => {
    actions.isStarred = false;
  });

  it('expands a long discovery description without opening a popover', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: String(query).includes('max-width'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    const description = '这是一段在发现卡片里放不下的仓库介绍，需要在手机上就地展开后半段，而不是弹出一个容易被顶栏挡住的浮层。';
    try {
      render(<TooltipProvider><SubscriptionRepoCard repo={{ ...repo, description }} /></TooltipProvider>);
      const toggle = screen.getByRole('button', { name: '展开描述' });
      expect(toggle.className).toContain('h-11');
      expect(screen.getByText(description).className).toContain('line-clamp-2');
      fireEvent.click(toggle);
      expect(screen.getByText(description).className).not.toContain('line-clamp-2');
      expect(screen.getByRole('button', { name: '收起描述' })).toHaveAttribute('aria-expanded', 'true');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('opens labeled discovery actions from the phone sheet', () => {
    render(<TooltipProvider><SubscriptionRepoCard repo={repo} /></TooltipProvider>);
    expect(screen.getByText('octocat/demo').className).toContain('break-words');

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

  it('gives the unstar confirmation full-width phone buttons', () => {
    actions.isStarred = true;
    const fullName = 'organization-with-a-very-long-login/super-long-mobile-repository-name';
    render(<TooltipProvider><SubscriptionRepoCard repo={{ ...repo, full_name: fullName, name: 'super-long-mobile-repository-name' }} /></TooltipProvider>);
    fireEvent.click(screen.getByRole('button', { name: '发现操作' }));
    fireEvent.click(screen.getAllByRole('button', { name: '取消Star' }).find((node) => node.className.includes('w-full'))!);

    const cancel = screen.getByRole('button', { name: '取消' });
    const confirm = screen.getByRole('button', { name: '确认取消' });
    expect(cancel.className).toContain('h-11');
    expect(cancel.className).toContain('w-full');
    expect(confirm.className).toContain('h-11');
    expect(confirm.className).toContain('w-full');
    const message = screen.getAllByText(new RegExp(fullName)).find((node) => node.tagName === 'P');
    expect(message?.className).toContain('break-words');
  });
});
