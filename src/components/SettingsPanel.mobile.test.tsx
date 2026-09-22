import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../store/useAppStore', () => {
  const state = { language: 'zh', setCurrentView: vi.fn() };
  return {
    useAppStore: (selector?: (value: typeof state) => unknown) => (selector ? selector(state) : state),
  };
});

vi.mock('../features/settings/hooks/useBackendAvailability', () => ({
  useBackendAvailability: () => false,
}));

vi.mock('../services/electronProxy', () => ({
  isElectron: () => false,
}));

vi.mock('./settings', () => ({
  GeneralPanel: () => <div>general-panel</div>,
  AIConfigPanel: () => <div>ai-panel</div>,
  WebDAVPanel: () => <div>webdav-panel</div>,
  BackupPanel: () => <div>backup-panel</div>,
  BackendPanel: () => <div>backend-panel</div>,
  CategoryPanel: () => <div>category-panel</div>,
  DataManagementPanel: () => <div>data-panel</div>,
  NetworkPanel: () => <div>network-panel</div>,
  DiagnosticLogsPanel: () => <div>logs-panel</div>,
  MenuManagementPanel: () => <div>menu-panel</div>,
  StarSyncPanel: () => <div>starsync-panel</div>,
  VectorSearchSettings: () => <div>vector-panel</div>,
  McpSettingsPanel: () => <div>mcp-panel</div>,
  PluginSettingsPanel: () => <div>plugin-panel</div>,
}));

import { SettingsPanel } from './SettingsPanel';

function mobileTablist() {
  const search = screen.getByRole('textbox', { name: '搜索设置项' });
  const bar = search.closest('.sticky');
  if (!bar) throw new Error('sticky settings tab bar missing');
  return within(bar as HTMLElement);
}

describe('SettingsPanel mobile tab search', () => {
  beforeEach(() => {
    Element.prototype.scrollTo = vi.fn();
  });

  it('pins the tab bar and filters chips while keeping the active tab', () => {
    render(<SettingsPanel />);
    const bar = mobileTablist();
    expect(bar.getByRole('tab', { name: '星标同步' })).toBeTruthy();
    expect(bar.getByRole('tablist').parentElement?.className).toContain('overflow-x-hidden');

    fireEvent.change(screen.getByRole('textbox', { name: '搜索设置项' }), { target: { value: 'AI' } });

    expect(bar.getByRole('tab', { name: 'AI配置' })).toBeTruthy();
    expect(bar.getByRole('tab', { name: '通用' })).toBeTruthy();
    expect(bar.queryByRole('tab', { name: '星标同步' })).toBeNull();
    expect(screen.getByRole('tab', { name: '星标同步' })).toBeTruthy();
  });

  it('opens every settings page from the phone sheet', async () => {
    render(<SettingsPanel />);
    fireEvent.click(mobileTablist().getByRole('button', { name: '全部设置' }));
    const sheet = screen.getByRole('dialog');
    const data = within(sheet).getByRole('button', { name: '数据管理' });
    expect(data.className).toContain('min-h-11');
    expect(data.className).toContain('w-full');
    fireEvent.click(data);
    expect(await screen.findByText('data-panel')).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('keeps the current tab and says when nothing else matches', () => {
    render(<SettingsPanel />);
    fireEvent.change(screen.getByRole('textbox', { name: '搜索设置项' }), { target: { value: '不存在的设置' } });
    const bar = mobileTablist();
    expect(bar.getByText('没有匹配的设置')).toBeTruthy();
    expect(bar.getByRole('tab', { name: '通用' })).toBeTruthy();
    expect(bar.queryByRole('tab', { name: 'AI配置' })).toBeNull();
  });
});
