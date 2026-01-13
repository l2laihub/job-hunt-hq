/**
 * Interview Copilot - Main Component
 * Real-time AI assistance during live interviews
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  UserProfile,
  JobApplication,
  Experience,
  CopilotSession,
  CopilotSuggestion,
  CopilotSettings,
  CopilotTranscriptEntry,
  DetectedQuestion,
  DEFAULT_COPILOT_SETTINGS,
  createCopilotSession,
  CopilotQuestionType,
  TechnicalAnswer,
  SavedCopilotSession,
} from '../../types';
import type { InterviewPrepSession } from '@/src/types/interview-prep';
import { useSupabaseCopilotSessionsStore } from '@/src/stores/supabase';
import {
  SpeechService,
  SpeechServiceStatus,
  TranscriptChunk,
  TranscriptAccumulator,
  analyzeForQuestion,
} from '../../services/speechService';
import {
  detectInterviewQuestion,
  generateCopilotSuggestion,
  classifyQuestionType,
} from '../../services/geminiService';
import { LiveTranscript } from './LiveTranscript';
import { SuggestionPanel } from './SuggestionPanel';
import { QuestionHistory } from './QuestionHistory';
import { CopilotControls } from './CopilotControls';
import { SessionHistory } from './SessionHistory';
import {
  Play,
  AlertCircle,
  Headphones,
  Zap,
  ChevronLeft,
  ChevronRight,
  Save,
  X,
  Clock,
  MessageSquare,
  CheckCircle,
  History,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface InterviewCopilotProps {
  profile: UserProfile;
  stories: Experience[];
  applications: JobApplication[];
  interviewPrepSessions?: InterviewPrepSession[];
  technicalAnswers?: TechnicalAnswer[];
}

export const InterviewCopilot: React.FC<InterviewCopilotProps> = ({
  profile,
  stories,
  applications,
  interviewPrepSessions = [],
  technicalAnswers = [],
}) => {
  // Session state
  const [session, setSession] = useState<CopilotSession | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [settings] = useState<CopilotSettings>(DEFAULT_COPILOT_SETTINGS);

  // Speech recognition state
  const [speechStatus, setSpeechStatus] = useState<SpeechServiceStatus>('idle');
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // UI state
  const [step, setStep] = useState<'setup' | 'active'>('setup');
  const [, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [showHistoryView, setShowHistoryView] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [showSessionSummary, setShowSessionSummary] = useState(false);
  const [endedSession, setEndedSession] = useState<CopilotSession | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Copilot sessions store for saving history
  const saveSessionToHistory = useSupabaseCopilotSessionsStore((s) => s.saveSession);

  // Refs
  const speechServiceRef = useRef<SpeechService | null>(null);
  const accumulatorRef = useRef<TranscriptAccumulator>(new TranscriptAccumulator());
  const processingQueueRef = useRef<string[]>([]);
  const isProcessingRef = useRef(false);
  const sessionRef = useRef<CopilotSession | null>(null);

  // Keep sessionRef in sync with session state
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Track accumulated buffer for display
  const [accumulatedBuffer, setAccumulatedBuffer] = useState<string>('');

  // Check speech support on mount
  useEffect(() => {
    if (!SpeechService.isSupported()) {
      setError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (speechServiceRef.current) {
        speechServiceRef.current.destroy();
      }
    };
  }, []);

  // Get selected application context
  const selectedApp = applications.find(a => a.id === selectedAppId);

  // Get interview prep session for selected application
  const selectedPrepSession = selectedAppId
    ? interviewPrepSessions.find(s => s.applicationId === selectedAppId)
    : undefined;

  // Get all predicted questions from interview prep sessions
  const allPreparedQuestions = interviewPrepSessions.flatMap(s => s.predictedQuestions);

  // Get technical answers for the selected application or all answers
  const relevantTechnicalAnswers = selectedAppId
    ? technicalAnswers.filter(a => !a.metadata.applicationId || a.metadata.applicationId === selectedAppId)
    : technicalAnswers;

  // Build enhanced job context with all available data
  const jobContext = selectedApp ? {
    company: selectedApp.company,
    role: selectedApp.role,
    jdHighlights: selectedApp.analysis?.requiredSkills?.slice(0, 5),
    companyResearch: selectedApp.companyResearch,
    // Interview prep data
    preparedQuestions: selectedPrepSession?.predictedQuestions || [],
    quickReference: selectedPrepSession?.quickReference,
    // Technical answers
    technicalAnswers: relevantTechnicalAnswers,
  } : {
    // Even without a selected app, include general prepared content
    preparedQuestions: allPreparedQuestions,
    technicalAnswers: technicalAnswers,
  };

  // Process a detected question
  const processQuestion = useCallback(async (
    questionText: string,
    questionType: CopilotQuestionType,
    transcriptContext: string
  ) => {
    // Use ref to avoid stale closure issues with callbacks passed to speech service
    if (!sessionRef.current) return;

    const startTime = Date.now();

    // Create detected question
    const detectedQuestion: DetectedQuestion = {
      id: `q-${Date.now()}`,
      text: questionText,
      type: questionType,
      confidence: 85,
      detectedAt: new Date().toISOString(),
      transcript: transcriptContext,
    };

    // Update session with new question
    setSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        detectedQuestions: [...prev.detectedQuestions, detectedQuestion],
        stats: {
          ...prev.stats,
          questionsDetected: prev.stats.questionsDetected + 1,
        },
      };
    });

    // Generate suggestion
    try {
      const suggestionResult = await generateCopilotSuggestion(
        questionText,
        questionType,
        profile,
        stories,
        jobContext
      );

      const suggestion: CopilotSuggestion = {
        id: `s-${Date.now()}`,
        questionId: detectedQuestion.id,
        ...suggestionResult,
        generatedAt: new Date().toISOString(),
        generationTimeMs: Date.now() - startTime,
      };

      // Update session with suggestion
      setSession(prev => {
        if (!prev) return prev;
        const totalTime = prev.stats.avgResponseTimeMs * prev.stats.suggestionsGenerated + suggestion.generationTimeMs;
        const newCount = prev.stats.suggestionsGenerated + 1;
        return {
          ...prev,
          suggestions: [suggestion, ...prev.suggestions], // Newest first
          stats: {
            ...prev.stats,
            suggestionsGenerated: newCount,
            avgResponseTimeMs: Math.round(totalTime / newCount),
          },
        };
      });

      // Auto-clear selection to show the new answer (user can click history to see previous)
      setSelectedQuestionId(null);
    } catch (err) {
      console.error('Failed to generate suggestion:', err);
    }
  }, [profile, stories, jobContext]);

  // Process transcript queue
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || processingQueueRef.current.length === 0) return;

    isProcessingRef.current = true;
    setIsProcessing(true);

    while (processingQueueRef.current.length > 0) {
      const text = processingQueueRef.current.shift()!;

      // First, quick local check
      const localAnalysis = analyzeForQuestion(text);

      if (localAnalysis.isQuestion && localAnalysis.confidence >= 60) {
        // Use AI for better detection and typing
        try {
          const aiAnalysis = await detectInterviewQuestion(text);

          if (aiAnalysis.isQuestion && aiAnalysis.confidence >= 70) {
            await processQuestion(
              aiAnalysis.question || text,
              aiAnalysis.questionType || classifyQuestionType(text),
              text
            );
          }
        } catch (err) {
          // Fallback to local classification
          await processQuestion(
            text,
            classifyQuestionType(text),
            text
          );
        }
      }
    }

    isProcessingRef.current = false;
    setIsProcessing(false);
  }, [processQuestion]);

  // Handle transcript chunks from speech recognition
  const handleTranscript = useCallback((chunk: TranscriptChunk) => {
    // Update live transcript preview for interim results
    if (!chunk.isFinal) {
      setCurrentTranscript(chunk.text);
      return;
    }

    // Final result - accumulate and check for sentences
    const sentences = accumulatorRef.current.addChunk(chunk);

    // Update accumulated buffer display
    setAccumulatedBuffer(accumulatorRef.current.getBuffer());

    // Add to session transcript (use ref to avoid stale closure)
    if (sessionRef.current && chunk.text.trim()) {
      const entry: CopilotTranscriptEntry = {
        id: `t-${Date.now()}`,
        speaker: 'unknown', // We can't distinguish without advanced voice ID
        text: chunk.text.trim(),
        timestamp: chunk.timestamp,
      };

      setSession(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          transcript: [...prev.transcript, entry],
        };
      });
    }

    // Queue sentences for question detection
    for (const sentence of sentences) {
      if (sentence.length >= 10) { // Ignore very short fragments
        processingQueueRef.current.push(sentence);
      }
    }

    // Process queue
    processQueue();

    // Clear interim preview
    setCurrentTranscript('');
  }, [processQueue]);

  // Handle silence detection
  const handleSilence = useCallback((durationMs: number) => {
    // After extended silence, flush accumulator and process
    if (durationMs >= 3000) {
      const remaining = accumulatorRef.current.flush();
      setAccumulatedBuffer(''); // Clear buffer display
      if (remaining.length >= 15) {
        processingQueueRef.current.push(remaining);
        processQueue();
      }
    }
  }, [processQueue]);

  // Start the copilot session
  const startSession = useCallback(() => {
    // Create new session
    const newSession = createCopilotSession(selectedAppId || undefined);
    newSession.contextUsed = {
      profileSummary: `${profile.name} - ${profile.headline}`,
      storyCount: stories.length,
      applicationContext: jobContext?.company ? {
        company: jobContext.company,
        role: jobContext.role,
        jdHighlights: jobContext.jdHighlights,
      } : undefined,
      // Include Interview Prep and Answer Prep context counts
      preparedQuestionsCount: allPreparedQuestions.length,
      technicalAnswersCount: technicalAnswers.length,
    };
    setSession(newSession);

    // Initialize speech service
    speechServiceRef.current = new SpeechService({
      language: 'en-US',
      continuous: true,
      interimResults: true,
      silenceThresholdMs: 2500,
    });

    // Start listening
    const started = speechServiceRef.current.start({
      onTranscript: handleTranscript,
      onError: (err) => setError(err),
      onStatusChange: setSpeechStatus,
      onSilence: handleSilence,
    });

    if (started) {
      setStep('active');
      setSession(prev => prev ? { ...prev, status: 'listening' } : prev);
    } else {
      setError('Failed to start speech recognition. Please check microphone permissions.');
    }
  }, [selectedAppId, profile, stories, jobContext, handleTranscript, handleSilence, allPreparedQuestions.length, technicalAnswers.length]);

  // Stop the session
  const stopSession = useCallback(() => {
    if (speechServiceRef.current) {
      speechServiceRef.current.stop();
    }

    // Capture the ended session for summary/save
    const sessionToSave = sessionRef.current;
    if (sessionToSave && sessionToSave.detectedQuestions.length > 0) {
      const finalSession = {
        ...sessionToSave,
        status: 'idle' as const,
        endedAt: new Date().toISOString(),
      };
      setEndedSession(finalSession);
      setShowSessionSummary(true);
    }

    setSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        status: 'idle',
        endedAt: new Date().toISOString(),
      };
    });

    setStep('setup');
    setCurrentTranscript('');
    setAccumulatedBuffer('');
    accumulatorRef.current = new TranscriptAccumulator();
    processingQueueRef.current = [];
  }, []);

  // Save session to history
  const handleSaveSession = useCallback(async () => {
    if (!endedSession) return;

    setIsSaving(true);
    try {
      await saveSessionToHistory(endedSession, {
        profileId: profile.id,
        company: selectedApp?.company,
        role: selectedApp?.role,
      });
      setShowSessionSummary(false);
      setEndedSession(null);
    } catch (err) {
      console.error('Failed to save session:', err);
      setError('Failed to save session to history');
    } finally {
      setIsSaving(false);
    }
  }, [endedSession, saveSessionToHistory, profile.id, selectedApp]);

  // Dismiss session summary without saving
  const dismissSessionSummary = useCallback(() => {
    setShowSessionSummary(false);
    setEndedSession(null);
  }, []);

  // Pause/resume
  const togglePause = useCallback(() => {
    if (!speechServiceRef.current) return;

    if (speechStatus === 'listening') {
      speechServiceRef.current.pause();
      setSession(prev => prev ? { ...prev, status: 'idle' } : prev);
    } else if (speechStatus === 'paused') {
      speechServiceRef.current.resume();
      setSession(prev => prev ? { ...prev, status: 'listening' } : prev);
    }
  }, [speechStatus]);

  // Render setup view
  const renderSetup = () => (
    <div className="max-w-3xl mx-auto space-y-8 p-6">
      {/* View History Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowHistoryView(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 rounded-lg transition-colors"
        >
          <History className="w-4 h-4" />
          View History
        </button>
      </div>

      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-purple-900/40 to-blue-900/40 rounded-2xl mb-2">
          <Headphones className="w-10 h-10 text-purple-400" />
        </div>
        <h2 className="text-3xl font-bold text-white">Interview Copilot</h2>
        <p className="text-gray-400 max-w-md mx-auto">
          Get real-time AI assistance during your interviews. The Copilot listens to questions
          and instantly suggests personalized answers based on your profile and stories.
        </p>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-medium">Cannot Start Copilot</p>
            <p className="text-red-400/80 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Context Setup */}
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Interview Context (Optional)
            </label>
            <select
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
              aria-label="Select interview context"
              title="Select interview context"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            >
              <option value="">General Practice (No specific job)</option>
              {/* Show interviewing applications first */}
              {applications.filter(app => app.status === 'interviewing').length > 0 && (
                <optgroup label="Currently Interviewing">
                  {applications.filter(app => app.status === 'interviewing').map(app => (
                    <option key={app.id} value={app.id}>
                      {app.company} - {app.role}
                    </option>
                  ))}
                </optgroup>
              )}
              {/* Show other applications */}
              {applications.filter(app => app.status !== 'interviewing').length > 0 && (
                <optgroup label="Other Applications">
                  {applications.filter(app => app.status !== 'interviewing').map(app => (
                    <option key={app.id} value={app.id}>
                      {app.company} - {app.role} ({app.status})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            {selectedApp && (
              <p className="text-xs text-gray-500 mt-2">
                Suggestions will be tailored for {selectedApp.company}'s {selectedApp.role} role
              </p>
            )}
          </div>

          <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-5 space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" /> Quick Tips
            </h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-purple-400">•</span>
                Position your microphone to pick up the interviewer's voice
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400">•</span>
                Open Copilot in a separate window or second monitor
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400">•</span>
                Glance at suggestions, don't read them verbatim
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400">•</span>
                Works best with video calls (Zoom, Meet, Teams)
              </li>
            </ul>
          </div>
        </div>

        {/* Right: Profile Summary */}
        <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-5 space-y-4">
          <h3 className="font-semibold text-white">Your Context</h3>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Profile</span>
              <span className="text-white truncate ml-2 max-w-[180px]" title={profile.headline || profile.name}>
                {profile.headline || profile.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Experience</span>
              <span className="text-white">
                {profile.yearsExperience > 0 ? `${profile.yearsExperience} years` : 'Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Stories</span>
              <span className={stories.length > 0 ? 'text-green-400' : 'text-yellow-400'}>
                {stories.length} available
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Prepared Questions</span>
              <span className={allPreparedQuestions.length > 0 ? 'text-green-400' : 'text-gray-500'}>
                {allPreparedQuestions.length} available
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Technical Answers</span>
              <span className={technicalAnswers.length > 0 ? 'text-green-400' : 'text-gray-500'}>
                {technicalAnswers.length} available
              </span>
            </div>
            {stories.length === 0 && allPreparedQuestions.length === 0 && technicalAnswers.length === 0 && (
              <p className="text-yellow-500/80 text-xs mt-2">
                Add stories in "My Stories", prepare questions in "Interview Prep", or create answers in "Answer Prep" for better suggestions
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-gray-800">
            <div className="text-xs text-gray-500 mb-2">Top Skills</div>
            <div className="flex flex-wrap gap-1.5">
              {profile.technicalSkills && profile.technicalSkills.length > 0 ? (
                <>
                  {profile.technicalSkills.slice(0, 6).map(skill => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 bg-gray-800 text-gray-300 rounded text-xs"
                    >
                      {skill}
                    </span>
                  ))}
                  {profile.technicalSkills.length > 6 && (
                    <span className="px-2 py-0.5 text-gray-500 text-xs">
                      +{profile.technicalSkills.length - 6} more
                    </span>
                  )}
                </>
              ) : (
                <span className="text-gray-500 text-xs italic">No skills added yet</span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={startSession}
            disabled={!!error}
            className={cn(
              "w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all mt-4",
              error
                ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-900/30"
            )}
          >
            <Play className="w-5 h-5" />
            Start Copilot
          </button>
        </div>
      </div>
    </div>
  );

  // Render active session view
  const renderActive = () => (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-16 border-b border-gray-800 bg-gray-900/50 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            {/* Animated status indicator */}
            <div className="relative">
              <div className={cn(
                "w-3 h-3 rounded-full",
                speechStatus === 'listening' ? 'bg-green-500' :
                speechStatus === 'paused' ? 'bg-yellow-500' :
                'bg-gray-500'
              )} />
              {speechStatus === 'listening' && (
                <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping opacity-50" />
              )}
            </div>
            <div>
              <h2 className="font-semibold text-white flex items-center gap-2">
                {speechStatus === 'listening' ? 'Listening...' :
                 speechStatus === 'paused' ? 'Paused' :
                 speechStatus === 'starting' ? 'Starting...' :
                 'Initializing...'}
                {isProcessing && (
                  <span className="text-xs font-normal text-purple-400 animate-pulse">
                    Analyzing...
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-500">
                {session?.stats.questionsDetected || 0} questions detected
                {session?.transcript.length ? ` • ${session.transcript.length} phrases captured` : ''}
              </p>
            </div>
          </div>

          <CopilotControls
            status={speechStatus}
            isProcessing={isProcessing}
            onPause={togglePause}
            onStop={stopSession}
            onSettings={() => setShowSettings(true)}
          />
        </div>

        {/* Suggestion Panel */}
        <div className="flex-1 overflow-hidden">
          <SuggestionPanel
            suggestion={
              // Show selected question's suggestion, or default to most recent
              selectedQuestionId
                ? session?.suggestions.find(s => s.questionId === selectedQuestionId) || null
                : session?.suggestions[0] || null
            }
            isProcessing={isProcessing && !selectedQuestionId}
            stories={stories}
          />
        </div>

        {/* Live Transcript Bar */}
        {settings.showTranscript && (
          <div className="h-28 border-t border-gray-800 bg-gray-900/30 p-4">
            <LiveTranscript
              currentText={currentTranscript}
              recentEntries={session?.transcript.slice(-5) || []}
              accumulatedBuffer={accumulatedBuffer}
              isListening={speechStatus === 'listening'}
            />
          </div>
        )}
      </div>

      {/* Question History Sidebar */}
      {showHistory && (
        <div className="w-80 border-l border-gray-800 bg-gray-900/30 flex flex-col">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="font-semibold text-white text-sm">Question History</h3>
            <button
              type="button"
              onClick={() => setShowHistory(false)}
              className="p-1 text-gray-500 hover:text-gray-300"
              title="Hide question history"
              aria-label="Hide question history"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <QuestionHistory
            questions={session?.detectedQuestions || []}
            suggestions={session?.suggestions || []}
            selectedQuestionId={selectedQuestionId}
            onSelectQuestion={(questionId) => {
              // Toggle selection - click again to deselect and return to showing latest
              setSelectedQuestionId(prev => prev === questionId ? null : questionId);
            }}
          />
        </div>
      )}

      {/* Toggle sidebar button when hidden */}
      {!showHistory && (
        <button
          type="button"
          onClick={() => setShowHistory(true)}
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-gray-800 border border-gray-700 rounded-l-lg p-2 text-gray-400 hover:text-white"
          title="Show question history"
          aria-label="Show question history"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  // Format duration for display
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Render session summary dialog
  const renderSessionSummary = () => {
    if (!showSessionSummary || !endedSession) return null;

    const duration = endedSession.endedAt
      ? new Date(endedSession.endedAt).getTime() - new Date(endedSession.startedAt).getTime()
      : 0;

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-2xl border border-gray-700 max-w-lg w-full max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-900/30 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Session Complete</h2>
                  <p className="text-sm text-gray-400">
                    {selectedApp ? `${selectedApp.company} - ${selectedApp.role}` : 'Interview Practice'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={dismissSessionSummary}
                className="p-2 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800"
                title="Close"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                <Clock className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{formatDuration(duration)}</div>
                <div className="text-xs text-gray-500">Duration</div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                <MessageSquare className="w-5 h-5 text-purple-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{endedSession.detectedQuestions.length}</div>
                <div className="text-xs text-gray-500">Questions</div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{endedSession.suggestions.length}</div>
                <div className="text-xs text-gray-500">Answers</div>
              </div>
            </div>

            {/* Questions Preview */}
            {endedSession.detectedQuestions.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-400">Questions Detected</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {endedSession.detectedQuestions.slice(0, 5).map((q, i) => (
                    <div key={q.id} className="flex items-start gap-2 text-sm">
                      <span className="text-gray-500 shrink-0">{i + 1}.</span>
                      <span className="text-gray-300 line-clamp-1">{q.text}</span>
                    </div>
                  ))}
                  {endedSession.detectedQuestions.length > 5 && (
                    <p className="text-xs text-gray-500">
                      +{endedSession.detectedQuestions.length - 5} more questions
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-6 border-t border-gray-800 flex gap-3">
            <button
              type="button"
              onClick={dismissSessionSummary}
              className="flex-1 px-4 py-3 border border-gray-700 rounded-xl text-gray-300 hover:bg-gray-800 transition-colors"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSaveSession}
              disabled={isSaving}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save to History
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render history view
  if (showHistoryView) {
    return (
      <div className="h-full bg-gray-950 text-gray-100 flex flex-col p-6 overflow-y-auto">
        <SessionHistory onClose={() => setShowHistoryView(false)} />
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-950 text-gray-100 flex flex-col relative">
      {step === 'setup' && renderSetup()}
      {step === 'active' && renderActive()}
      {renderSessionSummary()}
    </div>
  );
};

export default InterviewCopilot;
