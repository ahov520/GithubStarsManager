import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DataManagementPanel } from './DataManagementPanel';

vi.mock('../../store/useAppStore', () => {
  const state = {
    user: null,
    repositories: [],
    releases: [],
    aiConfigs: [],
    webdavConfigs: [],
    customCategories: [],
    defaultCategoryOverrides: {},
    hiddenDefaultCategoryIds: [],
    assetFilters: [],
    discoveryRepos: {},
    subscriptionRepos: {},
    releaseSubscriptions: new Set<number>(),
    releaseSourceSettings: { watchCustomReleaseRepos: [], customReleaseRepos: [] },
    readReleases: new Set<number>(),
    language: 'zh',
    includeKeysInBackup: false,
    setIncludeKeysInBackup: vi.fn(),
    setRepositories: vi.fn(),
    setReleases: vi.fn(),
    setBackendApiSecret: vi.fn(),
  };
  const useAppStore = Object.assign(
    (selector?: (value: typeof state) => unknown) => (selector ? selector(state) : state),
    { getState: () => state, setState: vi.fn() },
  );
  return { useAppStore };
});

describe('DataManagementPanel on a phone', () => {
  it('keeps export rows and delete-all at 44px', () => {
    render(<DataManagementPanel t={(zh) => zh} />);

    const exportRow = screen.getByText('仓库数据').closest('label');
    expect(exportRow?.className).toContain('min-h-11');
    expect(exportRow?.className).toContain('w-full');

    const deleteAll = screen.getByRole('button', { name: '删除所有数据' });
    expect(deleteAll.className).toContain('h-11');
    expect(deleteAll.className).toContain('w-full');

    const keyToggle = screen.getByRole('switch', { name: '备份/导出时包含密钥' });
    expect(keyToggle.className).toContain('after:-inset-y-3');
    expect(keyToggle.closest('label')?.className).toContain('min-h-11');
  });
});
