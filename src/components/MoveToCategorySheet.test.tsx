import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MoveToCategorySheet } from './MoveToCategorySheet';
import type { Repository } from '../types';

const mocks = vi.hoisted(() => ({
  updateRepository: vi.fn(),
  forceSyncToBackend: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('../store/useAppStore', () => ({
  useAppStore: (selector?: (state: { language: 'zh'; updateRepository: typeof mocks.updateRepository }) => unknown) => {
    const state = { language: 'zh' as const, updateRepository: mocks.updateRepository };
    return selector ? selector(state) : state;
  },
}));

vi.mock('../features/repositories/hooks/useCategorySyncActions', () => ({
  useCategorySyncActions: () => ({ forceSyncToBackend: mocks.forceSyncToBackend }),
}));

vi.mock('../hooks/useDialog', () => ({
  useDialog: () => ({ toast: mocks.toast, confirm: vi.fn() }),
}));

const repository = {
  id: 1,
  name: 'demo',
  full_name: 'owner/demo',
  description: '',
  html_url: 'https://github.com/owner/demo',
  stargazers_count: 1,
  forks_count: 0,
  forks: 0,
  language: 'Rust',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  pushed_at: '2026-01-01T00:00:00.000Z',
  owner: { login: 'owner', avatar_url: 'https://example.com/avatar.png' },
  topics: [],
  ai_tags: [],
} as Repository;

const categories = [
  { id: 'all', name: '全部分类', icon: '📁', keywords: [] },
  { id: 'tools', name: '工具', icon: '🔧', keywords: ['cli'] },
];

describe('MoveToCategorySheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.forceSyncToBackend.mockResolvedValue(undefined);
  });

  it('moves a repository into a category from a 44px row', async () => {
    render(
      <MoveToCategorySheet open onOpenChange={vi.fn()} repository={repository} categories={categories} />,
    );

    const tools = screen.getByRole('button', { name: '工具' });
    expect(tools.className).toContain('min-h-11');
    expect(tools.className).toContain('w-full');

    await userEvent.click(tools);

    expect(mocks.updateRepository).toHaveBeenCalledOnce();
    expect(mocks.updateRepository.mock.calls[0][0].custom_category).toBe('工具');
    expect(mocks.updateRepository.mock.calls[0][0].category_locked).toBe(true);
    expect(mocks.forceSyncToBackend).toHaveBeenCalledOnce();
  });
});