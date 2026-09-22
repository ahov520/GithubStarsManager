import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BulkCategorizeModal } from './BulkCategorizeModal';
import { BulkRestoreModal } from './BulkRestoreModal';
import type { Repository } from '../types';

vi.mock('../store/useAppStore', () => {
  const state = {
    customCategories: [],
    hiddenDefaultCategoryIds: [],
    defaultCategoryOverrides: {},
    language: 'zh',
  };
  return {
    useAppStore: (selector?: (value: typeof state) => unknown) => (selector ? selector(state) : state),
    getAllCategories: () => [
      { id: 'all', name: '全部分类', icon: '📁', keywords: [] },
      { id: 'web', name: 'organization-category-with-a-very-long-name', icon: '🌐', keywords: [] },
    ],
  };
});

const repo = { id: 1, full_name: 'me/gsm' } as Repository;

describe('bulk modals on a phone', () => {
  it('stacks categorize actions on a full-width row', () => {
    render(
      <BulkCategorizeModal isOpen onClose={vi.fn()} repositories={[repo]} onCategorize={vi.fn()} />
    );
    const cancel = screen.getByRole('button', { name: '取消' });
    const confirm = screen.getByRole('button', { name: '确认分类' });
    expect(cancel.className).toContain('h-11');
    expect(cancel.className).toContain('w-full');
    expect(confirm.className).toContain('h-11');
    expect(confirm.className).toContain('w-full');
    expect(screen.getByText('organization-category-with-a-very-long-name').className).toContain('break-words');
  });

  it('stacks restore actions on a full-width row', () => {
    render(
      <BulkRestoreModal isOpen onClose={vi.fn()} repositories={[]} onRestore={vi.fn()} />
    );
    const cancel = screen.getByRole('button', { name: '取消' });
    const confirm = screen.getByRole('button', { name: '确认还原' });
    expect(cancel.className).toContain('h-11');
    expect(cancel.className).toContain('w-full');
    expect(confirm.className).toContain('h-11');
    expect(confirm.className).toContain('w-full');
  });
});
