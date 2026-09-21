import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CategoryPanel } from './CategoryPanel';

vi.mock('../../store/useAppStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../store/useAppStore')>();
  const state = {
    customCategories: [{ id: 'mine', name: '我的项目', icon: '📁', keywords: ['app'], isCustom: true }],
    hiddenDefaultCategoryIds: [],
    defaultCategoryOverrides: {},
    categoryOrder: [],
    collapsedSidebarCategoryCount: 8,
    categoryMatchMode: 'effective',
    language: 'zh',
    addCustomCategory: vi.fn(),
    deleteCustomCategory: vi.fn(),
    updateCustomCategory: vi.fn(),
    updateDefaultCategory: vi.fn(),
    resetDefaultCategory: vi.fn(),
    resetDefaultCategoryNameIcon: vi.fn(),
    resetDefaultCategoryKeywords: vi.fn(),
    hideDefaultCategory: vi.fn(),
    showDefaultCategory: vi.fn(),
    setCategoryOrder: vi.fn(),
    setCollapsedSidebarCategoryCount: vi.fn(),
    setCategoryMatchMode: vi.fn(),
  };
  return {
    ...actual,
    useAppStore: (selector?: (value: typeof state) => unknown) => (selector ? selector(state) : state),
  };
});

vi.mock('../../hooks/useDialog', () => ({
  useDialog: () => ({ toast: vi.fn(), confirm: vi.fn() }),
}));

describe('CategoryPanel on a phone', () => {
  it('opens a category editor with 44px save and cancel actions', async () => {
    render(<CategoryPanel t={(zh) => zh} />);

    const editButtons = screen.getAllByRole('button', { name: '编辑' });
    expect(editButtons[0].className).toContain('h-11');
    expect(screen.getByRole('button', { name: '添加分类' }).className).toContain('h-11');

    await userEvent.click(editButtons[0]);

    expect(screen.getByLabelText('编辑分类名称')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存' }).className).toContain('h-11');
    expect(screen.getByRole('button', { name: '取消' }).className).toContain('h-11');
  });
});
