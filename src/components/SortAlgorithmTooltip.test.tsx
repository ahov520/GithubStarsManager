import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SortAlgorithmTooltip } from './SortAlgorithmTooltip';

describe('SortAlgorithmTooltip on a phone', () => {
  it('uses a 44px trigger for the search channel explanation', () => {
    render(<SortAlgorithmTooltip channelId="search" language="zh" />);

    expect(screen.getByRole('button', { name: '搜索' }).className).toContain('h-11');
  });
});
