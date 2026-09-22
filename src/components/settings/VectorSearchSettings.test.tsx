import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VectorSearchSettings } from './VectorSearchSettings';

vi.mock('../../store/useAppStore', () => {
  const state = {
    embeddingConfigs: [],
    activeEmbeddingConfig: null,
    vectorSearchConfig: {
      enabled: false,
      workerUrl: '',
      authToken: '',
      indexMode: 'readme',
      readmeMaxChars: 6000,
      searchThreshold: 0.35,
      searchTopK: 30,
      enableHyDE: true,
      enableReranking: true,
    },
    vectorSearchStatus: null,
    vectorIndexingState: { isIndexing: false, phase: null, phaseDone: 0, phaseTotal: 0, result: null },
    addEmbeddingConfig: vi.fn(),
    updateEmbeddingConfig: vi.fn(),
    setActiveEmbeddingConfig: vi.fn(),
    setVectorSearchConfig: vi.fn(),
  };
  const useAppStore = (selector?: (value: typeof state) => unknown) => (selector ? selector(state) : state);
  useAppStore.getState = () => state;
  return { useAppStore };
});

vi.mock('../../hooks/useDialog', () => ({
  useDialog: () => ({ toast: vi.fn(), confirm: vi.fn() }),
}));

vi.mock('../../features/settings/hooks/useVectorSearchActions', () => ({
  useVectorSearchActions: () => ({
    testingEmbedding: false,
    embeddingTestResult: null,
    testingWorker: false,
    workerTestResult: null,
    incrementalTargetCount: 0,
    testEmbedding: vi.fn(),
    testWorker: vi.fn(),
    rebuildIndex: vi.fn(),
    incrementalIndex: vi.fn(),
    abortIndexing: vi.fn(),
  }),
}));

describe('VectorSearchSettings on a phone', () => {
  it('uses 44px model controls and pastes an API key', async () => {
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { readText: vi.fn().mockResolvedValue('sk-phone') },
    });

    render(<VectorSearchSettings t={(zh) => zh} />);

    expect(screen.getByRole('button', { name: 'OpenAI' }).className).toContain('h-11');
    expect(document.getElementById('embedding-api-url')?.className).toContain('h-11');
    expect(screen.getByRole('button', { name: '显示 API Key' }).className).toContain('h-11');

    await userEvent.click(screen.getByRole('button', { name: '粘贴 API Key' }));

    expect(document.getElementById('embedding-api-key')).toHaveValue('sk-phone');
  });
});
