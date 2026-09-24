import { describe, it, expect } from 'vitest';
import { buildCandidateContext } from './candidate-context';
import { DEFAULT_PROFILE } from '@/src/types';
import type { ContextDocument } from '@/src/types';

const doc = (name: string, kind: ContextDocument['kind'], content: string): ContextDocument => ({
  id: name, name, kind, content, uploadedAt: '2026-09-24T00:00:00Z',
});

describe('buildCandidateContext', () => {
  it('returns null without documents so callers fall back to structured fields', () => {
    expect(buildCandidateContext({ ...DEFAULT_PROFILE, contextDocuments: [] })).toBeNull();
  });

  it('puts the authoritative document first, in full, with ground rules', () => {
    const ctx = buildCandidateContext({
      ...DEFAULT_PROFILE,
      contextDocuments: [
        doc('resume.docx', 'supporting', 'RESUME BODY'),
        doc('career-facts.md', 'authoritative', 'FACTS BODY\n## Never say\n- Built GraphRAG'),
      ],
    })!;
    expect(ctx).toContain('GROUND RULES');
    expect(ctx.indexOf('[AUTHORITATIVE] career-facts.md')).toBeLessThan(ctx.indexOf('[SUPPORTING] resume.docx'));
    expect(ctx).toContain('- Built GraphRAG'); // never truncated
  });
});
