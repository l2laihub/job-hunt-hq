import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApplicationStore, useStoriesStore, useCurrentProfile, toast } from '@/src/stores';
import { useUnifiedActiveProfileId } from '@/src/hooks/useAppData';
import { Button, Card, CardHeader, CardContent, Select, Badge, Abbr } from '@/src/components/ui';
import { InterviewEmptyState } from '@/src/components/shared';
import { cn } from '@/src/lib/utils';
import type { InterviewConfig, InterviewFeedback, TranscriptItem, JobApplication } from '@/src/types';
import {
  Mic,
  MicOff,
  Play,
  Square,
  Settings,
  MessageCircle,
  Brain,
  Clock,
  Award,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Volume2,
  VolumeX,
} from 'lucide-react';

// Interview types for selection
const interviewTypes = [
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'technical', label: 'Technical' },
  { value: 'system-design', label: 'System Design' },
  { value: 'mixed', label: 'Mixed' },
];

const difficulties = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const durations = [
  { value: '10', label: '10 min' },
  { value: '20', label: '20 min' },
  { value: '30', label: '30 min' },
];

export const InterviewPage: React.FC = () => {
  const activeProfileId = useUnifiedActiveProfileId();
  const allApplications = useApplicationStore((s) => s.applications);
  // Filter applications by active profile
  const applications = useMemo(() => {
    if (!activeProfileId) return allApplications;
    return allApplications.filter((app) => !app.profileId || app.profileId === activeProfileId);
  }, [allApplications, activeProfileId]);
  const allStories = useStoriesStore((s) => s.stories);
  // Filter stories by active profile
  const stories = useMemo(() => {
    if (!activeProfileId) return allStories;
    return allStories.filter((s) => !s.profileId || s.profileId === activeProfileId);
  }, [allStories, activeProfileId]);
  const profile = useCurrentProfile();

  const [phase, setPhase] = useState<'setup' | 'active' | 'feedback'>('setup');
  const [config, setConfig] = useState<InterviewConfig>({
    type: 'behavioral',
    difficulty: 'medium',
    duration: 20,
    focusAreas: [],
  });
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Timer
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartInterview = async () => {
    setPhase('active');
    setTranscript([]);
    setElapsedTime(0);

    // Add initial AI message
    const openingMessage: TranscriptItem = {
      role: 'model',
      text: getOpeningMessage(config),
      timestamp: new Date().toISOString(),
    };
    setTranscript([openingMessage]);

    toast.info('Interview started', 'Good luck!');
  };

  const handleEndInterview = () => {
    setIsListening(false);

    // Generate mock feedback (in real implementation, this would call Gemini)
    const mockFeedback: InterviewFeedback = {
      overallScore: 7,
      strengths: [
        'Good use of STAR format in behavioral answers',
        'Clear communication style',
        'Demonstrated relevant experience',
      ],
      weaknesses: [
        'Could provide more specific metrics',
        'Some answers were too lengthy',
      ],
      communication: {
        clarity: 'Good - spoke clearly and organized thoughts well',
        pacing: 'Moderate - could slow down slightly for complex topics',
        confidence: 'Strong - maintained composure throughout',
      },
      technicalAccuracy: config.type !== 'behavioral' ? 'Demonstrated solid fundamentals' : undefined,
      starStructureUse: config.type === 'behavioral' ? 'Used STAR in 3/4 answers' : undefined,
      summary: 'Overall a solid interview performance. Focus on quantifying achievements and being more concise.',
    };

    setFeedback(mockFeedback);
    setPhase('feedback');
    toast.success('Interview complete', 'Review your feedback below');
  };

  const handleReset = () => {
    setPhase('setup');
    setTranscript([]);
    setFeedback(null);
    setElapsedTime(0);
  };

  const toggleListening = () => {
    setIsListening(!isListening);
    if (!isListening) {
      // Start listening - in real implementation, this would use Web Speech API
      toast.info('Listening...', 'Speak your response');
    }
  };

  const getOpeningMessage = (cfg: InterviewConfig): string => {
    const intros: Record<string, string> = {
      behavioral: "Hi! I'll be conducting your behavioral interview today. We'll focus on past experiences that demonstrate key competencies. Let's start with a warmup: Tell me about yourself and what you're looking for in your next role.",
      technical: "Welcome to your technical interview. I'll be asking you questions to assess your coding and problem-solving skills. Feel free to think out loud. Ready to begin?",
      'system-design': "Today we'll be doing a system design interview. I'll present you with a real-world scenario to design. Remember to ask clarifying questions and think through tradeoffs. Let's get started.",
      mixed: "Welcome! Today's interview will cover both behavioral questions and technical concepts. We'll start with some background questions and then move into technical areas. Ready?",
    };
    return intros[cfg.type] || intros.behavioral;
  };

  // Application options for context
  const applicationOptions = applications.map((app) => ({
    value: app.id,
    label: `${app.company} - ${app.role}`,
  }));

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Mic className="w-6 h-6 text-blue-500" />
              Mock Interview
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Practice with AI-powered interview simulation
            </p>
          </div>
          {phase !== 'setup' && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-400">
                <Clock className="w-4 h-4" />
                <span className="font-mono">{formatTime(elapsedTime)}</span>
                <span className="text-gray-600">/ {config.duration}:00</span>
              </div>
              {phase === 'active' && (
                <Button variant="danger" onClick={handleEndInterview} leftIcon={<Square className="w-4 h-4" />}>
                  End Interview
                </Button>
              )}
            </div>
          )}
        </div>

        {phase === 'setup' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Configuration */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Settings className="w-4 h-4" /> Interview Settings
                </h3>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <Select
                  label="Interview Type"
                  value={config.type}
                  onChange={(val) => setConfig({ ...config, type: val as InterviewConfig['type'] })}
                  options={interviewTypes}
                />
                <Select
                  label="Difficulty"
                  value={config.difficulty}
                  onChange={(val) => setConfig({ ...config, difficulty: val as InterviewConfig['difficulty'] })}
                  options={difficulties}
                />
                <Select
                  label="Duration"
                  value={config.duration.toString()}
                  onChange={(val) => setConfig({ ...config, duration: parseInt(val) })}
                  options={durations}
                />
                {applicationOptions.length > 0 && (
                  <Select
                    label="Application Context (Optional)"
                    value={config.contextAppId || ''}
                    onChange={(val) => setConfig({ ...config, contextAppId: val || undefined })}
                    options={[{ value: '', label: 'None' }, ...applicationOptions]}
                  />
                )}
              </CardContent>
            </Card>

            {/* Ready Panel */}
            <Card className="flex flex-col">
              <CardHeader>
                <h3 className="font-semibold text-white">Ready to Practice?</h3>
              </CardHeader>
              <CardContent className="p-4 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
                    <h4 className="text-sm font-semibold text-blue-300 mb-2">Tips for Success</h4>
                    <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
                      <li>Find a quiet space with good lighting</li>
                      <li>Have your resume and notes ready</li>
                      <li>Use the <Abbr variant="subtle">STAR</Abbr> format for behavioral questions</li>
                      <li>Think out loud during technical questions</li>
                    </ul>
                  </div>
                  <div className="text-sm text-gray-500">
                    <span className="text-white font-medium">{stories.length}</span> stories available
                    {config.contextAppId && (
                      <span className="ml-2">
                        • Using context from{' '}
                        {applications.find((a) => a.id === config.contextAppId)?.company}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleStartInterview}
                  leftIcon={<Play className="w-5 h-5" />}
                  className="w-full mt-6"
                >
                  Start Interview
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {phase === 'active' && (
          <div className="space-y-4">
            {/* Transcript */}
            <Card className="h-[400px] flex flex-col">
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
                    className={cn(
                      'flex gap-3',
                      item.role === 'user' ? 'flex-row-reverse' : ''
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                        item.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'
                      )}
                    >
                      {item.role === 'user' ? 'Y' : 'AI'}
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
                      <span className="text-xs text-gray-500 mt-1 block">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </CardContent>
            </Card>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant={isListening ? 'danger' : 'primary'}
                size="lg"
                onClick={toggleListening}
                leftIcon={isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                className={cn(
                  'w-48',
                  isListening && 'animate-pulse'
                )}
              >
                {isListening ? 'Stop Speaking' : 'Start Speaking'}
              </Button>
            </div>

            {/* Status */}
            <div className="text-center text-sm text-gray-500">
              {isListening ? (
                <span className="text-green-400 flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Listening...
                </span>
              ) : isSpeaking ? (
                <span className="text-blue-400 flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  AI is speaking...
                </span>
              ) : (
                'Click the microphone to respond'
              )}
            </div>
          </div>
        )}

        {phase === 'feedback' && feedback && (
          <div className="space-y-6">
            {/* Score */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white">Interview Complete</h3>
                    <p className="text-gray-400 mt-1">
                      Duration: {formatTime(elapsedTime)} • {config.type} interview
                    </p>
                  </div>
                  <div
                    className={cn(
                      'w-20 h-20 rounded-full flex items-center justify-center border-4',
                      feedback.overallScore >= 8
                        ? 'border-green-500 text-green-400'
                        : feedback.overallScore >= 6
                        ? 'border-yellow-500 text-yellow-400'
                        : 'border-red-500 text-red-400'
                    )}
                  >
                    <span className="text-3xl font-bold">{feedback.overallScore}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Strengths & Weaknesses */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-green-400 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Strengths
                  </h3>
                </CardHeader>
                <CardContent className="p-4">
                  <ul className="space-y-2">
                    {feedback.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="text-green-500 mt-1">•</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-yellow-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Areas to Improve
                  </h3>
                </CardHeader>
                <CardContent className="p-4">
                  <ul className="space-y-2">
                    {feedback.weaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="text-yellow-500 mt-1">•</span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Communication */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" /> Communication Analysis
                </h3>
              </CardHeader>
              <CardContent className="p-4 grid md:grid-cols-3 gap-4">
                <div>
                  <span className="text-xs text-gray-500 uppercase">Clarity</span>
                  <p className="text-sm text-gray-300 mt-1">{feedback.communication.clarity}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase">Pacing</span>
                  <p className="text-sm text-gray-300 mt-1">{feedback.communication.pacing}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase">Confidence</span>
                  <p className="text-sm text-gray-300 mt-1">{feedback.communication.confidence}</p>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold text-gray-400 uppercase mb-2">Summary</h4>
                <p className="text-gray-300">{feedback.summary}</p>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-center gap-4">
              <Button
                variant="secondary"
                onClick={handleReset}
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Practice Again
              </Button>
            </div>
          </div>
        )}

        {phase === 'setup' && applications.length === 0 && stories.length === 0 && (
          <Card className="mt-6">
            <InterviewEmptyState />
          </Card>
        )}
      </div>
    </div>
  );
};

export default InterviewPage;
