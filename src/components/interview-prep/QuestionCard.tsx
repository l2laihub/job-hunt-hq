import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useInterviewPrepStore, toast } from '@/src/stores';
import { Button, Card, Badge, Select } from '@/src/components/ui';
import { cn } from '@/src/lib/utils';
import type { PredictedQuestion, Experience, QuestionCategory, LikelihoodLevel, UserProfile, JDAnalysis, CompanyResearch } from '@/src/types';
import { QUESTION_CATEGORIES } from '@/src/types';
import {
  CheckCircle,
  Circle,
  ChevronDown,
  ChevronUp,
  Link,
  Unlink,
  Lightbulb,
  Target,
  Sparkles,
  Eye,
  MessageSquare,
  BookOpen,
  FileText,
  Mic,
  MicOff,
  Square,
  Clock,
  Star,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Dialog } from '@/src/components/ui';
import { GenerateAnswerModal } from './GenerateAnswerModal';
import { generateNarrative, isGeminiAvailable } from '@/src/services/gemini';

interface QuestionCardProps {
  question: PredictedQuestion;
  sessionId: string;
  stories: Experience[];
  onPractice?: (questionId: string) => void;
  // For answer generation
  profile?: UserProfile;
  analysis?: JDAnalysis;
  research?: CompanyResearch;
  company?: string;
  role?: string;
}

// Category colors
const categoryColors: Record<QuestionCategory, string> = {
  behavioral: 'bg-purple-900/40 text-purple-400 border-purple-700/50',
  technical: 'bg-blue-900/40 text-blue-400 border-blue-700/50',
  situational: 'bg-green-900/40 text-green-400 border-green-700/50',
  'role-specific': 'bg-yellow-900/40 text-yellow-400 border-yellow-700/50',
  'company-specific': 'bg-pink-900/40 text-pink-400 border-pink-700/50',
};

// Likelihood colors
const likelihoodColors: Record<LikelihoodLevel, string> = {
  high: 'bg-red-900/40 text-red-400 border-red-700/50',
  medium: 'bg-yellow-900/40 text-yellow-400 border-yellow-700/50',
  low: 'bg-gray-800 text-gray-400 border-gray-700',
};

// Difficulty indicator
const DifficultyIndicator: React.FC<{ difficulty: 'easy' | 'medium' | 'hard' }> = ({ difficulty }) => {
  const dots = { easy: 1, medium: 2, hard: 3 };
  const colors = {
    easy: 'bg-green-400',
    medium: 'bg-yellow-400',
    hard: 'bg-red-400',
  };

  return (
    <div className="flex items-center gap-1" title={`${difficulty} difficulty`}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            i <= dots[difficulty] ? colors[difficulty] : 'bg-gray-700'
          )}
        />
      ))}
    </div>
  );
};

