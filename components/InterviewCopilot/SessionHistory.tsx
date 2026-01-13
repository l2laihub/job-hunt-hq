/**
 * Session History Component
 * Shows list of saved Interview Copilot sessions
 */

import React, { useState, useEffect } from 'react';
import type {
  SavedCopilotSession,
  CopilotSessionFeedback,
  CopilotQuestionFeedback,
} from '@/src/types';
import { useSupabaseCopilotSessionsStore } from '@/src/stores/supabase';
import {
  History,
  Clock,
  MessageSquare,
  ChevronRight,
  Star,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  Building,
  Loader2,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface SessionHistoryProps {
  onSelectSession?: (session: SavedCopilotSession) => void;
  onClose?: () => void;
}

export const SessionHistory: React.FC<SessionHistoryProps> = ({
  onSelectSession,
  onClose,
}) => {
  const [selectedSession, setSelectedSession] = useState<SavedCopilotSession | null>(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Store
  const sessions = useSupabaseCopilotSessionsStore((s) => s.sessions);
  const isLoading = useSupabaseCopilotSessionsStore((s) => s.isLoading);
  const fetchSessions = useSupabaseCopilotSessionsStore((s) => s.fetchSessions);
  const deleteSession = useSupabaseCopilotSessionsStore((s) => s.deleteSession);
  const submitFeedback = useSupabaseCopilotSessionsStore((s) => s.submitFeedback);

  // Fetch sessions on mount
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Format date for display
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Format duration
  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) return '< 1 min';
    if (minutes === 1) return '1 min';
    return `${minutes} mins`;
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await deleteSession(id);
      setConfirmDelete(null);
      if (selectedSession?.id === id) {
        setSelectedSession(null);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  // Loading state
  if (isLoading && sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-3" />
        <p className="text-gray-400">Loading session history...</p>
      </div>
    );
  }

  // Empty state
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mb-4">
          <History className="w-8 h-8 text-gray-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-400">No Sessions Yet</h3>
        <p className="text-gray-500 text-sm mt-2 max-w-sm">
          Complete an Interview Copilot session and save it to see your history here.
        </p>
      </div>
    );
  }

  // Session detail view
  if (selectedSession) {
    return (
      <SessionDetail
        session={selectedSession}
        onBack={() => setSelectedSession(null)}
        onFeedback={() => setShowFeedbackForm(true)}
        onDelete={() => setConfirmDelete(selectedSession.id)}
        showFeedbackForm={showFeedbackForm}
        onCloseFeedback={() => setShowFeedbackForm(false)}
        onSubmitFeedback={async (feedback) => {
          await submitFeedback(selectedSession.id, feedback);
          setShowFeedbackForm(false);
          // Refetch to get updated session
          await fetchSessions();
          const updated = sessions.find((s) => s.id === selectedSession.id);
          if (updated) setSelectedSession(updated);
        }}
      />
    );
  }

  // Session list
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-900/30 rounded-lg">
            <History className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Session History</h2>
            <p className="text-xs text-gray-500">{sessions.length} sessions saved</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800"
            title="Close"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Session list */}
      <div className="space-y-2">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="bg-gray-800/30 rounded-xl border border-gray-700/50 hover:border-gray-600/50 transition-colors"
          >
            <button
              type="button"
              onClick={() => {
                setSelectedSession(session);
                onSelectSession?.(session);
              }}
              className="w-full p-4 text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {session.company && (
                      <span className="flex items-center gap-1 text-sm text-white font-medium">
                        <Building className="w-3.5 h-3.5 text-gray-500" />
                        {session.company}
                      </span>
                    )}
                    {session.role && (
                      <span className="text-sm text-gray-400">• {session.role}</span>
                    )}
                    {!session.company && !session.role && (
                      <span className="text-sm text-white font-medium">Interview Practice</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(session.durationMs)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {session.stats.questionsDetected} questions
                    </span>
                    <span>{formatDate(session.startedAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {session.feedback && (
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            'w-3 h-3',
                            star <= session.feedback!.overallRating
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-600'
                          )}
                        />
                      ))}
                    </div>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
              </div>
            </button>

            {/* Delete confirmation */}
            {confirmDelete === session.id && (
              <div className="px-4 pb-4 flex items-center gap-2 border-t border-gray-700/50 pt-3">
                <span className="text-sm text-red-400">Delete this session?</span>
                <button
                  type="button"
                  onClick={() => handleDelete(session.id)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-xs text-white"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(null)}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Session Detail Component
interface SessionDetailProps {
  session: SavedCopilotSession;
  onBack: () => void;
  onFeedback: () => void;
  onDelete: () => void;
  showFeedbackForm: boolean;
  onCloseFeedback: () => void;
  onSubmitFeedback: (feedback: CopilotSessionFeedback) => Promise<void>;
}

const SessionDetail: React.FC<SessionDetailProps> = ({
  session,
  onBack,
  onFeedback,
  onDelete,
  showFeedbackForm,
  onCloseFeedback,
  onSubmitFeedback,
}) => {
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

  // Format duration
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get suggestion for a question
  const getSuggestion = (questionId: string) => {
    return session.suggestions.find((s) => s.questionId === questionId);
  };

  const selectedSuggestion = selectedQuestionId ? getSuggestion(selectedQuestionId) : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronRight className="w-5 h-5 rotate-180" />
          <span className="text-sm">Back to History</span>
        </button>
        <div className="flex items-center gap-2">
          {!session.feedback && (
            <button
              type="button"
              onClick={onFeedback}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm text-white flex items-center gap-1.5"
            >
              <Star className="w-4 h-4" />
              Add Feedback
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="p-2 text-gray-500 hover:text-red-400 rounded-lg hover:bg-gray-800"
            title="Delete session"
            aria-label="Delete session"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Session info */}
      <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">{session.title}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(session.startedAt).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          {session.feedback && (
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      'w-4 h-4',
                      star <= session.feedback!.overallRating
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-600'
                    )}
                  />
                ))}
              </div>
              {session.feedback.interviewOutcome && (
                <span className={cn(
                  'text-xs mt-1 px-2 py-0.5 rounded-full',
                  session.feedback.interviewOutcome === 'passed' && 'bg-green-900/30 text-green-400',
                  session.feedback.interviewOutcome === 'failed' && 'bg-red-900/30 text-red-400',
                  session.feedback.interviewOutcome === 'pending' && 'bg-yellow-900/30 text-yellow-400',
                  session.feedback.interviewOutcome === 'unknown' && 'bg-gray-800 text-gray-400',
                )}>
                  {session.feedback.interviewOutcome}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900/50 rounded-lg p-3 text-center">
            <Clock className="w-4 h-4 text-blue-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-white">{formatDuration(session.durationMs)}</div>
            <div className="text-xs text-gray-500">Duration</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3 text-center">
            <MessageSquare className="w-4 h-4 text-purple-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-white">{session.detectedQuestions.length}</div>
            <div className="text-xs text-gray-500">Questions</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3 text-center">
            <CheckCircle className="w-4 h-4 text-green-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-white">{session.suggestions.length}</div>
            <div className="text-xs text-gray-500">Answers</div>
          </div>
        </div>
      </div>

      {/* Questions and Answers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Questions list */}
        <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Questions ({session.detectedQuestions.length})
          </h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {session.detectedQuestions.map((question, index) => {
              const suggestion = getSuggestion(question.id);
              const isSelected = selectedQuestionId === question.id;

              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => setSelectedQuestionId(isSelected ? null : question.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border transition-all',
                    isSelected
                      ? 'border-purple-500 bg-purple-900/20'
                      : 'border-gray-700/50 hover:border-gray-600/50'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-gray-500 shrink-0 mt-0.5">{index + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white line-clamp-2">{question.text}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400 uppercase">
                          {question.type}
                        </span>
                        {suggestion && (
                          <span className="text-[10px] text-green-400 flex items-center gap-0.5">
                            <CheckCircle className="w-2.5 h-2.5" />
                            Answer ready
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Answer preview */}
        <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Answer Preview
          </h3>
          {selectedSuggestion ? (
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {/* Key points */}
              <div>
                <h4 className="text-xs text-gray-500 uppercase mb-2">Key Points</h4>
                <ul className="space-y-1.5">
                  {selectedSuggestion.keyPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-purple-400 shrink-0">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              {/* STAR response */}
              {selectedSuggestion.starResponse && (
                <div>
                  <h4 className="text-xs text-gray-500 uppercase mb-2">STAR Response</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong className="text-blue-400">S:</strong> <span className="text-gray-300">{selectedSuggestion.starResponse.situation}</span></p>
                    <p><strong className="text-purple-400">T:</strong> <span className="text-gray-300">{selectedSuggestion.starResponse.task}</span></p>
                    <p><strong className="text-green-400">A:</strong> <span className="text-gray-300">{selectedSuggestion.starResponse.action}</span></p>
                    <p><strong className="text-yellow-400">R:</strong> <span className="text-gray-300">{selectedSuggestion.starResponse.result}</span></p>
                  </div>
                </div>
              )}

              {/* Matched stories */}
              {selectedSuggestion.matchedStories.length > 0 && (
                <div>
                  <h4 className="text-xs text-gray-500 uppercase mb-2">
                    Matched Stories ({selectedSuggestion.matchedStories.length})
                  </h4>
                  <div className="space-y-1">
                    {selectedSuggestion.matchedStories.map((story) => (
                      <div key={story.storyId} className="flex items-center gap-2 text-sm">
                        <span className="text-green-400">{story.relevance}%</span>
                        <span className="text-gray-300">{story.storyTitle}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <AlertCircle className="w-8 h-8 text-gray-600 mb-2" />
              <p className="text-gray-500 text-sm">
                Select a question to see the answer
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Feedback form modal */}
      {showFeedbackForm && (
        <FeedbackForm
          session={session}
          onClose={onCloseFeedback}
          onSubmit={onSubmitFeedback}
        />
      )}
    </div>
  );
};

// Feedback Form Component
interface FeedbackFormProps {
  session: SavedCopilotSession;
  onClose: () => void;
  onSubmit: (feedback: CopilotSessionFeedback) => Promise<void>;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ session, onClose, onSubmit }) => {
  const [overallRating, setOverallRating] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [outcome, setOutcome] = useState<'passed' | 'failed' | 'pending' | 'unknown'>('unknown');
  const [whatWorkedWell, setWhatWorkedWell] = useState('');
  const [whatToImprove, setWhatToImprove] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        overallRating,
        interviewOutcome: outcome,
        whatWorkedWell: whatWorkedWell || undefined,
        whatToImprove: whatToImprove || undefined,
        questionFeedback: [],
        submittedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-700 max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Session Feedback</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800"
            title="Close"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Overall rating */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Overall Rating
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setOverallRating(star as 1 | 2 | 3 | 4 | 5)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={cn(
                      'w-8 h-8 transition-colors',
                      star <= overallRating
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-600 hover:text-gray-500'
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Interview outcome */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Interview Outcome
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['passed', 'failed', 'pending', 'unknown'] as const).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOutcome(o)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm capitalize transition-colors',
                    outcome === o
                      ? o === 'passed' ? 'bg-green-600 text-white' :
                        o === 'failed' ? 'bg-red-600 text-white' :
                        o === 'pending' ? 'bg-yellow-600 text-white' :
                        'bg-gray-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  )}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          {/* What worked well */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              What worked well?
            </label>
            <textarea
              value={whatWorkedWell}
              onChange={(e) => setWhatWorkedWell(e.target.value)}
              placeholder="The suggested talking points were helpful..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
              rows={3}
            />
          </div>

          {/* What to improve */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              What could be improved?
            </label>
            <textarea
              value={whatToImprove}
              onChange={(e) => setWhatToImprove(e.target.value)}
              placeholder="Would like more technical depth..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
              rows={3}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-gray-800 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-700 rounded-xl text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl text-white font-medium disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionHistory;
