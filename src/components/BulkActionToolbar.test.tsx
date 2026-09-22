import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BulkActionToolbar } from './BulkActionToolbar';

vi.mock('../store/useAppStore', () => {
  const state = { language: 'zh' };
  return {
    useAppStore: (selector?: (value: typeof state) => unknown) => (selector ? selector(state) : state),
  };
});

vi.mock('../plugins/hooks/usePluginActions', () => ({
  usePluginActions: () => ({ actions: [] }),
}));

vi.mock('../plugins/hooks/usePluginExporters', () => ({
  usePluginExporters: () => ({ exporters: [] }),
}));

describe('BulkActionToolbar on a phone', () => {
  it('shows a labeled close action that wraps with the other actions', () => {
    render(
      <BulkActionToolbar
        selectedCount={2}
        repositories={[]}
        onSelectAll={vi.fn()}
        onDeselectAll={vi.fn()}
        onBulkAction={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const close = screen.getByRole('button', { name: '关闭工具栏' });
    expect(close.className).toContain('w-auto');
    expect(close.parentElement?.className).toContain('flex-wrap');
    expect(screen.getByText('关闭')).toBeTruthy();
    expect(screen.getByText('退订')).toBeTruthy();
  });
});
