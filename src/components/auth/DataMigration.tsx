/**
 * Data Migration Component
 * Handles one-time migration from localStorage to Supabase
 */
import { useState, useEffect } from 'react';
import {
  hasLocalStorageData,
  getLocalStorageSummary,
  runFullMigration,
  isMigrationComplete,
  markMigrationSkipped,
} from '@/src/stores/supabase';
import { Database, ArrowRight, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface DataMigrationProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function DataMigration({ onComplete, onSkip }: DataMigrationProps) {
  const [status, setStatus] = useState<'checking' | 'ready' | 'migrating' | 'success' | 'error'>('checking');
  const [progress, setProgress] = useState('');
  const [summary, setSummary] = useState<ReturnType<typeof getLocalStorageSummary> | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    // Check if migration is needed
    if (isMigrationComplete() || !hasLocalStorageData()) {
      onComplete();
      return;
    }

    setSummary(getLocalStorageSummary());
    setStatus('ready');
  }, [onComplete]);

  const handleSkip = () => {
    // Mark migration as skipped so it doesn't appear again
    markMigrationSkipped();
    onSkip();
  };

  const handleMigrate = async () => {
    setStatus('migrating');
    setProgress('Starting migration...');

    try {
      const result = await runFullMigration(setProgress);

      if (result.success) {
        setStatus('success');
        setTimeout(onComplete, 1500);
      } else {
        setErrors(result.errors);
        setStatus('error');
      }
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Unknown error']);
      setStatus('error');
    }
  };

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  const totalItems = summary
    ? Object.values(summary).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Data Migration</h2>
            <p className="text-sm text-gray-400">Transfer your data to the cloud</p>
          </div>
        </div>

        {status === 'ready' && summary && (
          <>
            <div className="bg-gray-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-300 mb-3">
                We found existing data that can be migrated to your account:
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {summary.profiles > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Profiles</span>
                    <span className="text-white">{summary.profiles}</span>
                  </div>
                )}
                {summary.applications > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Applications</span>
                    <span className="text-white">{summary.applications}</span>
                  </div>
                )}
                {summary.stories > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Stories</span>
                    <span className="text-white">{summary.stories}</span>
                  </div>
                )}
                {summary.companyResearch > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Research</span>
                    <span className="text-white">{summary.companyResearch}</span>
                  </div>
                )}
                {summary.technicalAnswers > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Answers</span>
                    <span className="text-white">{summary.technicalAnswers}</span>
                  </div>
                )}
                {summary.analyzedJobs > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Analyzed Jobs</span>
                    <span className="text-white">{summary.analyzedJobs}</span>
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-700 flex justify-between">
                <span className="text-gray-400 font-medium">Total</span>
                <span className="text-white font-medium">{totalItems} items</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSkip}
                className="flex-1 py-2.5 px-4 bg-gray-800 text-gray-300 rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleMigrate}
                className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-500 transition-colors"
              >
                Migrate Data
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <p className="mt-4 text-xs text-gray-500 text-center">
              Your local data will be transferred to your account and removed from this device.
            </p>
          </>
        )}

        {status === 'migrating' && (
          <div className="text-center py-8">
            <Loader2 className="w-10 h-10 text-blue-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-300">{progress}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center py-8">
            <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-4" />
            <p className="text-green-400 font-medium">Migration Complete!</p>
            <p className="text-gray-400 text-sm mt-1">Redirecting...</p>
          </div>
        )}

        {status === 'error' && (
          <>
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-red-400 font-medium">Migration Failed</p>
                  {errors.map((error, i) => (
                    <p key={i} className="text-sm text-red-400/80 mt-1">{error}</p>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSkip}
                className="flex-1 py-2.5 px-4 bg-gray-800 text-gray-300 rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Continue Without Data
              </button>
              <button
                onClick={handleMigrate}
                className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors"
              >
                Retry
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default DataMigration;
