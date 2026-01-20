import React from 'react';
import { Dialog } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { AlertTriangle, Eye, RotateCcw } from 'lucide-react';
import type { AnalyzedJob } from '@/src/types';

interface DuplicateWarningDialogProps {
  isOpen: boolean;
  existingJob: AnalyzedJob;
  onViewExisting: () => void;
  onReanalyze: () => void;
  onCancel: () => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const DuplicateWarningDialog: React.FC<DuplicateWarningDialogProps> = ({
  isOpen,
  existingJob,
  onViewExisting,
  onReanalyze,
  onCancel,
}) => {
  return (
    <Dialog isOpen={isOpen} onClose={onCancel} size="md">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-900/30 border border-yellow-800">
            <AlertTriangle className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              Job Already Analyzed
            </h2>
            <p className="text-sm text-gray-400">
              This job description was previously analyzed
            </p>
          </div>
        </div>

        {/* Existing Job Info */}
        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-white">
                {existingJob.company || 'Unknown Company'}
              </h3>
              <p className="text-gray-400 text-sm">
                {existingJob.role || 'Unknown Role'}
              </p>
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold ${
                existingJob.analysis.fitScore >= 8
                  ? 'text-green-400'
                  : existingJob.analysis.fitScore >= 5
                    ? 'text-yellow-400'
                    : 'text-red-400'
              }`}>
                {existingJob.analysis.fitScore}/10
              </div>
              <p className="text-xs text-gray-500">Fit Score</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-700">
            <p className="text-xs text-gray-500">
              Analyzed on {formatDate(existingJob.createdAt)}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-300">
          Would you like to view the existing analysis or re-analyze with your
          current profile?
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="sm:order-1"
          >
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={onReanalyze}
            className="sm:order-2 flex-1"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Re-analyze
          </Button>
          <Button
            variant="primary"
            onClick={onViewExisting}
            className="sm:order-3 flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            View Existing
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
