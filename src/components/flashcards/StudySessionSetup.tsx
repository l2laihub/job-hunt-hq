/**
 * StudySessionSetup Component
 * Mode selection modal for starting a study session
 */
import React, { useState } from 'react';
import { cn } from '@/src/lib/utils';
import { Button, Card } from '@/src/components/ui';
import type { StudyMode, JobApplication, TechnicalAnswer } from '@/src/types';
import { calculateStudyStats, getStudyQueue } from '@/src/services/srs';
import { STUDY_MODE_CONFIG } from './constants';
import { Calendar, Briefcase, Zap, Clock, Play, X, Brain } from 'lucide-react';

const ICONS = {
  Calendar,
  Briefcase,
  Zap,
  Clock,
};

interface StudySessionSetupProps {
  answers: TechnicalAnswer[];
  applications?: JobApplication[];
  profileId?: string;
  onStart: (mode: StudyMode, applicationId?: string) => void;
  onCancel: () => void;
}

export const StudySessionSetup: React.FC<StudySessionSetupProps> = ({
  answers,
  applications = [],
  profileId,
  onStart,
  onCancel,
}) => {
  const [selectedMode, setSelectedMode] = useState<StudyMode>('daily');
  const [selectedAppId, setSelectedAppId] = useState<string>('');

  // Calculate stats
  const stats = calculateStudyStats(answers);

  // Get queue size for each mode
  const dailyQueue = getStudyQueue(answers, { profileId, maxNew: 10, maxReview: 50 });
  const quickQueue = getStudyQueue(answers, { profileId, maxNew: 3, maxReview: 10 });

  const modes: { mode: StudyMode; count: number }[] = [
    { mode: 'daily', count: dailyQueue.length },
    { mode: 'quick', count: Math.min(quickQueue.length, 10) },
    { mode: 'all-due', count: stats.dueToday },
    { mode: 'application', count: 0 }, // Will be calculated when app is selected
  ];

  // Filter applications that have associated answers
  const appsWithAnswers = applications.filter((app) =>
    answers.some((a) => a.metadata.applicationId === app.id)
  );

  const handleStart = () => {
    if (selectedMode === 'application' && !selectedAppId) {
      return; // Don't start without an app selected
    }
    onStart(selectedMode, selectedMode === 'application' ? selectedAppId : undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-gray-900 border-gray-700 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
              <Brain className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Start Practice Session</h2>
              <p className="text-sm text-gray-400">
                {stats.dueToday} cards due - {stats.new} new
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selection */}
        <div className="space-y-3 mb-6">
          {modes.map(({ mode, count }) => {
            const config = STUDY_MODE_CONFIG[mode];
            const Icon = ICONS[config.icon as keyof typeof ICONS];
            const isSelected = selectedMode === mode;
            const isDisabled = mode !== 'application' && count === 0;

            return (
              <button
                key={mode}
                onClick={() => !isDisabled && setSelectedMode(mode)}
                disabled={isDisabled}
                className={cn(
                  'w-full p-4 rounded-xl border-2 text-left transition-all',
                  isSelected
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600',
                  isDisabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      config.bgColor
                    )}
                  >
                    <Icon className={cn('w-5 h-5', config.color)} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">{config.label}</span>
                      {mode !== 'application' && (
                        <span className={cn('text-sm', count > 0 ? config.color : 'text-gray-500')}>
                          {count} cards
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">{config.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Application selector (when application mode is selected) */}
        {selectedMode === 'application' && (
          <div className="mb-6">
            <label className="text-sm text-gray-400 mb-2 block">Select Job Application</label>
            {appsWithAnswers.length > 0 ? (
              <select
                value={selectedAppId}
                onChange={(e) => setSelectedAppId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
              >
                <option value="">Choose an application...</option>
                {appsWithAnswers.map((app) => {
                  const appAnswerCount = answers.filter(
                    (a) => a.metadata.applicationId === app.id
                  ).length;
                  return (
                    <option key={app.id} value={app.id}>
                      {app.company} - {app.role} ({appAnswerCount} cards)
                    </option>
                  );
                })}
              </select>
            ) : (
              <p className="text-sm text-gray-500 bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                No applications with prepared answers. Create answers linked to job applications first.
              </p>
            )}
          </div>
        )}

        {/* Stats summary */}
        <div className="grid grid-cols-4 gap-3 mb-6 text-center">
          <div className="bg-gray-800/50 rounded-lg p-3">
            <span className="text-lg font-mono text-white">{stats.new}</span>
            <span className="text-xs text-gray-500 block">New</span>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <span className="text-lg font-mono text-blue-400">{stats.learning}</span>
            <span className="text-xs text-gray-500 block">Learning</span>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <span className="text-lg font-mono text-yellow-400">{stats.reviewing}</span>
            <span className="text-xs text-gray-500 block">Review</span>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <span className="text-lg font-mono text-green-400">{stats.mastered}</span>
            <span className="text-xs text-gray-500 block">Mastered</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleStart}
            disabled={
              (selectedMode === 'application' && !selectedAppId) ||
              (selectedMode !== 'application' && modes.find((m) => m.mode === selectedMode)?.count === 0)
            }
            leftIcon={<Play className="w-4 h-4" />}
            className="flex-1 bg-blue-600 hover:bg-blue-500"
          >
            Start Practice
          </Button>
        </div>
      </Card>
    </div>
  );
};
