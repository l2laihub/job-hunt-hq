import { describe, it, expect, beforeEach } from 'vitest';
import { useAnalyzedJobsStore } from './analyzed-jobs';
import type { JDAnalysis } from '@/src/types';

const analysis = { fitScore: 6 } as JDAnalysis;

const seed = () =>
  useAnalyzedJobsStore.getState().addJob({
    jobDescription: 'Senior React dev at Acme',
    type: 'fulltime',
    company: 'Acme',
    role: 'Senior React Dev',
    analysis,
    notes: 'referred by Dana',
  });

describe('analyzed jobs store — re-analyzing in place', () => {
  beforeEach(() => useAnalyzedJobsStore.setState({ jobs: [] }));

  it('keeps notes and prep content when only the analysis is replaced', () => {
    const job = seed();

    useAnalyzedJobsStore.getState().updateJob(job.id, {
      analysis: { fitScore: 9 } as JDAnalysis,
    });

    const updated = useAnalyzedJobsStore.getState().getJobById(job.id)!;
    expect(updated.analysis.fitScore).toBe(9);
    expect(updated.notes).toBe('referred by Dana');
    expect(useAnalyzedJobsStore.getState().jobs).toHaveLength(1);
  });

  // Guards the Object.entries filter in analyzer.tsx's saveAnalysis: this store
  // spreads updates, so passing an undefined field erases it. The Supabase
  // service skips undefined instead, so the caller must strip them to match.
  it('erases fields passed as undefined — callers must strip them first', () => {
    const job = seed();

    useAnalyzedJobsStore.getState().updateJob(job.id, { company: undefined });

    expect(useAnalyzedJobsStore.getState().getJobById(job.id)!.company).toBeUndefined();
  });
});
