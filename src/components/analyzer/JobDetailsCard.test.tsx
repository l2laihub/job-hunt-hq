import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { JobDetailsCard } from './JobDetailsCard';
import type { AnalyzedJob } from '@/src/types';

const job = {
  id: 'job-1',
  company: 'Acme',
  role: 'Senior React Dev',
  location: 'Austin, TX',
  salaryRange: '$150k-$180k',
} as AnalyzedJob;

const companyInput = () => screen.getByLabelText('Company');

describe('JobDetailsCard', () => {
  it('saves a corrected field on blur', async () => {
    const onSave = vi.fn();
    render(<JobDetailsCard job={job} onSave={onSave} />);

    fireEvent.change(companyInput(), { target: { value: 'Acme Corp' } });
    fireEvent.blur(companyInput());

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ company: 'Acme Corp' }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('does not write when the field is untouched', () => {
    const onSave = vi.fn();
    render(<JobDetailsCard job={job} onSave={onSave} />);

    fireEvent.blur(companyInput());
    fireEvent.blur(screen.getByLabelText('Salary Range'));

    expect(onSave).not.toHaveBeenCalled();
  });

  it('restores the stored value when the save fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('offline'));
    render(<JobDetailsCard job={job} onSave={onSave} />);

    fireEvent.change(companyInput(), { target: { value: 'Typo Inc' } });
    fireEvent.blur(companyInput());

    await waitFor(() => expect(companyInput()).toHaveValue('Acme'));
  });

  it('re-seeds when the job changes instead of leaking the previous values', () => {
    const { rerender } = render(<JobDetailsCard job={job} onSave={vi.fn()} />);
    expect(companyInput()).toHaveValue('Acme');

    rerender(<JobDetailsCard job={{ ...job, id: 'job-2', company: 'Globex' }} onSave={vi.fn()} />);
    expect(companyInput()).toHaveValue('Globex');
  });
});
