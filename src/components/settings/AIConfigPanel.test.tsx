import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AIConfigPanel } from './AIConfigPanel';

vi.mock('../../store/useAppStore', () => {
  const state = {
    aiConfigs: [{
      id: 'cfg-1',
      name: '日常模型',
      apiType: 'openai',
      baseUrl: 'https://api.example.com/v1',
      model: 'gpt-4o-mini',
      apiKey: 'sk-test',
      concurrency: 2,
    }],
    activeAIConfig: 'cfg-1',
    language: 'zh',
    translationEngine: 'google',
    repositoryChatSettings: {
      enabled: false,
      chatConfigId: null,
      retainSessionDays: 90,
      enableWebTools: false,
      enableAgentToolLoop: false,
      streamingMode: 'auto',
      agentBudget: { maxToolCalls: 20, maxTurns: 4, maxNoProgressRounds: 2, maxReadFiles: 6, maxCodeReads: 3, maxDurationMs: 90000 },
    },
    setTranslationEngine: vi.fn(),
    setRepositoryChatSettings: vi.fn(),
    addAIConfig: vi.fn(),
    updateAIConfig: vi.fn(),
    deleteAIConfig: vi.fn(),
    setActiveAIConfig: vi.fn(),
    setCurrentView: vi.fn(),
  };
  return {
    useAppStore: (selector?: (value: typeof state) => unknown) => (selector ? selector(state) : state),
  };
});

vi.mock('../../hooks/useDialog', () => ({
  useDialog: () => ({ toast: vi.fn(), confirm: vi.fn() }),
}));

vi.mock('../../features/settings/hooks/useAIConfigActions', () => ({
  useAIConfigActions: () => ({
    testingId: null,
    testingForm: false,
    testConfig: vi.fn(),
    testDraft: vi.fn(),
  }),
}));

describe('AIConfigPanel on a phone', () => {
  it('keeps configuration actions at a 44px tap size on their own row', () => {
    render(<AIConfigPanel t={(zh) => zh} />);

    const test = screen.getByRole('button', { name: '测试连接' });
    expect(test.className).toContain('h-11');
    expect(test.className).toContain('w-11');
    expect(test.parentElement?.className).toContain('self-end');
    expect(screen.getByText('https://api.example.com/v1', { exact: false }).className).toContain('break-all');
  });
});
