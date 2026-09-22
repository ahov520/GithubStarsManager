import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RepositoryChatHistoryPanel } from './RepositoryChatHistoryPanel';

describe('RepositoryChatHistoryPanel on a phone', () => {
  it('keeps search and delete at 44px', () => {
    render(
      <RepositoryChatHistoryPanel
        sessions={[{
          id: 'session-1',
          repoId: 42,
          repoFullName: 'owner/mobile-stars',
          sourceRefSha: 'abc1234',
          title: '这个仓库是做什么的',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }]}
        language="zh"
        onSelect={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByRole('textbox', { name: '搜索当前仓库的历史会话' }).className).toContain('h-11');
    expect(screen.getByRole('button', { name: '删除会话：这个仓库是做什么的' }).className).toContain('h-11');
  });
});
