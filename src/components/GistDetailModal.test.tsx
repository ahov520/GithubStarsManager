import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GistDetailModal } from './GistDetailModal';
import type { Gist } from '../types';

const toast = vi.fn();

vi.mock('../store/useAppStore', () => ({
  useAppStore: Object.assign(
    (selector: (state: { language: 'zh'; updateGist: () => void }) => unknown) =>
      selector({ language: 'zh', updateGist: vi.fn() }),
    { getState: () => ({ gists: [], starredGists: [], gistSearchResults: [] }) },
  ),
}));

vi.mock('../features/gists/hooks/useGistActions', () => ({
  useGistActions: () => ({ fetchGistFileRaw: vi.fn() }),
}));

vi.mock('../hooks/useDialog', () => ({
  useDialog: () => ({ toast }),
}));

const gist: Gist = {
  id: 'g1',
  description: '手机上的代码片段',
  public: true,
  html_url: 'https://gist.github.com/me/g1',
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-02T00:00:00Z',
  comments: 0,
  owner: { login: 'me', avatar_url: 'https://example.com/a.png' },
  files: {
    'note.ts': { filename: 'note.ts', type: 'text/plain', language: 'TypeScript', size: 12, content: 'const a = 1' },
  },
};

describe('GistDetailModal', () => {
  it('shares the gist and keeps actions at 44px', () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    render(<GistDetailModal gist={gist} isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '分享' }));
    expect(share).toHaveBeenCalledWith({
      title: gist.description,
      text: gist.description,
      url: gist.html_url,
    });
    expect(screen.getByRole('button', { name: '复制链接' })).toHaveClass('h-11');
    expect(screen.getByRole('link', { name: '打开' })).toHaveClass('h-11');
    expect(screen.getByRole('button', { name: 'note.ts' })).toHaveClass('min-h-11');
    expect(screen.getByRole('button', { name: '复制文件' })).toHaveClass('h-11');
    expect(screen.getByRole('button', { name: '查找' })).toHaveClass('h-11');
    delete (navigator as { share?: unknown }).share;
  });

  it('finds text in the gist file and steps between matches', async () => {
    const searchable: Gist = {
      ...gist,
      files: {
        'note.ts': {
          filename: 'note.ts',
          type: 'text/plain',
          language: 'TypeScript',
          size: 40,
          content: 'const token = 1\nconst token = 2',
        },
      },
    };
    render(<GistDetailModal gist={searchable} isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '查找' }));
    const input = await screen.findByRole('textbox', { name: '在 Gist 中查找' });
    expect(input.className).toContain('h-11');
    expect(screen.getByRole('button', { name: '下一处' }).className).toContain('h-11');
    fireEvent.change(input, { target: { value: 'token' } });
    await waitFor(() => {
      expect(document.querySelectorAll('mark[data-gist-find]')).toHaveLength(2);
    });
    expect(screen.getByText('1/2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '下一处' }));
    await waitFor(() => {
      const marks = [...document.querySelectorAll('mark[data-gist-find]')];
      expect(marks[1]?.getAttribute('data-current')).toBe('true');
    });
    expect(screen.getByText('2/2')).toBeInTheDocument();
  });
});
