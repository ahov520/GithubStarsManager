import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GistCard } from './GistCard';
import type { Gist } from '../types';

const toast = vi.fn();

vi.mock('../store/useAppStore', () => ({
  useAppStore: (selector: (state: { language: 'zh' }) => unknown) => selector({ language: 'zh' }),
}));

vi.mock('../features/gists/hooks/useGistActions', () => ({
  useGistActions: () => ({
    analyzeOne: vi.fn(),
    unstarGist: vi.fn(),
    deleteGist: vi.fn(),
    isAnalyzingGist: () => false,
    isMutating: false,
  }),
}));

vi.mock('../hooks/useDialog', () => ({
  useDialog: () => ({ toast }),
}));

const gist: Gist = {
  id: 'g1',
  description: '一条手机上的代码片段',
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

describe('GistCard share', () => {
  it('shares the gist url without opening the detail', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    const onOpen = vi.fn();
    render(<GistCard gist={gist} isMine={false} onOpen={onOpen} onEdit={vi.fn()} onUnstarred={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '分享' }));
    expect(share).toHaveBeenCalledWith({
      title: gist.description,
      text: gist.description,
      url: gist.html_url,
    });
    expect(onOpen).not.toHaveBeenCalled();
    delete (navigator as { share?: unknown }).share;
  });

  it('hides share when the browser cannot share', () => {
    delete (navigator as { share?: unknown }).share;
    render(<GistCard gist={gist} isMine={false} onOpen={vi.fn()} onEdit={vi.fn()} onUnstarred={vi.fn()} />);
    expect(screen.queryByRole('button', { name: '分享' })).not.toBeInTheDocument();
  });
});
