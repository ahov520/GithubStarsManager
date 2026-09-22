import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CategoryEditModal } from './CategoryEditModal';

vi.mock('../store/useAppStore', async () => {
  const actual = await vi.importActual<typeof import('../store/useAppStore')>('../store/useAppStore');
  const state = {
    addCustomCategory: vi.fn(),
    updateCustomCategory: vi.fn(),
    updateDefaultCategory: vi.fn(),
    resetDefaultCategory: vi.fn(),
    resetDefaultCategoryNameIcon: vi.fn(),
    resetDefaultCategoryKeywords: vi.fn(),
    defaultCategoryOverrides: {},
    language: 'zh' as const,
    customCategories: [],
  };
  return {
    ...actual,
    useAppStore: (selector: (value: typeof state) => unknown) => selector(state),
  };
});

vi.mock('../hooks/useDialog', () => ({
  useDialog: () => ({ toast: vi.fn() }),
}));

describe('CategoryEditModal', () => {
  it('keeps the new category form tappable on a phone', () => {
    render(<CategoryEditModal isOpen onClose={vi.fn()} category={null} isCreating />);

    expect(document.querySelector('.mobile-fullscreen-dialog')).toBeTruthy();
    expect(screen.getByPlaceholderText('输入分类名称')).toHaveClass('h-11');
    expect(screen.getByPlaceholderText('用逗号分隔关键词')).toHaveClass('h-11');
    expect(document.querySelector('.grid')).toHaveClass('grid-cols-4');
    expect(screen.getByRole('button', { name: '😀' })).toHaveClass('h-11', 'w-full');
    expect(screen.getByRole('button', { name: '自定义emoji' })).toHaveClass('h-11');
    expect(screen.getByRole('button', { name: '取消' })).toHaveClass('h-11', 'w-full');
    expect(screen.getByRole('button', { name: '保存' })).toHaveClass('h-11', 'w-full');
  });
});
