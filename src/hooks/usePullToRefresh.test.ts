import { describe, expect, it } from 'vitest';
import { pullRefreshAction } from './usePullToRefresh';

describe('pullRefreshAction', () => {
  it('ignores horizontal drags and upward moves', () => {
    expect(pullRefreshAction(40, 10, 80)).toBe('ignore');
    expect(pullRefreshAction(0, -20, 80)).toBe('ignore');
  });

  it('asks for a release only after the downward threshold', () => {
    expect(pullRefreshAction(4, 40, 80)).toBe('pull');
    expect(pullRefreshAction(4, 80, 80)).toBe('refresh');
  });
});
