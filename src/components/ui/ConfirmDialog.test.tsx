import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog phone actions', () => {
  it('gives confirm and cancel a full-width phone target', () => {
    render(
      <ConfirmDialog
        isOpen
        title="退出登录确认"
        message="退出后仅清除登录凭证。"
        confirmText="退出登录"
        cancelText="取消"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const confirm = screen.getByRole('button', { name: '退出登录' });
    const cancel = screen.getByRole('button', { name: '取消' });
    expect(confirm.className).toContain('h-11');
    expect(confirm.className).toContain('w-full');
    expect(cancel.className).toContain('h-11');
    expect(cancel.className).toContain('w-full');
  });
});
