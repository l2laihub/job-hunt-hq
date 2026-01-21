import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentProfile, toast } from '@/src/stores';
import { useUnifiedActiveProfileId, useApplications, useInterviewPrep } from '@/src/hooks/useAppData';
import { Button, Card, CardHeader, CardContent, Badge } from '@/src/components/ui';
import { EnhancedSetup, QuestionFeedback, InterviewSummary } from '@/src/components/interview';
import { cn, formatTime } from '@/src/lib/utils';
import { createAudioBlob, decodeBase64, decodeAudioData, createAudioContext } from '@/src/lib/audio';
import { createLiveSession } from '@/src/services/gemini/live-interview';
import { evaluateInterviewResponse, generateSessionSummary } from '@/src/services/gemini/evaluate-response';
import type {
  EnhancedInterviewConfig,
  EnhancedInterviewFeedback,
  QuestionResult,
  PredictedQuestion,
  LiveInterviewPhase,
  ActiveQuestionState,
  QuestionEvaluation,
} from '@/src/types/interview-prep';
import type { TranscriptItem } from '@/src/types';
import { LiveServerMessage } from '@google/genai';
import {
  Mic,
  MicOff,
  Square,
  Clock,
  MessageCircle,
  Volume2,
  VolumeX,
  CheckCircle,
  Loader2,
} from 'lucide-react';

// Audio configuration
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const OUTPUT_CHANNELS = 1;

