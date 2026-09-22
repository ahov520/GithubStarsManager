import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NetworkPanel } from './NetworkPanel';

const mocks = vi.hoisted(() => ({ useNetworkActions: vi.fn() }));

vi.mock('../../features/settings/hooks/useNetworkActions', () => ({
  useNetworkActions: mocks.useNetworkActions,
}));

const actions = {
  canUseProxy: true,
  form: {
    enabled: true,
    type: 'http' as const,
    host: '127.0.0.1',
    port: 7890,
    username: 'stored-user',
    password: undefined,
  },
  rpcForm: { enabled: false, host: '', port: 6800, secret: '' },
  testing: false,
  saving: false,
  isProxyToggling: false,
  testResult: null,
  rpcTesting: false,
  rpcSaving: false,
  isRpcToggling: false,
  rpcTestResult: null,
  hasStoredSecret: false,
  isFormValid: true,
  isRpcFormValid: true,
  hasProxyChanges: false,
  hasRpcChanges: false,
  setForm: vi.fn(),
  setRpcForm: vi.fn(),
  clearStoredSecret: vi.fn(),
  saveProxy: vi.fn(),
  testProxy: vi.fn(),
  toggleProxy: vi.fn(),
  saveRpc: vi.fn(),
  testRpc: vi.fn(),
  toggleRpc: vi.fn(),
};

describe('NetworkPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useNetworkActions.mockReturnValue(actions);
  });

  it('automatically expands proxy authentication when restored credentials exist', () => {
    render(<NetworkPanel t={(_zh, en) => en} />);

    expect(screen.getByLabelText('Username')).toHaveValue('stored-user');
  });

  it('keeps proxy and remote download actions at 44px', () => {
    mocks.useNetworkActions.mockReturnValue({
      ...actions,
      rpcForm: { enabled: true, host: '127.0.0.1', port: 6800, secret: '' },
    });
    render(<NetworkPanel t={(zh) => zh} />);

    expect(document.getElementById('rpc-host')?.className).toContain('h-11');
    expect(document.getElementById('rpc-port')?.className).toContain('h-11');
    expect(document.getElementById('proxy-host')?.className).toContain('h-11');
    expect(screen.getByRole('button', { name: '显示密钥' }).className).toContain('h-11');
    expect(screen.getByRole('button', { name: '显示密码' }).className).toContain('h-11');
    for (const button of screen.getAllByRole('button', { name: '测试连接' })) {
      expect(button.className).toContain('h-11');
    }
  });
});
