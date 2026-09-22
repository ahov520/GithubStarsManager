import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { McpSettingsPanel } from './McpSettingsPanel';

vi.mock('../../services/electronProxy', () => ({
  isElectron: () => false,
}));

vi.mock('../../store/useAppStore', () => {
  const state = {
    language: 'zh',
    mcpConfig: { enabled: true, token: 'gsm_mcp_test', host: '127.0.0.1', port: 8787 },
    setMcpConfig: vi.fn(),
  };
  const useAppStore = (selector?: (value: typeof state) => unknown) => (selector ? selector(state) : state);
  useAppStore.getState = () => state;
  return { useAppStore };
});

vi.mock('../../hooks/useDialog', () => ({
  useDialog: () => ({ toast: vi.fn(), confirm: vi.fn() }),
}));

vi.mock('../../features/settings/hooks/useMcpActions', () => ({
  useMcpActions: () => ({
    loading: false,
    saving: false,
    error: null,
    backendMode: false,
    vectorAvailable: null,
    endpoints: { streamableHttp: '/mcp', sse: '/sse', messages: '/messages' },
    refresh: vi.fn(),
    toggle: vi.fn(),
    resetToken: vi.fn(),
  }),
}));

describe('McpSettingsPanel on a phone', () => {
  it('uses 44px copy actions and shares the agent config', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });

    render(<McpSettingsPanel t={(zh) => zh} />);

    expect(screen.getByRole('button', { name: '复制 Token' }).className).toContain('h-11');
    expect(document.querySelector('input[aria-label="访问 Token"]')?.className).toContain('h-11');
    expect(screen.getByRole('button', { name: '复制 JSON' }).className).toContain('h-11');
    expect(document.querySelector('code')?.className).toContain('break-all');
    expect(document.querySelector('code')?.textContent).toContain('/mcp');

    await userEvent.click(screen.getByRole('button', { name: '分享 JSON' }));

    expect(share).toHaveBeenCalledWith(expect.objectContaining({
      title: 'MCP 配置',
      text: expect.stringContaining('gsm_mcp_test'),
    }));
  });
});
