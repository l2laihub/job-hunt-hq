import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useCurrentProfile, toast } from '@/src/stores';
import { useUnifiedActiveProfileId } from '@/src/hooks/useAppData';
import { useTechnicalAnswers, useStories, useApplications } from '@/src/hooks/useAppData';
import { generateTechnicalAnswer, generateFollowUps } from '@/src/services/gemini';
import { COMMON_TECHNICAL_QUESTIONS, DIFFICULTY_LEVELS, TECHNICAL_QUESTION_TYPES } from '@/src/lib/constants';
import { formatTime, cn, parseMarkdown } from '@/src/lib/utils';
import { Button, Input, Card, Badge, Dialog } from '@/src/components/ui';
import type { TechnicalAnswer, TechnicalQuestionType, AnswerSection, FollowUpQA, PracticeSession } from '@/src/types';
import {
  Zap,
  Loader2,
  Plus,
  Trash2,
  Copy,
  Save,
  ChevronDown,
  ChevronUp,
  Mic,
  MicOff,
  StopCircle,
  Play,
  Pause,
  RotateCcw,
  Search,
  Clock,
  Target,
  MessageSquare,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Sparkles,
  List,
  FileText,
  History,
  Star,
  Volume2,
  Square,
  Circle,
  Eye,
  ArrowLeft,
} from 'lucide-react';

type ViewType = 'list' | 'generate' | 'result' | 'practice' | 'history' | 'details';

