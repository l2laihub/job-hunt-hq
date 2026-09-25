import { describe, it, expect, vi } from 'vitest';

vi.mock('./client', () => ({ requireGemini: vi.fn(), DEFAULT_MODEL: 'x', DEFAULT_THINKING_BUDGET: 0 }));

import { enforceLocationRule } from './analyze-jd';
import type { JDAnalysis } from '@/src/types';

const make = (verdict: string, locationEligible?: boolean) =>
  ({
    recommendation: { verdict, confidence: 80, summary: '', primaryReasons: ['Great stack'], actionItems: [] },
    quickTake: { verdict, confidence: 80, headline: 'Great fit, apply now', whyApply: [], whyPass: [], nextAction: '' },
    fitSignals: { codingPct: 80, codingRationale: '', locationCheck: 'On-site in Austin, TX', locationEligible, signatureAngle: '', seniorityNote: '' },
  }) as unknown as JDAnalysis;

describe('enforceLocationRule', () => {
  it('forces pass when the location is ineligible', () => {
    const out = enforceLocationRule(make('strong-apply', false));
    expect(out.recommendation.verdict).toBe('pass');
    expect(out.recommendation.primaryReasons[0]).toBe('Location: On-site in Austin, TX');
    expect(out.quickTake?.verdict).toBe('pass');
    expect(out.quickTake?.headline).toBe('Location: On-site in Austin, TX');
  });

  it('fixes a stale quickTake even when the model already said pass', () => {
    const out = enforceLocationRule(make('pass', false));
    expect(out.quickTake?.verdict).toBe('pass');
    expect(enforceLocationRule(out).recommendation.primaryReasons.filter((r) => r.startsWith('Location')).length).toBe(1);
  });

  it('leaves eligible or unknown locations alone', () => {
    expect(enforceLocationRule(make('apply', true)).recommendation.verdict).toBe('apply');
    expect(enforceLocationRule(make('apply')).recommendation.verdict).toBe('apply');
  });
});
