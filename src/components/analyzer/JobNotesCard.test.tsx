import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { JobNotesCard } from './JobNotesCard';

describe('JobNotesCard', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const type = (text: string) => {
    fireEvent.change(screen.getByRole('textbox'), { target: { value: text } });
  };

  it('saves once, after typing stops', () => {
    const onSave = vi.fn();
    render(<JobNotesCard jobId="a" notes="" onSave={onSave} />);

    type('re');
    act(() => void vi.advanceTimersByTime(400));
    type('recruiter: Dana');
    expect(onSave).not.toHaveBeenCalled();

    act(() => void vi.advanceTimersByTime(800));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('recruiter: Dana');
  });

  it('re-seeds when the job changes instead of leaking the previous notes', () => {
    const onSave = vi.fn();
    const { rerender } = render(<JobNotesCard jobId="a" notes="job A notes" onSave={onSave} />);
    expect(screen.getByRole('textbox')).toHaveValue('job A notes');

    rerender(<JobNotesCard jobId="b" notes="job B notes" onSave={onSave} />);
    expect(screen.getByRole('textbox')).toHaveValue('job B notes');

    // switching jobs is not an edit — nothing should be written back
    act(() => void vi.advanceTimersByTime(2000));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not save a pending edit after unmount', () => {
    const onSave = vi.fn();
    const { unmount } = render(<JobNotesCard jobId="a" notes="" onSave={onSave} />);

    type('half-written thought');
    unmount();

    act(() => void vi.advanceTimersByTime(2000));
    expect(onSave).not.toHaveBeenCalled();
  });
});
