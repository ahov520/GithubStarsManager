import { describe, expect, it } from 'vitest';
import type { Gist } from '../types';
import { getGistTitle, inferGistCodeLanguage } from './gistUtils';

describe('inferGistCodeLanguage', () => {
  it('uses plaintext for files without an extension', () => {
    expect(inferGistCodeLanguage('mnist1')).toBe('plaintext');
  });

  it('keeps known extensionless filenames', () => {
    expect(inferGistCodeLanguage('Dockerfile')).toBe('dockerfile');
  });

  it('normalizes GitHub Text language to highlight.js plaintext', () => {
    expect(inferGistCodeLanguage('notes', 'Text')).toBe('plaintext');
  });
});

describe('getGistTitle', () => {
  it('does not crash when a bad payload has no id', () => {
    const gist = { description: '  ', files: {} } as Gist;
    expect(getGistTitle(gist)).toBe('gist');
  });
});
