import { beforeEach, describe, expect, it } from 'vitest';
import { RECENT_REPOSITORIES_KEY, readRecentRepositoryIds, rememberRepository } from './recentRepositories';

describe('recent repositories', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('keeps the newest repository first and drops duplicates', () => {
    rememberRepository(1);
    rememberRepository(2);
    rememberRepository(1);
    expect(readRecentRepositoryIds()).toEqual([1, 2]);
  });

  it('ignores malformed storage', () => {
    window.localStorage.setItem(RECENT_REPOSITORIES_KEY, '{"nope":true}');
    expect(readRecentRepositoryIds()).toEqual([]);
  });
});