export const EnhancedInterviewPage: React.FC = () => {
  const navigate = useNavigate();
  const activeProfileId = useUnifiedActiveProfileId();
  const profile = useCurrentProfile();
  const { applications: allApplications } = useApplications();
  const { getSessionById, addPracticeSession, recordQuestionPractice } = useInterviewPrep();

  // Filter by profile
  const applications = useMemo(() => {
    if (!activeProfileId) return allApplications;
    return allApplications.filter((a) => !a.profileId || a.profileId === activeProfileId);
  }, [allApplications, activeProfileId]);

  // Interview state
  const [phase, setPhase] = useState<LiveInterviewPhase>('setup');
  const [config, setConfig] = useState<EnhancedInterviewConfig | null>(null);
  const [questions, setQuestions] = useState<PredictedQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
  const [feedback, setFeedback] = useState<EnhancedInterviewFeedback | null>(null);

  // Current question state
  const [activeQuestion, setActiveQuestion] = useState<ActiveQuestionState | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [currentEvaluation, setCurrentEvaluation] = useState<QuestionEvaluation | null>(null);

  // Audio state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);

  // Timer
  const [elapsedTime, setElapsedTime] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const liveSessionRef = useRef<Awaited<ReturnType<typeof createLiveSession>> | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Get selected application
  const application = useMemo(() => {
    if (!config) return undefined;
    return applications.find((a) => a.id === config.applicationId);
  }, [config, applications]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Timer effect
  useEffect(() => {
    if (phase === 'active') {
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [phase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, []);

  // Cleanup audio resources
  const cleanupAudio = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (liveSessionRef.current) {
      liveSessionRef.current.close();
      liveSessionRef.current = null;
    }
  }, []);

  // Play queued audio
  const playNextAudio = useCallback(() => {
    if (!audioContextRef.current || audioQueueRef.current.length === 0 || !audioEnabled) {
      isPlayingRef.current = false;
      setIsSpeaking(false);
      return;
    }

    isPlayingRef.current = true;
    setIsSpeaking(true);

    const buffer = audioQueueRef.current.shift()!;
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => {
      playNextAudio();
    };
    source.start();
  }, [audioEnabled]);

  // Handle incoming audio from Gemini
  const handleAudioData = useCallback(
    async (data: string) => {
      if (!audioContextRef.current) return;

      try {
        const decoded = decodeBase64(data);
        const audioBuffer = await decodeAudioData(
          decoded,
          audioContextRef.current,
          OUTPUT_SAMPLE_RATE,
          OUTPUT_CHANNELS
        );

        audioQueueRef.current.push(audioBuffer);

        if (!isPlayingRef.current) {
          playNextAudio();
        }
      } catch (error) {
        console.error('Failed to process audio:', error);
      }
    },
    [playNextAudio]
  );

  // Handle Gemini Live message
  const handleLiveMessage = useCallback(
    (msg: LiveServerMessage) => {
      // Handle audio
      if (msg.serverContent?.modelTurn?.parts) {
        for (const part of msg.serverContent.modelTurn.parts) {
          if (part.inlineData?.data) {
            handleAudioData(part.inlineData.data);
          }
        }
      }

      // Handle output transcription (model speech)
      if (msg.serverContent?.outputTranscription?.text) {
        const text = msg.serverContent.outputTranscription.text;
        setTranscript((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'model' && !last.text.endsWith('.')) {
            // Append to last message
            return [
              ...prev.slice(0, -1),
              { ...last, text: last.text + text },
            ];
          } else {
            // New message
            return [
              ...prev,
              { role: 'model', text, timestamp: new Date().toISOString() },
            ];
          }
        });
      }

      // Handle input transcription (user speech)
      if (msg.serverContent?.inputTranscription?.text) {
        const text = msg.serverContent.inputTranscription.text;
        setCurrentTranscript((prev) => prev + text);
        setTranscript((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'user') {
            return [
              ...prev.slice(0, -1),
              { ...last, text: last.text + text },
            ];
          } else {
            return [
              ...prev,
              { role: 'user', text, timestamp: new Date().toISOString() },
            ];
          }
        });
      }

      // Handle turn complete
      if (msg.serverContent?.turnComplete) {
        setIsSpeaking(false);
      }
    },
    [handleAudioData]
  );

  // Start interview with config
  const handleStartInterview = useCallback(
    async (interviewConfig: EnhancedInterviewConfig, selectedQuestions: PredictedQuestion[]) => {
      if (!profile) {
        toast.error('Profile required', 'Please set up your profile first');
        return;
      }

      setConfig(interviewConfig);
      setQuestions(selectedQuestions);
      setPhase('connecting');

      try {
        // Initialize audio context
        audioContextRef.current = createAudioContext(OUTPUT_SAMPLE_RATE);

        // Get microphone access
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: INPUT_SAMPLE_RATE,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });

        // Get application for context
        const app = applications.find((a) => a.id === interviewConfig.applicationId);

        // Create live session with Gemini
        const liveSession = await createLiveSession(
          {
            type: interviewConfig.type,
            difficulty: interviewConfig.difficulty,
            duration: interviewConfig.duration,
            focusAreas: interviewConfig.focusCategories || [],
          },
          profile,
          app,
          {
            onOpen: () => {
              console.log('Live session connected');
            },
            onMessage: handleLiveMessage,
            onClose: () => {
              console.log('Live session closed');
            },
            onError: (e) => {
              console.error('Live session error:', e);
              toast.error('Connection error', 'Interview session disconnected');
            },
          }
        );

        liveSessionRef.current = liveSession;

        // Set up audio processing
        const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
        const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = (e) => {
          if (isListening && liveSessionRef.current) {
            const inputData = e.inputBuffer.getChannelData(0);
            const audioBlob = createAudioBlob(inputData);
            liveSessionRef.current.sendRealtimeInput({ media: audioBlob });
          }
        };

        source.connect(processor);
        processor.connect(audioContextRef.current.destination);
        processorRef.current = processor;

        // Start interview
        setPhase('active');
        setElapsedTime(0);
        setQuestionStartTime(0);
        setCurrentQuestionIndex(0);
        setActiveQuestion({
          question: selectedQuestions[0],
          index: 0,
          totalQuestions: selectedQuestions.length,
          startedAt: new Date().toISOString(),
          isRecording: false,
          hasResponded: false,
        });

        toast.success('Interview started', 'Good luck!');
      } catch (error) {
        console.error('Failed to start interview:', error);
        toast.error(
          'Failed to start',
          error instanceof Error ? error.message : 'Could not connect to interview service'
        );
        setPhase('setup');
        cleanupAudio();
      }
    },
    [profile, applications, handleLiveMessage, cleanupAudio]
  );

  // Toggle microphone
  const toggleListening = useCallback(() => {
    setIsListening((prev) => {
      if (!prev) {
        // Starting to listen - mark question start if first time
        if (!activeQuestion?.hasResponded) {
          setQuestionStartTime(elapsedTime);
        }
        setActiveQuestion((q) => (q ? { ...q, isRecording: true } : null));
      } else {
        setActiveQuestion((q) => (q ? { ...q, isRecording: false } : null));
      }
      return !prev;
    });
  }, [activeQuestion, elapsedTime]);

  // Submit current answer and evaluate
  const handleSubmitAnswer = useCallback(async () => {
    if (!activeQuestion || !config || currentTranscript.trim().length === 0) return;

    setIsListening(false);
    setIsEvaluating(true);

    const responseTime = elapsedTime - questionStartTime;

    try {
      // Get prepared answer if available
      const prepSession = getSessionById(config.prepSessionId);
      const questionData = prepSession?.predictedQuestions.find(
        (q) => q.id === activeQuestion.question.id
      );
      let preparedAnswer: string | undefined;

      // TODO: Fetch prepared answer from storage if matchedAnswerId exists
      // For now, use suggestedApproach as fallback
      preparedAnswer = questionData?.suggestedApproach;

      // Evaluate response
      const evaluation = await evaluateInterviewResponse(
        activeQuestion.question,
        currentTranscript,
        preparedAnswer,
        {
          jobRole: application?.role,
          company: application?.company,
          interviewType: config.type,
        }
      );

      // Create question result
      const result: QuestionResult = {
        questionId: activeQuestion.question.id,
        question: activeQuestion.question,
        userResponse: currentTranscript,
        evaluation: evaluation as unknown as QuestionEvaluation,
        responseTimeSeconds: responseTime,
        timestamp: new Date().toISOString(),
      };

      setQuestionResults((prev) => [...prev, result]);
      setCurrentEvaluation(evaluation as unknown as QuestionEvaluation);

      // Record practice in store
      recordQuestionPractice(config.prepSessionId, activeQuestion.question.id);

      setActiveQuestion((q) => (q ? { ...q, hasResponded: true, evaluation: evaluation as unknown as QuestionEvaluation } : null));
    } catch (error) {
      console.error('Evaluation failed:', error);
      toast.error('Evaluation failed', 'Could not evaluate your response');
    } finally {
      setIsEvaluating(false);
    }
  }, [
    activeQuestion,
    config,
    currentTranscript,
    elapsedTime,
    questionStartTime,
    application,
    getSessionById,
    recordQuestionPractice,
  ]);

  // Move to next question
  const handleNextQuestion = useCallback(() => {
    if (!config || !questions.length) return;

    const nextIndex = currentQuestionIndex + 1;

    if (nextIndex >= questions.length) {
      // Interview complete - generate summary
      handleEndInterview();
    } else {
      // Move to next question
      setCurrentQuestionIndex(nextIndex);
      setCurrentTranscript('');
      setCurrentEvaluation(null);
      setQuestionStartTime(elapsedTime);
      setActiveQuestion({
        question: questions[nextIndex],
        index: nextIndex,
        totalQuestions: questions.length,
        startedAt: new Date().toISOString(),
        isRecording: false,
        hasResponded: false,
      });

      // Tell AI to ask next question
      if (liveSessionRef.current) {
        liveSessionRef.current.sendClientContent({
          turns: [
            {
              role: 'user',
              parts: [{ text: 'Please ask the next question.' }],
            },
          ],
          turnComplete: true,
        });
      }
    }
  }, [config, questions, currentQuestionIndex, elapsedTime]);

  // End interview and generate summary
  const handleEndInterview = useCallback(async () => {
    setPhase('evaluating');
    setIsListening(false);
    cleanupAudio();

    try {
      // Generate session summary
      const summary = await generateSessionSummary(
        questionResults.map((r) => ({
          question: r.question.question,
          category: r.question.category,
          userResponse: r.userResponse,
          score: r.evaluation.score,
        })),
        {
          jobRole: application?.role,
          company: application?.company,
          duration: elapsedTime,
        }
      );

      // Calculate category scores
      const categoryScores: EnhancedInterviewFeedback['categoryScores'] = {};
      const categoryResults = questionResults.reduce((acc, r) => {
        const cat = r.question.category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(r.evaluation.score);
        return acc;
      }, {} as Record<string, number[]>);

      Object.entries(categoryResults).forEach(([cat, scores]) => {
        categoryScores[cat as keyof typeof categoryScores] =
          scores.reduce((a, b) => a + b, 0) / scores.length;
      });

      // Calculate prepared answer stats
      const withPrepared = questionResults.filter(
        (r) => r.evaluation.preparedAnswerComparison
      );
      const avgSimilarity =
        withPrepared.length > 0
          ? withPrepared.reduce(
              (sum, r) => sum + (r.evaluation.preparedAnswerComparison?.similarity || 0),
              0
            ) / withPrepared.length
          : 0;

      // Build feedback
      const enhancedFeedback: EnhancedInterviewFeedback = {
        overallScore: summary.overallScore,
        categoryScores,
        questionResults,
        questionsAnswered: questionResults.length,
        averageResponseTime:
          questionResults.reduce((sum, r) => sum + r.responseTimeSeconds, 0) /
          questionResults.length,
        totalDuration: elapsedTime,
        preparedVsActual: {
          questionsWithPreparedAnswers: withPrepared.length,
          averageSimilarity: Math.round(avgSimilarity),
        },
        progressUpdate: {
          questionsNewlyPracticed: questionResults.length,
          questionsImproved: 0, // Would need historical data
          totalPracticeCount: questionResults.length,
          readinessScoreChange: 5, // Simplified
        },
        topStrengths: summary.topStrengths,
        priorityImprovements: summary.priorityImprovements,
        summary: summary.summary,
        nextSteps: summary.nextSteps,
        completedAt: new Date().toISOString(),
        config: config!,
      };

      setFeedback(enhancedFeedback);

      // Save practice session to store
      if (config) {
        addPracticeSession({
          sessionId: config.prepSessionId,
          mode: 'mock',
          questionIds: questionResults.map((r) => r.questionId),
          durationSeconds: elapsedTime,
          selfRating: Math.round(summary.overallScore / 2), // Convert 10-scale to 5-scale
        });
      }

      setPhase('feedback');
      toast.success('Interview complete', 'Review your feedback below');
    } catch (error) {
      console.error('Failed to generate summary:', error);
      toast.error('Summary failed', 'Could not generate interview summary');

      // Show basic feedback anyway
      setFeedback({
        overallScore:
          questionResults.reduce((sum, r) => sum + r.evaluation.score, 0) /
          questionResults.length,
        categoryScores: {},
        questionResults,
        questionsAnswered: questionResults.length,
        averageResponseTime:
          questionResults.reduce((sum, r) => sum + r.responseTimeSeconds, 0) /
          questionResults.length,
        totalDuration: elapsedTime,
        preparedVsActual: {
          questionsWithPreparedAnswers: 0,
          averageSimilarity: 0,
        },
        progressUpdate: {
          questionsNewlyPracticed: questionResults.length,
          questionsImproved: 0,
          totalPracticeCount: questionResults.length,
          readinessScoreChange: 0,
        },
        topStrengths: [],
        priorityImprovements: [],
        summary: 'Interview completed. Individual question feedback is available above.',
        nextSteps: ['Review each question feedback', 'Practice weak areas'],
        completedAt: new Date().toISOString(),
        config: config!,
      });
      setPhase('feedback');
    }
  }, [questionResults, application, elapsedTime, config, addPracticeSession, cleanupAudio]);

  // Reset and start over
  const handleReset = useCallback(() => {
    cleanupAudio();
    setPhase('setup');
    setConfig(null);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setQuestionResults([]);
    setFeedback(null);
    setActiveQuestion(null);
    setCurrentTranscript('');
    setCurrentEvaluation(null);
    setTranscript([]);
    setElapsedTime(0);
  }, [cleanupAudio]);

  // Back to prep
  const handleBackToPrep = useCallback(() => {
    if (config) {
      navigate(`/interview-prep?sessionId=${config.prepSessionId}`);
    } else {
      navigate('/interview-prep');
    }
  }, [config, navigate]);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Mic className="w-6 h-6 text-blue-500" />
              Enhanced Mock Interview
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {phase === 'setup' && 'Practice with context-aware AI interview simulation'}
              {phase === 'connecting' && 'Connecting to interview service...'}
              {phase === 'active' && `Question ${currentQuestionIndex + 1} of ${questions.length}`}
              {phase === 'evaluating' && 'Evaluating your responses...'}
              {phase === 'feedback' && 'Review your performance'}
            </p>
          </div>

          {phase === 'active' && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-400">
                <Clock className="w-4 h-4" />
                <span className="font-mono">{formatTime(elapsedTime)}</span>
              </div>
              <Button
                variant="danger"
                onClick={handleEndInterview}
                leftIcon={<Square className="w-4 h-4" />}
              >
                End Interview
              </Button>
            </div>
          )}
        </div>

        {/* Setup Phase */}
        {phase === 'setup' && <EnhancedSetup onStartInterview={handleStartInterview} />}

        {/* Connecting Phase */}
        {phase === 'connecting' && (
          <Card className="p-8 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-400 animate-spin" />
            <h3 className="text-lg font-medium text-white mb-2">Connecting...</h3>
            <p className="text-gray-400 text-sm">
              Setting up your interview session. Please allow microphone access.
            </p>
          </Card>
        )}

        {/* Active Interview Phase */}
        {phase === 'active' && activeQuestion && (
          <div className="space-y-4">
            {/* Question Display */}
            <Card className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-800/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="text-xs bg-blue-900/40 text-blue-400">
                    {activeQuestion.question.category}
                  </Badge>
                  <Badge
                    className={cn(
                      'text-xs',
                      activeQuestion.question.likelihood === 'high'
                        ? 'bg-red-900/40 text-red-400'
                        : 'bg-yellow-900/40 text-yellow-400'
                    )}
                  >
                    {activeQuestion.question.likelihood} likelihood
                  </Badge>
                </div>
                <h3 className="text-lg font-medium text-white">
                  {activeQuestion.question.question}
                </h3>
              </CardContent>
            </Card>

            {/* Transcript */}
            <Card className="h-[300px] flex flex-col">
              <CardHeader className="flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" /> Conversation
                  </h3>
                  <button
                    onClick={() => setAudioEnabled(!audioEnabled)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {transcript.map((item, i) => (
                  <div
                    key={i}
                    className={cn('flex gap-3', item.role === 'user' ? 'flex-row-reverse' : '')}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold',
                        item.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'
                      )}
                    >
                      {item.role === 'user' ? 'You' : 'AI'}
                    </div>
                    <div
                      className={cn(
                        'max-w-[80%] p-3 rounded-lg',
                        item.role === 'user'
                          ? 'bg-blue-900/30 border border-blue-800'
                          : 'bg-gray-800 border border-gray-700'
                      )}
                    >
                      <p className="text-sm text-gray-200">{item.text}</p>
                    </div>
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </CardContent>
            </Card>

            {/* Controls */}
            {!currentEvaluation && (
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant={isListening ? 'danger' : 'primary'}
                  size="lg"
                  onClick={toggleListening}
                  leftIcon={isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  className={cn('w-48', isListening && 'animate-pulse')}
                  disabled={isEvaluating}
                >
                  {isListening ? 'Stop Recording' : 'Start Recording'}
                </Button>

                {currentTranscript.length > 50 && (
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={handleSubmitAnswer}
                    disabled={isEvaluating}
                    leftIcon={
                      isEvaluating ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <CheckCircle className="w-5 h-5" />
                      )
                    }
                  >
                    {isEvaluating ? 'Evaluating...' : 'Submit Answer'}
                  </Button>
                )}
              </div>
            )}

            {/* Per-question feedback */}
            {currentEvaluation && config?.enablePerQuestionFeedback && (
              <QuestionFeedback
                result={questionResults[questionResults.length - 1]}
                showPreparedAnswer={config.showPreparedAnswers}
                onNextQuestion={handleNextQuestion}
                isLastQuestion={currentQuestionIndex === questions.length - 1}
              />
            )}

            {/* Status */}
            <div className="text-center text-sm text-gray-500">
              {isListening ? (
                <span className="text-green-400 flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Recording your response...
                </span>
              ) : isSpeaking ? (
                <span className="text-blue-400 flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  AI is speaking...
                </span>
              ) : isEvaluating ? (
                <span className="text-purple-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Evaluating your response...
                </span>
              ) : currentEvaluation ? (
                <span className="text-gray-400">
                  Review your feedback above, then continue to the next question
                </span>
              ) : (
                'Click the microphone when ready to respond'
              )}
            </div>
          </div>
        )}

        {/* Evaluating Phase */}
        {phase === 'evaluating' && (
          <Card className="p-8 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-purple-400 animate-spin" />
            <h3 className="text-lg font-medium text-white mb-2">Generating Summary...</h3>
            <p className="text-gray-400 text-sm">
              Analyzing your {questionResults.length} responses to create your feedback report.
            </p>
          </Card>
        )}

        {/* Feedback Phase */}
        {phase === 'feedback' && feedback && (
          <InterviewSummary
            feedback={feedback}
            companyName={application?.company}
            roleName={application?.role}
            onPracticeAgain={handleReset}
            onBackToPrep={handleBackToPrep}
          />
        )}
      </div>
    </div>
  );
};

export default EnhancedInterviewPage;
