/**
 * Data Migration Modal
 * Prompts authenticated users to migrate localStorage data to Supabase
 */
import React, { useState, useEffect } from 'react';
import { Button, Card, CardHeader, CardContent } from '@/src/components/ui';
import { useAuth } from '@/src/lib/supabase';
import {
  hasLocalStorageData,
  getLocalStorageSummary,
  runFullMigration,
  isMigrationComplete,
} from '@/src/services/database/migration';
import { toast } from '@/src/stores';
import { Database, Upload, X, Check, AlertTriangle } from 'lucide-react';

interface DataMigrationModalProps {
  onClose: () => void;
  onMigrationComplete?: () => void;
}

export const DataMigrationModal: React.FC<DataMigrationModalProps> = ({
  onClose,
  onMigrationComplete,
}) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<'idle' | 'migrating' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState('');
  const [summary, setSummary] = useState<ReturnType<typeof getLocalStorageSummary> | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (hasLocalStorageData() && !isMigrationComplete()) {
      setSummary(getLocalStorageSummary());
    }
  }, []);

  const handleMigrate = async () => {
    if (!user) {
      toast.error('Not authenticated', 'Please sign in to migrate your data');
      return;
    }

    setStatus('migrating');
    setErrors([]);

    try {
      const result = await runFullMigration((message) => {
        setProgress(message);
      });

      if (result.success) {
        setStatus('success');
        toast.success('Migration complete', 'Your data has been synced to the cloud');
        onMigrationComplete?.();
      } else {
        setStatus('error');
        setErrors(result.errors);
        toast.error('Migration had errors', 'Some data could not be migrated');
      }
    } catch (error) {
      setStatus('error');
      setErrors([error instanceof Error ? error.message : 'Unknown error']);
      toast.error('Migration failed', 'Please try again or contact support');
    }
  };

  const handleSkip = () => {
    // Mark as skipped so we don't prompt again
    localStorage.setItem('jhq:migration:skipped', new Date().toISOString());
    onClose();
  };

  if (!summary) return null;

  const totalItems = Object.values(summary).reduce((a, b) => a + b, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-900/50 flex items-center justify-center">
                <Database className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Sync Your Data</h2>
                <p className="text-sm text-gray-400">
                  Migrate your local data to the cloud
                </p>
              </div>
            </div>
            {status === 'idle' && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {status === 'idle' && (
            <>
              <p className="text-gray-300 mb-4">
                We found <strong className="text-white">{totalItems} items</strong> in your browser storage.
                Would you like to sync them to your account?
              </p>

              <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Data to migrate:</h4>
                <ul className="space-y-1 text-sm text-gray-400">
                  {summary.profiles > 0 && (
                    <li>• {summary.profiles} profile{summary.profiles > 1 ? 's' : ''}</li>
                  )}
                  {summary.applications > 0 && (
                    <li>• {summary.applications} job application{summary.applications > 1 ? 's' : ''}</li>
                  )}
                  {summary.stories > 0 && (
                    <li>• {summary.stories} interview stor{summary.stories > 1 ? 'ies' : 'y'}</li>
                  )}
                  {summary.companyResearch > 0 && (
                    <li>• {summary.companyResearch} company research entr{summary.companyResearch > 1 ? 'ies' : 'y'}</li>
                  )}
                  {summary.technicalAnswers > 0 && (
                    <li>• {summary.technicalAnswers} technical answer{summary.technicalAnswers > 1 ? 's' : ''}</li>
                  )}
                  {summary.analyzedJobs > 0 && (
                    <li>• {summary.analyzedJobs} analyzed job{summary.analyzedJobs > 1 ? 's' : ''}</li>
                  )}
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="primary"
                  onClick={handleMigrate}
                  leftIcon={<Upload className="w-4 h-4" />}
                  className="flex-1"
                >
                  Sync to Cloud
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                >
                  Skip for now
                </Button>
              </div>
            </>
          )}

          {status === 'migrating' && (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-300">{progress || 'Migrating data...'}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-green-900/50 flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Migration Complete!</h3>
              <p className="text-gray-400 mb-6">
                Your data is now synced to the cloud and accessible from any device.
              </p>
              <Button variant="primary" onClick={onClose}>
                Continue
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="py-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-900/50 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Migration had errors</h3>
                  <p className="text-sm text-gray-400">Some data could not be migrated</p>
                </div>
              </div>

              {errors.length > 0 && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-4">
                  <ul className="text-sm text-red-400 space-y-1">
                    {errors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="secondary" onClick={handleMigrate}>
                  Try Again
                </Button>
                <Button variant="ghost" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Hook to check if migration prompt should be shown
 */
export function useShouldShowMigration(): boolean {
  const { user } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (user && hasLocalStorageData() && !isMigrationComplete()) {
      const skipped = localStorage.getItem('jhq:migration:skipped');
      // If skipped, don't show again for 24 hours
      if (skipped) {
        const skippedAt = new Date(skipped);
        const hoursSinceSkipped = (Date.now() - skippedAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceSkipped < 24) {
          setShouldShow(false);
          return;
        }
      }
      setShouldShow(true);
    } else {
      setShouldShow(false);
    }
  }, [user]);

  return shouldShow;
}

export default DataMigrationModal;