const QUESTION_TYPE_COLORS: Record<TechnicalQuestionType, { bg: string; text: string; border: string }> = {
  'behavioral-technical': { bg: 'bg-purple-900/30', text: 'text-purple-400', border: 'border-purple-700/50' },
  conceptual: { bg: 'bg-blue-900/30', text: 'text-blue-400', border: 'border-blue-700/50' },
  'system-design': { bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-700/50' },
  'problem-solving': { bg: 'bg-yellow-900/30', text: 'text-yellow-400', border: 'border-yellow-700/50' },
  experience: { bg: 'bg-pink-900/30', text: 'text-pink-400', border: 'border-pink-700/50' },
};

const LIKELIHOOD_COLORS: Record<string, string> = {
  high: 'bg-red-900/40 text-red-400 border-red-700/50',
  medium: 'bg-yellow-900/40 text-yellow-400 border-yellow-700/50',
  low: 'bg-gray-800 text-gray-400 border-gray-700',
};

export const AnswersPage: React.FC = () => {
  const [view, setView] = useState<ViewType>('list');

  // Use unified hooks that switch between Supabase and localStorage
  const activeProfileId = useUnifiedActiveProfileId();
  const {
    answers: allAnswers,
    addAnswer,
    deleteAnswer,
    searchAnswers,
    recordPractice,
    getPracticeSessions,
  } = useTechnicalAnswers();
  const { stories: allStories } = useStories();
  const { applications: allApplications } = useApplications();

  // Filter answers by active profile
  const answers = useMemo(() => {
    if (!activeProfileId) return allAnswers;
    return allAnswers.filter((a) => !a.profileId || a.profileId === activeProfileId);
  }, [allAnswers, activeProfileId]);

  const profile = useCurrentProfile();
  // Filter stories by active profile
  const stories = useMemo(() => {
    if (!activeProfileId) return allStories;
    return allStories.filter((s) => !s.profileId || s.profileId === activeProfileId);
  }, [allStories, activeProfileId]);

  // Filter applications by active profile
  const applications = useMemo(() => {
    if (!activeProfileId) return allApplications;
    return allApplications.filter((app) => !app.profileId || app.profileId === activeProfileId);
  }, [allApplications, activeProfileId]);

  // Generator State
  const [questionInput, setQuestionInput] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [difficulty, setDifficulty] = useState<'junior' | 'mid' | 'senior' | 'staff'>('mid');
  const [selectedAppId, setSelectedAppId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingFollowUps, setIsGeneratingFollowUps] = useState(false);

  // Result State
  const [generatedResult, setGeneratedResult] = useState<{
    questionType: TechnicalQuestionType;
    format: { type: string; sections: AnswerSection[] };
    answer: { structured: AnswerSection[]; narrative: string; bulletPoints: string[] };
    sources: { storyIds: string[]; profileSections: string[]; synthesized: boolean };
    suggestedTags: string[];
    followUps: FollowUpQA[];
  } | null>(null);
  const [answerView, setAnswerView] = useState<'structured' | 'narrative' | 'bullets'>('structured');
  const [expandedFollowUps, setExpandedFollowUps] = useState<Set<number>>(new Set());

  // List State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<TechnicalQuestionType | ''>('');

  // Practice State
  const [practiceAnswerId, setPracticeAnswerId] = useState<string | null>(null);
  const [isPracticing, setIsPracticing] = useState(false);
  const [practiceTime, setPracticeTime] = useState(0);
  const [showAnswerDuringPractice, setShowAnswerDuringPractice] = useState(false);
  const practiceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio Recording State
  const [isAudioRecording, setIsAudioRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Post-Practice State
  const [showPostPractice, setShowPostPractice] = useState(false);
  const [selfRating, setSelfRating] = useState<number>(3);
  const [practiceNotes, setPracticeNotes] = useState('');

  // History View State
  const [historyAnswerId, setHistoryAnswerId] = useState<string | null>(null);
  const [playingSessionId, setPlayingSessionId] = useState<string | null>(null);

  // Details View State
  const [detailsAnswerId, setDetailsAnswerId] = useState<string | null>(null);
  const [detailsView, setDetailsView] = useState<'structured' | 'narrative' | 'bullets'>('structured');
  const [detailsExpandedFollowUps, setDetailsExpandedFollowUps] = useState<Set<number>>(new Set());

  // Voice Recording for Question Input
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Initialize speech recognition for question input
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setQuestionInput((prev) => prev + ' ' + transcript);
      };
    }
  }, []);

  // Cleanup timer and audio on unmount
  useEffect(() => {
    return () => {
      if (practiceTimerRef.current) clearInterval(practiceTimerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
    };
  }, [audioUrl]);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
    setIsRecording(!isRecording);
  };

  // Audio Recording Functions
  const startAudioRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      setIsAudioRecording(true);
    } catch (err) {
      console.error('Failed to start audio recording:', err);
      toast.error('Microphone access denied', 'Please allow microphone access to record your practice');
    }
  }, []);

  const stopAudioRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsAudioRecording(false);
    }
  }, []);

  const playAudio = useCallback((url: string) => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }

    const audio = new Audio(url);
    audioElementRef.current = audio;

    audio.onplay = () => setIsPlayingAudio(true);
    audio.onended = () => {
      setIsPlayingAudio(false);
      setPlayingSessionId(null);
    };
    audio.onpause = () => setIsPlayingAudio(false);

    audio.play();
  }, []);

  const stopAudio = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
    setIsPlayingAudio(false);
    setPlayingSessionId(null);
  }, []);

  const handleGenerate = async () => {
    const question = questionInput.trim() || selectedQuestion;
    if (!question) {
      toast.error('Missing question', 'Please enter or select a question');
      return;
    }

    setIsGenerating(true);
    setGeneratedResult(null);

    try {
      const appContext = selectedAppId ? applications.find((a) => a.id === selectedAppId) : undefined;

      const result = await generateTechnicalAnswer({
        question,
        profile,
        stories,
        applicationContext: appContext,
        difficulty,
      });

      // Generate follow-ups
      setIsGeneratingFollowUps(true);
      let followUps: FollowUpQA[] = [];
      try {
        followUps = await generateFollowUps(question, result.answer.narrative, profile, result.questionType);
      } catch (e) {
        console.error('Failed to generate follow-ups:', e);
      }
      setIsGeneratingFollowUps(false);

      setGeneratedResult({
        ...result,
        followUps,
      });
      setView('result');
      toast.success('Answer generated!', 'Review and save your answer');
    } catch (e) {
      toast.error('Generation failed', 'Please check your API key and try again');
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (!generatedResult) return;

    const question = questionInput.trim() || selectedQuestion;
    const appContext = selectedAppId ? applications.find((a) => a.id === selectedAppId) : undefined;

    addAnswer({
      question,
      questionType: generatedResult.questionType,
      format: {
        type: generatedResult.format.type as any,
        sections: generatedResult.format.sections,
      },
      sources: generatedResult.sources,
      answer: generatedResult.answer,
      followUps: generatedResult.followUps,
      metadata: {
        difficulty,
        tags: generatedResult.suggestedTags,
        targetRole: appContext?.role,
        targetCompany: appContext?.company,
        applicationId: selectedAppId || undefined,
      },
    }, activeProfileId || undefined);

    toast.success('Answer saved!', 'You can practice and reuse this answer');
    resetForm();
    setView('list');
  };

  const handleDelete = (id: string) => {
    deleteAnswer(id);
    toast.success('Deleted', 'Answer removed');
  };

  const resetForm = () => {
    setQuestionInput('');
    setSelectedQuestion('');
    setDifficulty('mid');
    setSelectedAppId('');
    setGeneratedResult(null);
    setIsRecording(false);
    setExpandedFollowUps(new Set());
  };

  const resetPractice = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setIsAudioRecording(false);
    setShowPostPractice(false);
    setSelfRating(3);
    setPracticeNotes('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied', 'Answer copied to clipboard');
  };

  const startPractice = (answerId: string) => {
    resetPractice();
    setPracticeAnswerId(answerId);
    setPracticeTime(0);
    setIsPracticing(false);
    setShowAnswerDuringPractice(false);
    setView('practice');
  };

  const togglePractice = async () => {
    if (isPracticing) {
      // Pause
      if (practiceTimerRef.current) clearInterval(practiceTimerRef.current);
      stopAudioRecording();
      setIsPracticing(false);
    } else {
      // Start
      setIsPracticing(true);
      await startAudioRecording();
      practiceTimerRef.current = setInterval(() => {
        setPracticeTime((t) => t + 1);
      }, 1000);
    }
  };

  const finishPractice = () => {
    if (practiceTimerRef.current) clearInterval(practiceTimerRef.current);
    stopAudioRecording();
    setIsPracticing(false);
    setShowPostPractice(true);
  };

  const savePracticeSession = async () => {
    if (!practiceAnswerId) return;

    let audioBase64: string | undefined;
    let audioMimeType: string | undefined;

    if (audioBlob) {
      // Convert blob to base64
      const reader = new FileReader();
      audioBase64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          // Remove the data URL prefix
          resolve(base64.split(',')[1]);
        };
        reader.readAsDataURL(audioBlob);
      });
      audioMimeType = audioBlob.type;
    }

    recordPractice(practiceAnswerId, {
      durationSeconds: practiceTime,
      selfRating,
      notes: practiceNotes || undefined,
      audioBlob: audioBase64,
      audioMimeType,
    });

    toast.success('Practice saved!', `Recorded ${formatTime(practiceTime)} with audio`);
    resetPractice();
    setView('list');
    setPracticeAnswerId(null);
    setPracticeTime(0);
  };

  const cancelPractice = () => {
    if (practiceTimerRef.current) clearInterval(practiceTimerRef.current);
    stopAudioRecording();
    resetPractice();
    setView('list');
    setPracticeAnswerId(null);
    setPracticeTime(0);
  };

  const viewHistory = (answerId: string) => {
    setHistoryAnswerId(answerId);
    setView('history');
  };

  const playSessionAudio = (session: PracticeSession) => {
    if (!session.audioBlob || !session.audioMimeType) {
      toast.error('No audio', 'This session has no recorded audio');
      return;
    }

    // Convert base64 back to blob URL
    const byteCharacters = atob(session.audioBlob);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: session.audioMimeType });
    const url = URL.createObjectURL(blob);

    setPlayingSessionId(session.id);
    playAudio(url);
  };

  const toggleFollowUp = (index: number) => {
    setExpandedFollowUps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Filter answers
  const filteredAnswers = React.useMemo(() => {
    let result = answers;
    if (searchQuery) {
      result = searchAnswers(searchQuery);
    }
    if (filterType) {
      result = result.filter((a) => a.questionType === filterType);
    }
    return result;
  }, [answers, searchQuery, filterType, searchAnswers]);

  const practiceAnswer = practiceAnswerId ? answers.find((a) => a.id === practiceAnswerId) : null;
  const historyAnswer = historyAnswerId ? answers.find((a) => a.id === historyAnswerId) : null;
  const historySessions = historyAnswerId ? getPracticeSessions(historyAnswerId) : [];
  const detailsAnswer = detailsAnswerId ? answers.find((a) => a.id === detailsAnswerId) : null;

  // View details function
  const viewDetails = (id: string) => {
    setDetailsAnswerId(id);
    setDetailsView('structured');
    setDetailsExpandedFollowUps(new Set());
    setView('details');
  };

  // Toggle follow-up expansion for details view
  const toggleDetailsFollowUp = (index: number) => {
    setDetailsExpandedFollowUps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Markdown content component
  const MarkdownContent: React.FC<{ content: string; className?: string }> = ({ content, className }) => (
    <div
      className={cn('text-gray-300 text-[15px] leading-[1.8] tracking-wide prose-invert', className)}
      dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
    />
  );

  // Render section content
  const renderSectionContent = (sections: AnswerSection[] | undefined) => {
    if (!sections || sections.length === 0) {
      return (
        <div className="text-gray-500 text-sm italic">
          No structured content available. Try the narrative view instead.
        </div>
      );
    }
    return (
      <div className="space-y-5">
        {sections.map((section, i) => (
          <div key={i} className="bg-gray-800/50 p-5 rounded-lg border border-gray-700/50">
            <span className="text-sm font-bold text-blue-400 uppercase block mb-3">{section.label}</span>
            <MarkdownContent content={section.content} />
          </div>
        ))}
      </div>
    );
  };

  // Render star rating
  const renderStarRating = (rating: number, interactive: boolean = false, onChange?: (r: number) => void) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => interactive && onChange?.(star)}
          disabled={!interactive}
          className={cn(
            'transition-colors',
            interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default',
            star <= rating ? 'text-yellow-400' : 'text-gray-600'
          )}
        >
          <Star className={cn('w-5 h-5', star <= rating && 'fill-yellow-400')} />
        </button>
      ))}
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-500" />
              Answer Prep
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Generate AI-powered answers for technical interview questions
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              resetForm();
              setView('generate');
            }}
            leftIcon={<Plus className="w-4 h-4" />}
            className="bg-yellow-600 hover:bg-yellow-500"
          >
            New Answer
          </Button>
        </div>

        {/* LIST VIEW */}
        {view === 'list' && (
          <>
            {answers.length > 0 ? (
              <>
                {/* Search & Filter */}
                <div className="flex gap-4 items-center">
                  <div className="flex-1">
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search answers..."
                      leftIcon={<Search className="w-4 h-4" />}
                    />
                  </div>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as TechnicalQuestionType | '')}
                    className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300"
                  >
                    <option value="">All Types</option>
                    {TECHNICAL_QUESTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Answers List */}
                <div className="space-y-4">
                  {filteredAnswers.map((answer) => {
                    const colors = QUESTION_TYPE_COLORS[answer.questionType];
                    const sessions = getPracticeSessions(answer.id);
                    const hasRecordings = sessions.some((s) => s.audioBlob);
                    return (
                      <Card key={answer.id} className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded text-[10px] font-bold uppercase border',
                                  colors.bg,
                                  colors.text,
                                  colors.border
                                )}
                              >
                                {answer.questionType.replace('-', ' ')}
                              </span>
                              <span className="text-xs text-gray-500">{answer.format.type}</span>
                              {hasRecordings && (
                                <span className="text-xs text-green-400 flex items-center gap-1">
                                  <Volume2 className="w-3 h-3" />
                                  {sessions.filter((s) => s.audioBlob).length} recordings
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold text-white text-sm">{answer.question}</h3>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => viewDetails(answer.id)}
                              title="View Full Answer"
                              className="text-yellow-400 hover:text-yellow-300"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startPractice(answer.id)}
                              title="Practice"
                              className="text-green-400 hover:text-green-300"
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                            {sessions.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => viewHistory(answer.id)}
                                title="View History"
                                className="text-blue-400 hover:text-blue-300"
                              >
                                <History className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(answer.answer.narrative)}
                              title="Copy"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(answer.id)}
                              title="Delete"
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <p className="text-gray-400 text-xs line-clamp-2 mb-3">
                          {answer.answer.narrative.slice(0, 150)}...
                        </p>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {answer.followUps.length} follow-ups
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Practiced {answer.practiceCount}x
                          </span>
                          {answer.metadata.targetCompany && (
                            <span className="text-blue-400">{answer.metadata.targetCompany}</span>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                  {filteredAnswers.length === 0 && (
                    <div className="text-center py-10 text-gray-500">No answers match your search</div>
                  )}
                </div>
              </>
            ) : (
              <Card className="min-h-[400px] flex flex-col items-center justify-center text-center p-8">
                <Zap className="w-16 h-16 text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Answers Yet</h3>
                <p className="text-gray-400 mb-6 max-w-md">
                  Generate AI-powered answers to technical interview questions based on your profile and experiences.
                </p>
                <Button
                  variant="primary"
                  onClick={() => setView('generate')}
                  leftIcon={<Sparkles className="w-4 h-4" />}
                  className="bg-yellow-600 hover:bg-yellow-500"
                >
                  Generate Your First Answer
                </Button>
              </Card>
            )}
          </>
        )}

        {/* GENERATE VIEW */}
        {view === 'generate' && (
          <Card className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-white">Generate Technical Answer</h3>
              <Button variant="ghost" size="sm" onClick={() => setView('list')}>
                Cancel
              </Button>
            </div>

            {/* Question Input */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Interview Question</label>
              <div className="relative">
                <textarea
                  value={questionInput}
                  onChange={(e) => {
                    setQuestionInput(e.target.value);
                    setSelectedQuestion('');
                  }}
                  className="w-full h-24 bg-gray-900 border border-gray-700 rounded-lg p-4 text-sm text-white focus:ring-1 focus:ring-yellow-500 outline-none resize-none"
                  placeholder="Type your technical question or use voice input..."
                />
                <button
                  onClick={toggleRecording}
                  className={cn(
                    'absolute bottom-3 right-3 p-2 rounded-full transition-colors',
                    isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  )}
                >
                  {isRecording ? <StopCircle className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Common Questions */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Or Select Common Question</label>
              <select
                value={selectedQuestion}
                onChange={(e) => {
                  setSelectedQuestion(e.target.value);
                  setQuestionInput('');
                }}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white"
              >
                <option value="">Select a question...</option>
                {COMMON_TECHNICAL_QUESTIONS.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </div>

            {/* Options Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Difficulty Level</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white"
                >
                  {DIFFICULTY_LEVELS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Target Application (Optional)</label>
                <select
                  value={selectedAppId}
                  onChange={(e) => setSelectedAppId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-400"
                >
                  <option value="">General preparation</option>
                  {applications.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.company} - {a.role}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Generate Button */}
            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={isGenerating || (!questionInput.trim() && !selectedQuestion)}
              isLoading={isGenerating}
              leftIcon={<Sparkles className="w-5 h-5" />}
              className="w-full py-4 bg-yellow-600 hover:bg-yellow-500"
            >
              Generate Answer
            </Button>
          </Card>
        )}

        {/* RESULT VIEW */}
        {view === 'result' && generatedResult && (
          <div className="space-y-6">
            <Card className="p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-white">Generated Answer</h3>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                      QUESTION_TYPE_COLORS[generatedResult.questionType].bg,
                      QUESTION_TYPE_COLORS[generatedResult.questionType].text
                    )}
                  >
                    {generatedResult.questionType.replace('-', ' ')}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setView('generate')}>
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Regenerate
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSave}
                    leftIcon={<Save className="w-4 h-4" />}
                    className="bg-green-600 hover:bg-green-500"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </Card>

            {/* Question */}
            <Card className="p-4">
              <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Question</span>
              <p className="text-white font-medium">{questionInput || selectedQuestion}</p>
            </Card>

            {/* Answer View Toggle */}
            <div className="flex gap-2">
              <Button
                variant={answerView === 'structured' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setAnswerView('structured')}
                leftIcon={<List className="w-4 h-4" />}
                className={answerView === 'structured' ? 'bg-yellow-600' : ''}
              >
                Structured
              </Button>
              <Button
                variant={answerView === 'narrative' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setAnswerView('narrative')}
                leftIcon={<MessageSquare className="w-4 h-4" />}
                className={answerView === 'narrative' ? 'bg-yellow-600' : ''}
              >
                Narrative
              </Button>
              <Button
                variant={answerView === 'bullets' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setAnswerView('bullets')}
                leftIcon={<CheckCircle className="w-4 h-4" />}
                className={answerView === 'bullets' ? 'bg-yellow-600' : ''}
              >
                Key Points
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(generatedResult.answer.narrative)}
                className="ml-auto"
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </Button>
            </div>

            {/* Answer Content */}
            <Card className="p-4">
              {answerView === 'structured' && renderSectionContent(generatedResult.answer.structured)}
              {answerView === 'narrative' && (
                <MarkdownContent content={generatedResult.answer.narrative} />
              )}
              {answerView === 'bullets' && (
                generatedResult.answer.bulletPoints && generatedResult.answer.bulletPoints.length > 0 ? (
                  <ul className="space-y-2">
                    {generatedResult.answer.bulletPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <MarkdownContent content={point} className="flex-1" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-500 text-sm italic">
                    No bullet points available. Try the narrative view instead.
                  </div>
                )
              )}
            </Card>

            {/* Sources */}
            {((generatedResult.sources?.storyIds?.length || 0) > 0 || (generatedResult.sources?.profileSections?.length || 0) > 0) && (
              <Card className="p-4 bg-blue-900/10 border-blue-800/30">
                <h4 className="text-xs font-bold text-blue-400 uppercase mb-2">Sources Used</h4>
                <div className="flex flex-wrap gap-2">
                  {(generatedResult.sources?.profileSections || []).map((s) => (
                    <Badge key={s} variant="info" size="sm">
                      Profile: {s}
                    </Badge>
                  ))}
                  {(generatedResult.sources?.storyIds || []).map((id) => {
                    const story = stories.find((s) => s.id === id);
                    return story ? (
                      <Badge key={id} variant="default" size="sm" className="bg-purple-900/30 text-purple-300">
                        Story: {story.title}
                      </Badge>
                    ) : null;
                  })}
                  {generatedResult.sources?.synthesized && (
                    <Badge variant="warning" size="sm">
                      AI Synthesized
                    </Badge>
                  )}
                </div>
              </Card>
            )}

            {/* Tags */}
            {(generatedResult.suggestedTags?.length || 0) > 0 && (
              <div className="flex flex-wrap gap-2">
                {(generatedResult.suggestedTags || []).map((tag) => (
                  <Badge key={tag} variant="default" size="sm">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Follow-ups */}
            <Card className="p-4">
              <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                Likely Follow-up Questions
                {isGeneratingFollowUps && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
              </h4>
              <div className="space-y-3">
                {(generatedResult.followUps || []).map((fu, i) => (
                  <div key={i} className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
                    <button
                      onClick={() => toggleFollowUp(i)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-800/80"
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold uppercase border', LIKELIHOOD_COLORS[fu.likelihood])}>
                          {fu.likelihood}
                        </span>
                        <span className="text-sm text-white">{fu.question}</span>
                      </div>
                      {expandedFollowUps.has(i) ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    {expandedFollowUps.has(i) && (
                      <div className="px-4 pb-4 border-t border-gray-700 pt-3 space-y-3">
                        <div>
                          <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Suggested Answer</span>
                          <MarkdownContent content={fu.suggestedAnswer} />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Key Points</span>
                          <ul className="space-y-1">
                            {fu.keyPoints.map((kp, j) => (
                              <li key={j} className="text-xs text-gray-400 flex items-start gap-2">
                                <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                                <MarkdownContent content={kp} className="flex-1 text-xs" />
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* PRACTICE VIEW */}
        {view === 'practice' && practiceAnswer && !showPostPractice && (
          <Card className="p-8 flex flex-col items-center justify-center min-h-[500px] space-y-8">
            {/* Recording Indicator */}
            {isAudioRecording && (
              <div className="flex items-center gap-2 text-red-400 animate-pulse">
                <Circle className="w-3 h-3 fill-red-500" />
                <span className="text-sm font-medium">Recording...</span>
              </div>
            )}

            {/* Timer */}
            <div className="text-center">
              <div className="text-6xl font-mono text-white mb-2">{formatTime(practiceTime)}</div>
              <p className="text-gray-400 text-sm">
                {isAudioRecording ? 'Recording your answer...' : 'Press play to start recording'}
              </p>
            </div>

            {/* Question */}
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 max-w-2xl w-full text-center">
              <span className="text-xs font-bold text-gray-500 uppercase block mb-2">Question</span>
              <p className="text-white text-lg font-medium">{practiceAnswer.question}</p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              <Button
                variant={isPracticing ? 'danger' : 'primary'}
                size="lg"
                onClick={togglePractice}
                className={cn('p-6 rounded-full', isPracticing ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500')}
              >
                {isPracticing ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
              </Button>
            </div>

            {/* Audio Preview (after recording stopped) */}
            {audioUrl && !isPracticing && (
              <div className="flex items-center gap-4 bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => (isPlayingAudio ? stopAudio() : playAudio(audioUrl))}
                  className="text-blue-400"
                >
                  {isPlayingAudio ? <Square className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                <span className="text-sm text-gray-400">Preview your recording</span>
              </div>
            )}

            {/* Toggle Answer */}
            <Button variant="ghost" onClick={() => setShowAnswerDuringPractice(!showAnswerDuringPractice)}>
              <BookOpen className="w-4 h-4 mr-2" />
              {showAnswerDuringPractice ? 'Hide Answer' : 'Show Answer'}
            </Button>

            {showAnswerDuringPractice && (
              <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 max-w-2xl w-full max-h-48 overflow-y-auto">
                <p className="text-gray-300 text-sm">{practiceAnswer.answer.narrative}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button variant="ghost" onClick={cancelPractice}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={finishPractice}
                disabled={practiceTime === 0}
                className="bg-yellow-600 hover:bg-yellow-500"
              >
                Finish & Review
              </Button>
            </div>
          </Card>
        )}

        {/* POST-PRACTICE REVIEW */}
        {view === 'practice' && practiceAnswer && showPostPractice && (
          <Card className="p-8 max-w-2xl mx-auto space-y-6">
            <h3 className="text-xl font-semibold text-white text-center">Practice Session Complete!</h3>

            {/* Duration */}
            <div className="text-center">
              <span className="text-4xl font-mono text-green-400">{formatTime(practiceTime)}</span>
              <p className="text-gray-400 text-sm mt-1">Total practice time</p>
            </div>

            {/* Audio Playback */}
            {audioUrl && (
              <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Your recorded answer</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => (isPlayingAudio ? stopAudio() : playAudio(audioUrl))}
                    leftIcon={isPlayingAudio ? <Square className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    className="text-blue-400"
                  >
                    {isPlayingAudio ? 'Stop' : 'Play Recording'}
                  </Button>
                </div>
              </div>
            )}

            {/* Self Rating */}
            <div>
              <label className="text-sm text-gray-400 block mb-3 text-center">How did you do?</label>
              <div className="flex justify-center">{renderStarRating(selfRating, true, setSelfRating)}</div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm text-gray-400 block mb-2">Notes (optional)</label>
              <textarea
                value={practiceNotes}
                onChange={(e) => setPracticeNotes(e.target.value)}
                placeholder="What went well? What could be improved?"
                className="w-full h-24 bg-gray-900 border border-gray-700 rounded-lg p-4 text-sm text-white focus:ring-1 focus:ring-yellow-500 outline-none resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4 justify-center">
              <Button variant="ghost" onClick={cancelPractice}>
                Discard
              </Button>
              <Button variant="primary" onClick={savePracticeSession} className="bg-green-600 hover:bg-green-500">
                <Save className="w-4 h-4 mr-2" />
                Save Practice Session
              </Button>
            </div>
          </Card>
        )}

        {/* DETAILS VIEW - View full answer details */}
        {view === 'details' && detailsAnswer && (
          <div className="space-y-6">
            {/* Header with Back button */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-bold uppercase border',
                      QUESTION_TYPE_COLORS[detailsAnswer.questionType].bg,
                      QUESTION_TYPE_COLORS[detailsAnswer.questionType].text,
                      QUESTION_TYPE_COLORS[detailsAnswer.questionType].border
                    )}
                  >
                    {detailsAnswer.questionType.replace('-', ' ')}
                  </span>
                  <span className="text-xs text-gray-500">{detailsAnswer.format.type}</span>
                  {detailsAnswer.metadata.targetCompany && (
                    <span className="text-xs text-blue-400">{detailsAnswer.metadata.targetCompany}</span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-white">{detailsAnswer.question}</h3>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => startPractice(detailsAnswer.id)}
                  className="text-green-400 hover:text-green-300"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Practice
                </Button>
                <Button variant="ghost" onClick={() => setView('list')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>
            </div>

            {/* View Tabs */}
            <div className="flex gap-2 p-1 bg-gray-800 rounded-lg w-fit">
              <button
                onClick={() => setDetailsView('structured')}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2',
                  detailsView === 'structured'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                )}
              >
                <List className="w-4 h-4" />
                Structured
              </button>
              <button
                onClick={() => setDetailsView('narrative')}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2',
                  detailsView === 'narrative'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                )}
              >
                <FileText className="w-4 h-4" />
                Narrative
              </button>
              <button
                onClick={() => setDetailsView('bullets')}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2',
                  detailsView === 'bullets'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                )}
              >
                <CheckCircle className="w-4 h-4" />
                Bullets
              </button>
            </div>

            {/* Answer Content */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-white">Answer</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(detailsAnswer.answer.narrative)}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
              </div>

              {detailsView === 'structured' && renderSectionContent(detailsAnswer.answer.structured)}

              {detailsView === 'narrative' && (
                detailsAnswer.answer.narrative ? (
                  <MarkdownContent content={detailsAnswer.answer.narrative} />
                ) : (
                  <p className="text-gray-500 text-sm italic">No narrative content available.</p>
                )
              )}

              {detailsView === 'bullets' && (
                (detailsAnswer.answer.bulletPoints?.length || 0) > 0 ? (
                  <ul className="space-y-2">
                    {(detailsAnswer.answer.bulletPoints || []).map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <MarkdownContent content={point} className="flex-1" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-500 text-sm italic">
                    No bullet points available. Try the narrative view instead.
                  </div>
                )
              )}
            </Card>

            {/* Format Sections */}
            {(detailsAnswer.format.sections?.length || 0) > 0 && (
              <Card className="p-5">
                <h4 className="text-sm font-bold text-white mb-4">Format Structure ({detailsAnswer.format.type})</h4>
                <div className="space-y-3">
                  {(detailsAnswer.format.sections || []).map((section, i) => (
                    <div key={i} className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                      <span className="text-xs font-bold text-purple-400 uppercase">{section.label}</span>
                      <MarkdownContent content={section.content} className="mt-1" />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Sources */}
            {((detailsAnswer.sources?.storyIds?.length || 0) > 0 || (detailsAnswer.sources?.profileSections?.length || 0) > 0) && (
              <Card className="p-5 bg-blue-900/10 border-blue-800/30">
                <h4 className="text-sm font-bold text-blue-400 mb-3">Sources Used</h4>
                <div className="flex flex-wrap gap-2">
                  {(detailsAnswer.sources?.profileSections || []).map((s) => (
                    <Badge key={s} variant="info" size="sm">
                      Profile: {s}
                    </Badge>
                  ))}
                  {(detailsAnswer.sources?.storyIds || []).map((id) => {
                    const story = stories.find((s) => s.id === id);
                    return story ? (
                      <Badge key={id} variant="default" size="sm" className="bg-purple-900/30 text-purple-300">
                        Story: {story.title}
                      </Badge>
                    ) : null;
                  })}
                  {detailsAnswer.sources?.synthesized && (
                    <Badge variant="warning" size="sm">
                      AI Synthesized
                    </Badge>
                  )}
                </div>
              </Card>
            )}

            {/* Tags */}
            {(detailsAnswer.metadata.tags?.length || 0) > 0 && (
              <Card className="p-5">
                <h4 className="text-sm font-bold text-white mb-3">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {(detailsAnswer.metadata.tags || []).map((tag) => (
                    <Badge key={tag} variant="default" size="sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* Follow-up Questions */}
            {(detailsAnswer.followUps?.length || 0) > 0 && (
              <Card className="p-5">
                <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400" />
                  Follow-up Questions ({detailsAnswer.followUps.length})
                </h4>
                <div className="space-y-3">
                  {(detailsAnswer.followUps || []).map((fu, i) => (
                    <div key={i} className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
                      <button
                        onClick={() => toggleDetailsFollowUp(i)}
                        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-800/80"
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold uppercase border', LIKELIHOOD_COLORS[fu.likelihood])}>
                            {fu.likelihood}
                          </span>
                          <span className="text-sm text-white">{fu.question}</span>
                        </div>
                        {detailsExpandedFollowUps.has(i) ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      {detailsExpandedFollowUps.has(i) && (
                        <div className="px-4 pb-4 border-t border-gray-700 pt-3 space-y-3">
                          <div>
                            <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Suggested Answer</span>
                            <MarkdownContent content={fu.suggestedAnswer} />
                          </div>
                          {(fu.keyPoints?.length || 0) > 0 && (
                            <div>
                              <span className="text-xs font-bold text-gray-500 uppercase block mb-2">Key Points</span>
                              <ul className="space-y-1">
                                {(fu.keyPoints || []).map((point, j) => (
                                  <li key={j} className="flex items-start gap-2 text-xs text-gray-400">
                                    <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                                    <MarkdownContent content={point} className="flex-1 text-xs" />
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Metadata */}
            <Card className="p-5">
              <h4 className="text-sm font-bold text-white mb-3">Stats & Metadata</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="bg-gray-800/50 p-3 rounded-lg">
                  <span className="text-2xl font-mono text-white">{detailsAnswer.practiceCount}</span>
                  <span className="text-xs text-gray-500 block mt-1">Practices</span>
                </div>
                <div className="bg-gray-800/50 p-3 rounded-lg">
                  <span className="text-2xl font-mono text-white">{detailsAnswer.timesUsed}</span>
                  <span className="text-xs text-gray-500 block mt-1">Times Used</span>
                </div>
                <div className="bg-gray-800/50 p-3 rounded-lg">
                  <span className="text-2xl font-mono text-white">{detailsAnswer.followUps?.length || 0}</span>
                  <span className="text-xs text-gray-500 block mt-1">Follow-ups</span>
                </div>
                <div className="bg-gray-800/50 p-3 rounded-lg">
                  <span className="text-sm font-mono text-white">{detailsAnswer.metadata.difficulty || 'mid'}</span>
                  <span className="text-xs text-gray-500 block mt-1">Difficulty</span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
                <span>Created: {new Date(detailsAnswer.createdAt).toLocaleDateString()}</span>
                {detailsAnswer.lastPracticedAt && (
                  <span>Last practiced: {new Date(detailsAnswer.lastPracticedAt).toLocaleDateString()}</span>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* HISTORY VIEW */}
        {view === 'history' && historyAnswer && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-400" />
                  Practice History
                </h3>
                <p className="text-gray-400 text-sm mt-1 line-clamp-1">{historyAnswer.question}</p>
              </div>
              <Button variant="ghost" onClick={() => setView('list')}>
                Back to List
              </Button>
            </div>

            {historySessions.length > 0 ? (
              <div className="space-y-4">
                {historySessions.map((session) => (
                  <Card key={session.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-mono text-white">{formatTime(session.durationSeconds || 0)}</span>
                        {session.selfRating && renderStarRating(session.selfRating)}
                      </div>
                      <div className="flex items-center gap-2">
                        {session.audioBlob && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              playingSessionId === session.id ? stopAudio() : playSessionAudio(session)
                            }
                            className={cn(
                              playingSessionId === session.id ? 'text-red-400' : 'text-blue-400'
                            )}
                          >
                            {playingSessionId === session.id ? (
                              <>
                                <Square className="w-4 h-4 mr-1" />
                                Stop
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-4 h-4 mr-1" />
                                Play
                              </>
                            )}
                          </Button>
                        )}
                        <span className="text-xs text-gray-500">
                          {new Date(session.createdAt).toLocaleDateString()} at{' '}
                          {new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    {session.notes && (
                      <p className="text-sm text-gray-400 bg-gray-800/50 p-3 rounded-lg">{session.notes}</p>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <History className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No practice sessions recorded yet</p>
                <Button
                  variant="primary"
                  onClick={() => startPractice(historyAnswer.id)}
                  className="mt-4 bg-green-600 hover:bg-green-500"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Practice
                </Button>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnswersPage;
