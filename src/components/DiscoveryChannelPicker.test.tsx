import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DiscoveryChannelPicker } from './DiscoveryChannelPicker';

const channels = [
  { id: 'trending' as const, name: '趋势', nameEn: 'Trending', icon: <span>T</span> },
  { id: 'code-search' as const, name: '代码搜索', nameEn: 'Code Search', icon: <span>C</span> },
];

describe('DiscoveryChannelPicker', () => {
  it('opens every channel in a 44px row', async () => {
    const onChannelSelect = vi.fn();
    render(
      <DiscoveryChannelPicker
        channels={channels}
        selectedChannel="trending"
        onChannelSelect={onChannelSelect}
        language="zh"
      />,
    );

    expect(screen.getByRole('button', { name: '全部频道' }).className).toContain('h-11');
    await userEvent.click(screen.getByRole('button', { name: '全部频道' }));

    const codeSearch = screen.getByRole('button', { name: '代码搜索' });
    expect(codeSearch.className).toContain('min-h-11');
    expect(codeSearch.className).toContain('w-full');
    await userEvent.click(codeSearch);
    expect(onChannelSelect).toHaveBeenCalledWith('code-search');
    expect(screen.queryByRole('button', { name: '代码搜索' })).not.toBeInTheDocument();
  });
});
