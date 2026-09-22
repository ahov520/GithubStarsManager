import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FilterModal } from './FilterModal';

describe('FilterModal', () => {
  it('keeps the create form at 44px on a phone', async () => {
    const user = userEvent.setup();
    render(<FilterModal isOpen onClose={vi.fn()} onSave={vi.fn()} />);

    expect(document.querySelector('.mobile-fullscreen-dialog')).toBeTruthy();
    expect(screen.getByPlaceholderText('例如: macOS')).toHaveClass('h-11');
    expect(screen.getByPlaceholderText('输入关键词，如: mac, dmg')).toHaveClass('h-11', 'w-full');
    expect(screen.getByRole('button', { name: '添加' })).toHaveClass('h-11', 'w-full');
    expect(screen.getByRole('button', { name: '取消' })).toHaveClass('h-11', 'w-full');
    expect(screen.getByRole('button', { name: '创建' })).toHaveClass('h-11', 'w-full');
    expect(screen.getByRole('button', { name: 'Close' })).toHaveClass('h-11', 'w-11');

    await user.type(screen.getByPlaceholderText('输入关键词，如: mac, dmg'), 'apk');
    await user.click(screen.getByRole('button', { name: '添加' }));

    expect(screen.getByRole('button', { name: '删除关键词 apk' })).toHaveClass('h-11', 'w-11');
  });
});
