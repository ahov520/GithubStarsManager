import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AssetFilterManager } from './AssetFilterManager';

const state = {
  assetFilters: [
    { id: 'custom-long', name: '很长的自定义安装包过滤器', keywords: ['apk', 'aab'], isPreset: false },
  ],
  addAssetFilter: vi.fn(),
  updateAssetFilter: vi.fn(),
  deleteAssetFilter: vi.fn(),
  language: 'zh' as const,
};

vi.mock('../store/useAppStore', () => ({
  useAppStore: (selector: (value: typeof state) => unknown) => selector(state),
}));

vi.mock('../hooks/useDialog', () => ({
  useDialog: () => ({ confirm: vi.fn() }),
}));

describe('AssetFilterManager', () => {
  it('lets a long custom filter name size to its text', async () => {
    const user = userEvent.setup();
    render(
      <AssetFilterManager
        selectedFilters={[]}
        onFilterToggle={vi.fn()}
        onClearFilters={vi.fn()}
      />,
    );

    const createFilter = screen.getByRole('button', { name: '新建过滤器' });
    expect(createFilter.className).toContain('touch-target-44');
    expect(createFilter.textContent).toContain('新建');

    await user.click(screen.getByRole('button', { name: '过滤器' }));
    const chip = screen.getByRole('button', { name: '很长的自定义安装包过滤器 (apk, aab)' });
    expect(chip).toHaveClass('min-h-11', 'w-auto', 'max-w-full', 'whitespace-normal');
    expect(chip.className).not.toMatch(/(^|\s)flex-1(\s|$)/);
  });
});