// Format seconds to MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Practice Modal Component with Voice Recording
const PracticeModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  question: PredictedQuestion;
  story: Experience;
  onComplete: (rating: number) => void;
}> = ({ isOpen, onClose, question, story, onComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [selfRating, setSelfRating] = useState(0);
  const [showReference, setShowReference] = useState(false);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          toast.error('Voice error', 'Speech recognition failed. Please try again.');
        }
      };
    }

    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  // Timer
  useEffect(() => {
    if (isOpen && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, isPaused]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setIsRecording(false);
      setTranscript('');
      setElapsedTime(0);
      setIsPaused(false);
      setSelfRating(0);
      setShowReference(false);
      recognitionRef.current?.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isOpen]);

  const toggleRecording = useCallback(() => {
    if (!recognitionRef.current) {
      toast.error('Not supported', 'Voice recording is not supported in your browser.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      recognitionRef.current.start();
    }
    setIsRecording(!isRecording);
  }, [isRecording]);

  const handleFinish = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
    if (selfRating > 0) {
      onComplete(selfRating);
      onClose();
    } else {
      toast.info('Rate yourself', 'Please rate your practice before finishing.');
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Practice Your Answer"
      size="full"
      className="!max-w-[1200px]"
    >
      <div className="p-4 md:p-6 space-y-6">
        {/* Question Header */}
        <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-800/30">
          <p className="text-xs text-blue-400 font-medium mb-2 uppercase tracking-wide">Interview Question</p>
          <p className="text-lg text-white leading-relaxed">{question.question}</p>
        </div>

        {/* Timer and Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-2xl font-mono text-white">
              <Clock className="w-5 h-5 text-gray-400" />
              {formatTime(elapsedTime)}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={showReference ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setShowReference(!showReference)}
            >
              <Eye className="w-4 h-4 mr-2" />
              {showReference ? 'Hide' : 'Show'} Reference
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Recording Area */}
          <div className="space-y-4">
            {/* Recording Button */}
            <div className="flex flex-col items-center justify-center p-8 bg-gray-800/50 rounded-xl border border-gray-700">
              <button
                onClick={toggleRecording}
                className={cn(
                  "w-24 h-24 rounded-full flex items-center justify-center transition-all",
                  isRecording
                    ? "bg-red-600 hover:bg-red-500 animate-pulse"
                    : "bg-blue-600 hover:bg-blue-500"
                )}
              >
                {isRecording ? (
                  <MicOff className="w-10 h-10 text-white" />
                ) : (
                  <Mic className="w-10 h-10 text-white" />
                )}
              </button>
              <p className="mt-4 text-sm text-gray-400">
                {isRecording ? 'Recording... Click to stop' : 'Click to start recording your answer'}
              </p>
              {!('webkitSpeechRecognition' in window) && (
                <p className="mt-2 text-xs text-yellow-400">
                  Voice recording not supported in this browser
                </p>
              )}
            </div>

            {/* Transcript */}
            <Card className="p-4">
              <h4 className="text-sm font-semibold text-gray-400 mb-2">Your Response</h4>
              <div className="min-h-[150px] max-h-[300px] overflow-y-auto">
                {transcript ? (
                  <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{transcript}</p>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    Your spoken answer will appear here as you speak...
                  </p>
                )}
              </div>
            </Card>

            {/* Self Rating */}
            <Card className="p-4">
              <h4 className="text-sm font-semibold text-gray-400 mb-3">Rate Your Answer</h4>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setSelfRating(rating)}
                    title={`Rate ${rating} star${rating > 1 ? 's' : ''}`}
                    aria-label={`Rate ${rating} star${rating > 1 ? 's' : ''}`}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      selfRating >= rating
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    )}
                  >
                    <Star
                      className="w-6 h-6"
                      fill={selfRating >= rating ? 'currentColor' : 'none'}
                    />
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Right: Reference (collapsible) */}
          <div className={cn(
            "space-y-4 transition-opacity",
            showReference ? "opacity-100" : "opacity-30 pointer-events-none"
          )}>
            <Card className="p-4 bg-gradient-to-br from-gray-800/80 to-gray-900/80 border-gray-700">
              <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4" />
                Reference Answer
              </h4>
              <div className="space-y-3 text-sm text-gray-300 leading-relaxed max-h-[400px] overflow-y-auto">
                <p>{story.star.situation}</p>
                <p>{story.star.task}</p>
                <p>{story.star.action}</p>
                <p className="font-medium text-white">{story.star.result}</p>
              </div>
            </Card>

            {/* Key Points to Remember */}
            {story.metrics.primary && (
              <Card className="p-4 bg-green-900/20 border-green-800/30">
                <h4 className="text-sm font-semibold text-green-400 flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4" />
                  Key Metrics to Mention
                </h4>
                <p className="text-lg font-bold text-white">{story.metrics.primary}</p>
              </Card>
            )}

            {story.coachingNotes && (
              <Card className="p-4 bg-yellow-900/20 border-yellow-800/30">
                <h4 className="text-sm font-semibold text-yellow-400 flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4" />
                  Remember
                </h4>
                <p className="text-sm text-gray-300">{story.coachingNotes}</p>
              </Card>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t border-gray-700">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleFinish} disabled={selfRating === 0}>
            <Square className="w-4 h-4 mr-2" />
            Finish Practice
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

// View Story Modal (read-only) with AI-generated narrative
// Enhanced to show full generated answer content when available
const ViewStoryModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  question: PredictedQuestion;
  story: Experience;
}> = ({ isOpen, onClose, question, story }) => {
  const [narrativeText, setNarrativeText] = useState<string>('');
  const [isGeneratingNarrative, setIsGeneratingNarrative] = useState(false);
  const [narrativeError, setNarrativeError] = useState<string | null>(null);
  const [showNarrative, setShowNarrative] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0, 1, 2, 3, 4, 5]));

  // Check if this story has generated answer metadata
  const hasGeneratedMetadata = !!story.generatedAnswerMetadata;
  const metadata = story.generatedAnswerMetadata;

  // Get format info for display
  const getFormatInfo = () => {
    if (!metadata) return null;
    const formatMap: Record<string, { name: string; color: string; icon: string }> = {
      'STAR': { name: 'STAR Format', color: 'purple', icon: 'story' },
      'Requirements-Design-Tradeoffs': { name: 'System Design', color: 'blue', icon: 'architecture' },
      'Explain-Example-Tradeoffs': { name: 'Conceptual', color: 'green', icon: 'lightbulb' },
      'Approach-Implementation-Complexity': { name: 'Problem Solving', color: 'orange', icon: 'code' },
    };
    return formatMap[metadata.answerFormat] || { name: 'General', color: 'gray', icon: 'message' };
  };

  const formatInfo = getFormatInfo();

  // Toggle section expansion
  const toggleSection = (index: number) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Generate AI narrative (for legacy stories without metadata)
  const handleGenerateNarrative = useCallback(async () => {
    if (!isGeminiAvailable()) {
      toast.error('AI not available', 'Configure your Gemini API key to generate narratives');
      return;
    }

    setIsGeneratingNarrative(true);
    setNarrativeError(null);

    try {
      const narrative = await generateNarrative({
        story,
        question: question.question,
        targetDuration: '2min',
      });
      setNarrativeText(narrative);
    } catch (error) {
      console.error('Failed to generate narrative:', error);
      setNarrativeError('Failed to generate narrative. Please try again.');
    } finally {
      setIsGeneratingNarrative(false);
    }
  }, [story, question.question]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setNarrativeText('');
      setNarrativeError(null);
      setShowNarrative(true);
      setExpandedSections(new Set([0, 1, 2, 3, 4, 5]));
    }
  }, [isOpen]);

  // Render enhanced view for generated answers with metadata
  if (hasGeneratedMetadata && metadata) {
    return (
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        title="View Generated Answer"
        size="full"
        className="!max-w-[1200px]"
      >
        <div className="p-4 md:p-6 space-y-6 max-h-[85vh] overflow-y-auto">
          {/* Question Header */}
          <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-800/30">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex-1">
                <p className="text-xs text-blue-400 font-medium mb-2 uppercase tracking-wide">Interview Question</p>
                <p className="text-base md:text-lg text-white leading-relaxed">{question.question}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className={cn('text-xs', likelihoodColors[question.likelihood])}>
                  {question.likelihood}
                </Badge>
                <Badge className={cn('text-xs', categoryColors[question.category])}>
                  {question.category}
                </Badge>
              </div>
            </div>
          </div>

          {/* Format Badge & Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {formatInfo && (
                <div className={cn(
                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium',
                  formatInfo.color === 'purple' && 'bg-purple-900/30 text-purple-400 border border-purple-800/50',
                  formatInfo.color === 'blue' && 'bg-blue-900/30 text-blue-400 border border-blue-800/50',
                  formatInfo.color === 'green' && 'bg-green-900/30 text-green-400 border border-green-800/50',
                  formatInfo.color === 'orange' && 'bg-orange-900/30 text-orange-400 border border-orange-800/50',
                )}>
                  {formatInfo.name}
                </div>
              )}
              <h3 className="text-xl md:text-2xl font-bold text-white">{story.title}</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNarrative(!showNarrative)}
              className="text-xs"
            >
              {showNarrative ? 'Show Structured' : 'Show Narrative'}
            </Button>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {story.tags.map((tag) => (
              <Badge key={tag} variant="primary" className="text-xs md:text-sm">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Narrative or Structured View */}
              {showNarrative ? (
                <Card className="p-4 md:p-5 bg-gradient-to-br from-gray-800/80 to-gray-900/80 border-gray-700">
                  <h4 className="text-sm md:text-base font-semibold text-emerald-400 flex items-center gap-2 mb-4">
                    <FileText className="w-4 h-4 md:w-5 md:h-5" />
                    Conversational Answer
                  </h4>
                  <div
                    className="text-[15px] text-gray-200 leading-[1.8] tracking-wide whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{
                      __html: metadata.narrative
                        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/`(.*?)`/g, '<code class="bg-gray-800 px-1 rounded text-blue-300">$1</code>')
                    }}
                  />
                </Card>
              ) : (
                <Card className="p-4 md:p-5 space-y-3">
                  <h4 className="text-sm md:text-base font-semibold text-blue-400 flex items-center gap-2">
                    <Target className="w-4 h-4 md:w-5 md:h-5" />
                    {formatInfo?.name || 'Structured'} Breakdown
                  </h4>
                  {metadata.sections.map((section, index) => {
                    const colors = ['purple', 'blue', 'green', 'yellow', 'cyan', 'pink'];
                    const color = colors[index % colors.length];
                    const isExpanded = expandedSections.has(index);

                    return (
                      <div
                        key={index}
                        className={cn(
                          'rounded-lg border-l-4 overflow-hidden',
                          color === 'purple' && 'bg-purple-900/10 border-l-purple-500',
                          color === 'blue' && 'bg-blue-900/10 border-l-blue-500',
                          color === 'green' && 'bg-green-900/10 border-l-green-500',
                          color === 'yellow' && 'bg-yellow-900/10 border-l-yellow-500',
                          color === 'cyan' && 'bg-cyan-900/10 border-l-cyan-500',
                          color === 'pink' && 'bg-pink-900/10 border-l-pink-500',
                        )}
                      >
                        <button
                          onClick={() => toggleSection(index)}
                          className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-800/30 transition-colors"
                        >
                          <span className={cn(
                            'text-xs font-bold uppercase tracking-wide',
                            color === 'purple' && 'text-purple-400',
                            color === 'blue' && 'text-blue-400',
                            color === 'green' && 'text-green-400',
                            color === 'yellow' && 'text-yellow-400',
                            color === 'cyan' && 'text-cyan-400',
                            color === 'pink' && 'text-pink-400',
                          )}>
                            {section.label}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                        {isExpanded && (
                          <div className="px-3 pb-3">
                            <p className="text-sm text-gray-300 leading-[1.7] tracking-wide whitespace-pre-wrap">
                              {section.content}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </Card>
              )}

              {/* Key Metrics */}
              {(story.metrics.primary || story.metrics.secondary.length > 0) && (
                <Card className="p-4 bg-green-900/20 border-green-800/30">
                  <h4 className="text-sm font-semibold text-green-400 flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4" />
                    Key Metrics & Results
                  </h4>
                  {story.metrics.primary && (
                    <div className="text-lg md:text-xl font-bold text-white mb-2">{story.metrics.primary}</div>
                  )}
                  {story.metrics.secondary.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {story.metrics.secondary.map((metric, i) => (
                        <Badge key={i} variant="default" className="text-xs">
                          {metric}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {/* Coaching Notes */}
              {story.coachingNotes && (
                <Card className="p-4 bg-yellow-900/20 border-yellow-800/30">
                  <h4 className="text-sm font-semibold text-yellow-400 flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4" />
                    Coaching Notes
                  </h4>
                  <p className="text-sm text-gray-300 leading-[1.7] tracking-wide whitespace-pre-wrap">{story.coachingNotes}</p>
                </Card>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Key Talking Points */}
              {metadata.keyTalkingPoints.length > 0 && (
                <Card className="p-4">
                  <h4 className="text-sm font-semibold text-purple-400 flex items-center gap-2 mb-3">
                    <Star className="w-4 h-4" />
                    Key Talking Points
                  </h4>
                  <ul className="space-y-2">
                    {metadata.keyTalkingPoints.map((point, i) => (
                      <li key={i} className="text-sm text-gray-300 leading-[1.7] flex items-start gap-2">
                        <span className="text-purple-400 mt-0.5">•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Delivery Tips */}
              {metadata.deliveryTips.length > 0 && (
                <Card className="p-4">
                  <h4 className="text-sm font-semibold text-cyan-400 flex items-center gap-2 mb-3">
                    <BookOpen className="w-4 h-4" />
                    Delivery Tips
                  </h4>
                  <ul className="space-y-2">
                    {metadata.deliveryTips.map((tip, i) => (
                      <li key={i} className="text-sm text-gray-300 leading-[1.7] flex items-start gap-2">
                        <span className="text-cyan-400 mt-0.5">{i + 1}.</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Follow-up Questions with Full Answers */}
              {metadata.followUpQA.length > 0 && (
                <Card className="p-4">
                  <h4 className="text-sm font-semibold text-orange-400 flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4" />
                    Likely Follow-up Questions
                  </h4>
                  <div className="space-y-4">
                    {metadata.followUpQA.map((followUp, i) => (
                      <div key={i} className="border-l-2 border-orange-800/50 pl-3">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm text-white font-medium italic">"{followUp.question}"</p>
                          <Badge
                            variant={followUp.likelihood === 'high' ? 'danger' : followUp.likelihood === 'medium' ? 'warning' : 'default'}
                            className="text-xs"
                          >
                            {followUp.likelihood}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400 mb-2">Suggested response:</p>
                        <p className="text-sm text-gray-300">{followUp.suggestedAnswer}</p>
                        {followUp.keyPoints.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {followUp.keyPoints.map((point, j) => (
                              <span key={j} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                                {point}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Bullet Points */}
              {metadata.bulletPoints.length > 0 && (
                <Card className="p-4">
                  <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4" />
                    Quick Reference Points
                  </h4>
                  <ul className="space-y-1">
                    {metadata.bulletPoints.map((point, i) => (
                      <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                        <span className="text-emerald-400 mt-0.5">•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Sources */}
              {(metadata.sources.profileSections.length > 0 || metadata.sources.storyIds.length > 0) && (
                <Card className="p-4 bg-gray-800/30">
                  <h4 className="text-sm font-semibold text-gray-400 flex items-center gap-2 mb-2">
                    Sources Used
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {metadata.sources.profileSections.map((section, i) => (
                      <Badge key={`profile-${i}`} variant="default" className="text-xs">
                        Profile: {section}
                      </Badge>
                    ))}
                    {metadata.sources.storyIds.length > 0 && (
                      <Badge variant="info" className="text-xs">
                        {metadata.sources.storyIds.length} stories referenced
                      </Badge>
                    )}
                    {metadata.sources.synthesized && (
                      <Badge variant="warning" className="text-xs">
                        AI-synthesized
                      </Badge>
                    )}
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-4 border-t border-gray-700">
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    );
  }

  // Legacy view for stories without generated metadata
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="View Answer"
      size="full"
      className="!max-w-[1200px]"
    >
      <div className="p-4 md:p-6 space-y-6">
        {/* Question Header */}
        <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-800/30">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1">
              <p className="text-xs text-blue-400 font-medium mb-2 uppercase tracking-wide">Interview Question</p>
              <p className="text-base md:text-lg text-white leading-relaxed">{question.question}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className={cn('text-xs', likelihoodColors[question.likelihood])}>
                {question.likelihood}
              </Badge>
              <Badge className={cn('text-xs', categoryColors[question.category])}>
                {question.category}
              </Badge>
            </div>
          </div>
        </div>

        {/* Story Title & Tags */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-xl md:text-2xl font-bold text-white">{story.title}</h3>
          <div className="flex flex-wrap gap-2">
            {story.tags.map((tag) => (
              <Badge key={tag} variant="primary" className="text-xs md:text-sm">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Narrative Answer */}
          <div className="space-y-4">
            <Card className="p-4 md:p-5 bg-gradient-to-br from-gray-800/80 to-gray-900/80 border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm md:text-base font-semibold text-emerald-400 flex items-center gap-2">
                  <FileText className="w-4 h-4 md:w-5 md:h-5" />
                  {narrativeText ? 'Conversational Narrative' : 'Answer Overview'}
                </h4>
                {isGeminiAvailable() && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateNarrative}
                    disabled={isGeneratingNarrative}
                    className="text-xs"
                  >
                    {isGeneratingNarrative ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Generating...
                      </>
                    ) : narrativeText ? (
                      <>
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Regenerate
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 mr-1" />
                        Generate Narrative
                      </>
                    )}
                  </Button>
                )}
              </div>

              {narrativeError && (
                <div className="mb-4 p-2 bg-red-900/20 border border-red-800/30 rounded text-xs text-red-400">
                  {narrativeError}
                </div>
              )}

              {narrativeText ? (
                <div className="text-[15px] text-gray-200 leading-[1.8] tracking-wide whitespace-pre-wrap">
                  {narrativeText}
                </div>
              ) : (
                <div className="space-y-5 text-[15px] text-gray-200 leading-[1.8] tracking-wide">
                  <p>{story.star.situation}</p>
                  <p>{story.star.task}</p>
                  <p>{story.star.action}</p>
                  <p className="font-medium text-white">{story.star.result}</p>
                </div>
              )}

              {!narrativeText && isGeminiAvailable() && (
                <p className="mt-4 text-xs text-gray-500 italic">
                  Tip: Click "Generate Narrative" to create a natural, conversational version of this answer.
                </p>
              )}
            </Card>

            {/* Key Metrics */}
            {story.metrics.primary && (
              <Card className="p-4 bg-green-900/20 border-green-800/30">
                <h4 className="text-sm font-semibold text-green-400 flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4" />
                  Key Metrics
                </h4>
                <div className="text-lg md:text-xl font-bold text-white">{story.metrics.primary}</div>
                {story.metrics.secondary.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {story.metrics.secondary.map((metric, i) => (
                      <Badge key={i} variant="default" className="text-xs">
                        {metric}
                      </Badge>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Coaching Notes */}
            {story.coachingNotes && (
              <Card className="p-4 bg-yellow-900/20 border-yellow-800/30">
                <h4 className="text-sm font-semibold text-yellow-400 flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4" />
                  Coaching Tips
                </h4>
                <p className="text-sm text-gray-300 leading-[1.7] tracking-wide">{story.coachingNotes}</p>
              </Card>
            )}
          </div>

          {/* Right Column - STAR Breakdown & Extras */}
          <div className="space-y-4">
            {/* STAR Breakdown */}
            <Card className="p-4 md:p-5">
              <h4 className="text-sm md:text-base font-semibold text-blue-400 flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 md:w-5 md:h-5" />
                STAR Breakdown
              </h4>
              <div className="space-y-3">
                {(['situation', 'task', 'action', 'result'] as const).map((section) => (
                  <div
                    key={section}
                    className={cn(
                      "p-3 rounded-lg border-l-4",
                      section === 'situation' && "bg-purple-900/10 border-l-purple-500",
                      section === 'task' && "bg-blue-900/10 border-l-blue-500",
                      section === 'action' && "bg-green-900/10 border-l-green-500",
                      section === 'result' && "bg-yellow-900/10 border-l-yellow-500",
                    )}
                  >
                    <label className={cn(
                      "block text-xs font-bold uppercase mb-1 tracking-wide",
                      section === 'situation' && "text-purple-400",
                      section === 'task' && "text-blue-400",
                      section === 'action' && "text-green-400",
                      section === 'result' && "text-yellow-400",
                    )}>
                      {section}
                    </label>
                    <p className="text-sm text-gray-300 leading-[1.7] tracking-wide">
                      {story.star[section]}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Follow-up Questions */}
            {story.followUpQuestions && story.followUpQuestions.length > 0 && (
              <Card className="p-4">
                <h4 className="text-sm font-semibold text-orange-400 flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4" />
                  Likely Follow-ups
                </h4>
                <ul className="space-y-2">
                  {story.followUpQuestions.map((q, i) => (
                    <li key={i} className="text-xs md:text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-orange-400 font-bold">{i + 1}.</span>
                      <span className="italic">"{q}"</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Variations */}
            {story.variations && Object.keys(story.variations).some(k => story.variations[k as keyof typeof story.variations]) && (
              <Card className="p-4">
                <h4 className="text-sm font-semibold text-purple-400 flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4" />
                  Answer Variations
                </h4>
                <div className="space-y-2">
                  {story.variations.leadership && (
                    <div className="p-2 bg-purple-900/20 rounded text-xs md:text-sm">
                      <span className="text-purple-300 font-semibold">Leadership:</span>
                      <span className="text-gray-300 ml-1">{story.variations.leadership}</span>
                    </div>
                  )}
                  {story.variations.technical && (
                    <div className="p-2 bg-blue-900/20 rounded text-xs md:text-sm">
                      <span className="text-blue-300 font-semibold">Technical:</span>
                      <span className="text-gray-300 ml-1">{story.variations.technical}</span>
                    </div>
                  )}
                  {story.variations.challenge && (
                    <div className="p-2 bg-red-900/20 rounded text-xs md:text-sm">
                      <span className="text-red-300 font-semibold">Challenge:</span>
                      <span className="text-gray-300 ml-1">{story.variations.challenge}</span>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-4 border-t border-gray-700">
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  sessionId,
  stories,
  onPractice,
  profile,
  analysis,
  research,
  company,
  role,
}) => {
  const { markQuestionPrepared, recordQuestionPractice } = useInterviewPrepStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showStorySelect, setShowStorySelect] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPracticeModal, setShowPracticeModal] = useState(false);

  // Check if we can generate answers
  const canGenerate = !!profile && !!company && !!role;

  // Get matched story
  const matchedStory = question.matchedStoryId
    ? stories.find((s) => s.id === question.matchedStoryId)
    : undefined;

  // Handle story selection
  const handleSelectStory = (storyId: string) => {
    markQuestionPrepared(sessionId, question.id, storyId, undefined);
    setShowStorySelect(false);
    toast.success('Story linked', 'Question marked as prepared');
  };

  // Handle unlink story - FIXED with proper state update
  const handleUnlinkStory = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    markQuestionPrepared(sessionId, question.id, undefined, undefined);
    toast.success('Story unlinked', 'You can link a different story now');
  };

  // Handle story created from generate modal
  const handleStoryCreated = (storyId: string) => {
    console.log('=== handleStoryCreated START ===');
    console.log('storyId:', storyId);
    console.log('sessionId:', sessionId);
    console.log('questionId:', question.id);

    if (!sessionId) {
      console.error('ERROR: sessionId is missing!');
      toast.error('Link failed', 'Session ID is missing');
      return;
    }

    if (!question.id) {
      console.error('ERROR: question.id is missing!');
      toast.error('Link failed', 'Question ID is missing');
      return;
    }

    console.log('Calling markQuestionPrepared...');
    markQuestionPrepared(sessionId, question.id, storyId, undefined);
    console.log('markQuestionPrepared called successfully');
    console.log('=== handleStoryCreated END ===');

    toast.success('Answer linked', 'Your generated answer has been saved and linked');
  };

  // Handle practice click
  const handlePractice = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (matchedStory) {
      setShowPracticeModal(true);
    } else {
      toast.info('No answer linked', 'Link or generate a story first to practice with it');
    }
  };

  // Handle practice complete
  const handlePracticeComplete = (rating: number) => {
    recordQuestionPractice(sessionId, question.id);
    onPractice?.(question.id);
    toast.success('Practice recorded!', `You rated yourself ${rating}/5 stars`);
  };

  // Handle view story
  const handleViewStory = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowViewModal(true);
  };

  // Get category config
  const categoryInfo = QUESTION_CATEGORIES.find((c) => c.value === question.category);

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        question.isPrepared && 'border-green-800/50 bg-green-900/5',
        !question.isPrepared && question.likelihood === 'high' && 'border-yellow-800/50'
      )}
    >
      {/* Header */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-3">
          {/* Status Icon */}
          <div className="mt-1">
            {question.isPrepared ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <Circle className="w-5 h-5 text-gray-500" />
            )}
          </div>

          {/* Question Content */}
          <div className="flex-1 min-w-0">
            {/* Badges */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge className={cn('text-xs', likelihoodColors[question.likelihood])}>
                {question.likelihood}
              </Badge>
              <Badge className={cn('text-xs', categoryColors[question.category])}>
                {categoryInfo?.label || question.category}
              </Badge>
              <DifficultyIndicator difficulty={question.difficulty} />
              {question.practiceCount > 0 && (
                <Badge variant="default" className="text-xs">
                  Practiced {question.practiceCount}x
                </Badge>
              )}
            </div>

            {/* Question Text */}
            <p className="text-white font-medium">{question.question}</p>

            {/* Source */}
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Target className="w-3 h-3" />
              {question.source}
            </p>
          </div>

          {/* Expand Arrow */}
          <button className="p-1 text-gray-400 hover:text-white">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 space-y-4 border-t border-gray-800 mt-2">
          {/* Suggested Approach */}
          {question.suggestedApproach && (
            <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-400 text-xs font-medium mb-1">
                <Lightbulb className="w-3 h-3" />
                Suggested Approach
              </div>
              <p className="text-sm text-gray-300">{question.suggestedApproach}</p>
            </div>
          )}

          {/* Matched Story */}
          {matchedStory ? (
            <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-green-400 text-xs font-medium">
                  <Link className="w-3 h-3" />
                  Linked Story
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleViewStory}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    View
                  </button>
                  <button
                    onClick={handleUnlinkStory}
                    className="text-xs text-gray-400 hover:text-red-400 flex items-center gap-1"
                  >
                    <Unlink className="w-3 h-3" />
                    Unlink
                  </button>
                </div>
              </div>
              <p className="text-sm text-white font-medium">{matchedStory.title}</p>
              <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                {matchedStory.star.result}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {matchedStory.tags.slice(0, 4).map((tag) => (
                  <Badge key={tag} variant="default" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          ) : showStorySelect ? (
            <div className="space-y-3">
              <Select
                value=""
                onChange={handleSelectStory}
                options={stories.map((s) => ({
                  value: s.id,
                  label: `${s.title} - ${s.tags.slice(0, 2).join(', ')}`,
                }))}
                placeholder="Select a story to link..."
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowStorySelect(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Generate Answer - Primary action when no story */}
              {canGenerate && (
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowGenerateModal(true);
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Answer with AI
                </Button>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowStorySelect(true);
                  }}
                  className="flex-1"
                >
                  <Link className="w-4 h-4 mr-2" />
                  Link Existing Story
                </Button>
              </div>
            </div>
          )}

          {/* Practice Button (when story is linked) */}
          {matchedStory && (
            <Button
              size="sm"
              onClick={handlePractice}
              className="w-full"
            >
              <Mic className="w-4 h-4 mr-2" />
              Practice with Voice
            </Button>
          )}
        </div>
      )}

      {/* Generate Answer Modal */}
      {canGenerate && (
        <GenerateAnswerModal
          isOpen={showGenerateModal}
          onClose={() => setShowGenerateModal(false)}
          question={question}
          profile={profile}
          analysis={analysis}
          research={research}
          company={company}
          role={role}
          onStoryCreated={handleStoryCreated}
        />
      )}

      {/* View Story Modal */}
      {matchedStory && (
        <ViewStoryModal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          question={question}
          story={matchedStory}
        />
      )}

      {/* Practice Modal with Voice Recording */}
      {matchedStory && (
        <PracticeModal
          isOpen={showPracticeModal}
          onClose={() => setShowPracticeModal(false)}
          question={question}
          story={matchedStory}
          onComplete={handlePracticeComplete}
        />
      )}
    </Card>
  );
};
