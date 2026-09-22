import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GistEditorModal } from './GistEditorModal';

vi.mock('../store/useAppStore', () => ({
  useAppStore: (selector: (value: { language: 'zh' }) => unknown) => selector({ language: 'zh' }),
}));

describe('GistEditorModal', () => {
  it('keeps the new gist form at 44px on a phone', () => {
    render(<GistEditorModal gist={null} isOpen onClose={vi.fn()} onSubmit={vi.fn()} />);

    expect(document.querySelector('.mobile-fullscreen-dialog')).toBeTruthy();
    expect(screen.getByPlaceholderText('这个 gist 是做什么的？')).toHaveClass('h-11');
    expect(screen.getByRole('checkbox', { name: '公开 Gist' })).toHaveClass('after:-inset-3');
    expect(screen.getByText('公开 Gist').closest('label')).toHaveClass('min-h-11');
    expect(screen.getByRole('button', { name: '添加文件' })).toHaveClass('h-11');
    expect(screen.getByRole('textbox', { name: '文件名 1' })).toHaveClass('h-11');
    expect(screen.getByRole('button', { name: '删除文件' })).toHaveClass('h-11', 'w-11');
    expect(screen.getByRole('button', { name: '取消' })).toHaveClass('h-11', 'w-full');
    expect(screen.getByRole('button', { name: '保存' })).toHaveClass('h-11', 'w-full');
  });
});
