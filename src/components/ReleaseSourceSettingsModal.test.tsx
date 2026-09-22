import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReleaseSourceSettingsModal } from './ReleaseSourceSettingsModal';
import type { CustomReleaseRepository } from '../types';

const repos: CustomReleaseRepository[] = Array.from({ length: 9 }, (_, index) => ({
  id: index + 1,
  name: `repo-${index + 1}`,
  full_name: `owner/repo-${index + 1}`,
  html_url: `https://github.com/owner/repo-${index + 1}`,
  owner: { login: 'owner', avatar_url: 'https://example.com/a.png' },
}));

const state = {
  language: 'zh' as const,
  githubToken: 'token',
  releaseSubscriptions: new Set<string>(),
  releaseSourceSettings: {
    enabledSourceIds: ['starred-release-subscription', 'custom-release'],
    watchCustomReleaseRepos: [],
    customReleaseRepos: repos,
  },
  toggleReleaseSource: vi.fn(),
  addReleaseSourceRepository: vi.fn(),
  removeReleaseSourceRepository: vi.fn(),
  updateReleaseSourceRepository: vi.fn(),
};

vi.mock('../store/useAppStore', () => ({
  useAppStore: (selector: (value: typeof state) => unknown) => selector(state),
}));

vi.mock('../hooks/useDialog', () => ({
  useDialog: () => ({ toast: vi.fn(), confirm: vi.fn() }),
}));

describe('ReleaseSourceSettingsModal', () => {
  it('keeps add, remove, and paging controls at 44px', () => {
    render(<ReleaseSourceSettingsModal isOpen onClose={vi.fn()} />);

    expect(screen.getByRole('textbox', { name: '仓库名称' })).toHaveClass('h-11');
    expect(screen.getByRole('button', { name: '添加' })).toHaveClass('h-11');
    expect(screen.getAllByRole('button', { name: '移除仓库' })[0]).toHaveClass('h-11');
    expect(screen.getByRole('button', { name: '下一页' })).toHaveClass('h-11');
    expect(screen.getByRole('button', { name: '完成' })).toHaveClass('h-11');
    expect(document.querySelector('.mobile-fullscreen-dialog')).toBeTruthy();
  });
});
