import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GistCard } from './GistCard';
import type { Gist } from '../types';

const toast = vi.fn();
const analyzeOne = vi.hoisted(() => vi.fn());

vi.mock('../store/useAppStore', () => ({
  useAppStore: (selector: (state: { language: 'zh' }) => unknown) => selector({ language: 'zh' }),
}));

vi.mock('../features/gists/hooks/useGistActions', () => ({
  useGistActions: () => ({
    analyzeOne,
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

  it('expands a long gist summary on a phone without opening the detail', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: String(query).includes('max-width'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    const description = '这是一段在 Gist 列表里放不下的说明，手机上需要就地展开后半段，而不必先打开代码详情。';
    const onOpen = vi.fn();
    try {
      render(<GistCard gist={{ ...gist, description }} isMine={false} onOpen={onOpen} onEdit={vi.fn()} onUnstarred={vi.fn()} />);
      const toggle = screen.getByRole('button', { name: '展开描述' });
      expect(toggle.className).toContain('h-11');
      const paragraph = screen.getAllByText(description).find((node) => node.tagName === 'P');
      expect(paragraph?.className).toContain('line-clamp-2');
      fireEvent.click(toggle);
      expect(onOpen).not.toHaveBeenCalled();
      expect(paragraph?.className).not.toContain('line-clamp-2');
      expect(screen.getByRole('button', { name: '收起描述' })).toHaveAttribute('aria-expanded', 'true');
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('opens labeled gist actions from a phone sheet', () => {
    const onOpen = vi.fn();
    render(<GistCard gist={gist} isMine onOpen={onOpen} onEdit={vi.fn()} onUnstarred={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Gist 操作' }));
    const analyze = screen.getAllByRole('button', { name: 'AI分析' }).find((node) => node.className.includes('w-full'));
    const edit = screen.getAllByRole('button', { name: '编辑' }).find((node) => node.className.includes('w-full'));
    expect(analyze?.className).toContain('min-h-11');
    expect(edit?.className).toContain('min-h-11');
    expect(screen.getAllByRole('link', { name: '打开链接' }).some((node) => node.className.includes('min-h-11'))).toBe(true);
    fireEvent.click(analyze!);
    expect(analyzeOne).toHaveBeenCalledWith(gist);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('hides share when the browser cannot share', () => {
    delete (navigator as { share?: unknown }).share;
    render(<GistCard gist={gist} isMine={false} onOpen={vi.fn()} onEdit={vi.fn()} onUnstarred={vi.fn()} />);
    expect(screen.queryByRole('button', { name: '分享' })).not.toBeInTheDocument();
  });
});
