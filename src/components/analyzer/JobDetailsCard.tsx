import { useEffect, useState } from 'react';
import { Building, Check, ListChecks } from 'lucide-react';
import { Card, Input, Badge } from '@/src/components/ui';
import type { AnalyzedJob } from '@/src/types';

const FIELDS = [
  { key: 'company', label: 'Company', placeholder: 'Company name' },
  { key: 'role', label: 'Role', placeholder: 'Job title' },
  { key: 'location', label: 'Location', placeholder: 'Location' },
  { key: 'salaryRange', label: 'Salary Range', placeholder: 'Salary' },
] as const;

type Field = (typeof FIELDS)[number]['key'];

interface JobDetailsCardProps {
  job: AnalyzedJob;
  onSave: (updates: Partial<AnalyzedJob>) => void | Promise<void>;
}

/**
 * The AI-extracted job details, editable so a bad extraction can be corrected
 * after the fact. Commits on blur — these are short fields, unlike the notes box.
 */
export function JobDetailsCard({ job, onSave }: JobDetailsCardProps) {
  const [values, setValues] = useState(() => pick(job));
  const [savedField, setSavedField] = useState<Field | null>(null);

  // Re-seed when switching jobs, otherwise the previous job's values stick around
  useEffect(() => {
    setValues(pick(job));
    setSavedField(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id]);

  const commit = async (field: Field) => {
    const value = values[field].trim();
    if (value === (job[field] ?? '')) return;

    try {
      await onSave({ [field]: value || undefined });
      setSavedField(field);
    } catch (error) {
      console.error(`Failed to save ${field}:`, error);
      setValues(pick(job)); // put the stored value back rather than show a lie
    }
  };

  const screeningCount = job.screeningQuestions?.length ?? 0;

  return (
    <Card className="p-4 bg-gray-900/50 border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Building className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-gray-300">Job Details</span>
        </div>
        {savedField && (
          <span className="text-xs text-green-400 flex items-center gap-1">
            <Check className="w-3 h-3" />
            Saved
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map(({ key, label, placeholder }) => (
          <Input
            key={key}
            // explicit id: Input derives one from the label, which would collide
            // with any other field sharing that label on the page
            id={`job-details-${key}`}
            label={label}
            value={values[key]}
            onChange={(e) => {
              setValues((prev) => ({ ...prev, [key]: e.target.value }));
              setSavedField(null);
            }}
            onBlur={() => commit(key)}
            placeholder={placeholder}
            className="text-sm"
          />
        ))}
      </div>
      {screeningCount > 0 && (
        <div className="mt-3">
          <Badge className="text-xs bg-purple-900/30 text-purple-400">
            <ListChecks className="w-3 h-3 mr-1 inline" />
            {screeningCount} Screening Question{screeningCount > 1 ? 's' : ''} Detected
          </Badge>
        </div>
      )}
    </Card>
  );
}

function pick(job: AnalyzedJob): Record<Field, string> {
  return {
    company: job.company ?? '',
    role: job.role ?? '',
    location: job.location ?? '',
    salaryRange: job.salaryRange ?? '',
  };
}
