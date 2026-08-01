import { useEffect, useState } from 'react';
import { StickyNote, Check, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, Textarea } from '@/src/components/ui';

const SAVE_DELAY_MS = 800;

interface JobNotesCardProps {
  jobId: string;
  notes?: string;
  onSave: (notes: string) => void | Promise<void>;
}

/**
 * Free-form notes on an analyzed job. Autosaves ~800ms after typing stops.
 */
export function JobNotesCard({ jobId, notes, onSave }: JobNotesCardProps) {
  const [value, setValue] = useState(notes ?? '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Re-seed when switching jobs, otherwise the previous job's notes stick around
  useEffect(() => {
    setValue(notes ?? '');
    setStatus('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  useEffect(() => {
    if (value === (notes ?? '')) return;

    // ponytail: effect timer instead of the debounce() util — unmount cleanup comes free
    const timer = setTimeout(async () => {
      setStatus('saving');
      try {
        await onSave(value);
        setStatus('saved');
      } catch (error) {
        // The text is still in the box — say so rather than looking untouched
        console.error('Failed to save notes:', error);
        setStatus('error');
      }
    }, SAVE_DELAY_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-gray-400 uppercase flex items-center gap-2">
            <StickyNote className="w-4 h-4" />
            My Notes
          </h4>
          {status === 'saving' && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Saving...
            </span>
          )}
          {status === 'saved' && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <Check className="w-3 h-3" />
              Saved
            </span>
          )}
          {status === 'error' && (
            <span className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Not saved — keep typing to retry
            </span>
          )}
        </div>
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Recruiter name, referral, salary expectations, follow-up dates..."
          rows={6}
          className="text-sm"
        />
      </CardContent>
    </Card>
  );
}
