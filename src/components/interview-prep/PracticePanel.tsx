import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterviewPrepStore, toast } from '@/src/stores';
import { Button, Card, Badge } from '@/src/components/ui';
import { cn, formatTime } from '@/src/lib/utils';
import type { InterviewPrepSession, PredictedQuestion, PracticeMode, PrepPracticeSession } from '@/src/types';
import {
  Play,
  Pause,
  Square,
  Mic,
  Clock,
  Zap,
  ChevronRight,
  CheckCircle,
  Star,
  History,
} from 'lucide-react';

interface PracticePanelProps {
  session: InterviewPrepSession;
}

// Practice mode cards
const PracticeModeCard: React.FC<{
  mode: PracticeMode;
  title: string;
  description: string;
  icon: React.ReactNode;
  isSelected: boolean;
  onClick: () => void;
}> = ({ title, description, icon, isSelected, onClick }) => (
  <Card
    className={cn(
      'p-4 cursor-pointer transition-all',
      isSelected
        ? 'border-blue-500 bg-blue-900/20'
        : 'hover:border-gray-600'
    )}
    onClick={onClick}
  >
    <div className="flex items-start gap-3">
      <div className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center',
        isSelected ? 'bg-blue-600' : 'bg-gray-800'
      )}>
        {icon}
      </div>
      <div>
        <h4 className="font-medium text-white">{title}</h4>
        <p className="text-xs text-gray-400 mt-1">{description}</p>
      </div>
    </div>
  </Card>
);

// Question selection for practice
const QuestionSelection: React.FC<{
  questions: PredictedQuestion[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}> = ({ questions, selectedIds, onToggle, onSelectAll, onClearAll }) => {
  const highPriority = questions.filter((q) => q.likelihood === 'high');
  const unprepared = questions.filter((q) => !q.isPrepared);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-white">Select Questions to Practice</h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onSelectAll}>
            Select All
          </Button>
          <Button variant="ghost" size="sm" onClick={onClearAll}>
            Clear
          </Button>
        </div>
      </div>

      {/* Quick filters */}
      <div className="flex gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            highPriority.forEach((q) => {
              if (!selectedIds.has(q.id)) onToggle(q.id);
            });
          }}
        >
          High Priority ({highPriority.length})
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            unprepared.forEach((q) => {
              if (!selectedIds.has(q.id)) onToggle(q.id);
            });
          }}
        >
          Unprepared ({unprepared.length})
        </Button>
      </div>

      {/* Question list */}
      <div className="max-h-64 overflow-y-auto space-y-2">
        {questions.map((q) => (
          <label
            key={q.id}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors',
              selectedIds.has(q.id)
                ? 'bg-blue-900/30 border border-blue-700/50'
                : 'bg-gray-800/50 border border-transparent hover:bg-gray-800'
            )}
          >
            <input
              type="checkbox"
              checked={selectedIds.has(q.id)}
              onChange={() => onToggle(q.id)}
              className="mt-1"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white line-clamp-2">{q.question}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  className={cn(
                    'text-xs',
                    q.likelihood === 'high'
                      ? 'bg-red-900/40 text-red-400'
                      : q.likelihood === 'medium'
                      ? 'bg-yellow-900/40 text-yellow-400'
                      : 'bg-gray-800 text-gray-400'
                  )}
                >
                  {q.likelihood}
                </Badge>
                {q.isPrepared && (
                  <CheckCircle className="w-3 h-3 text-green-400" />
                )}
              </div>
            </div>
          </label>
        ))}
      </div>
    </Card>
  );
};

// Quick Practice Session (one question at a time)
const QuickPracticeSession: React.FC<{
  questions: PredictedQuestion[];
  onComplete: (practiceData: Omit<PrepPracticeSession, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}> = ({ questions, onComplete, onCancel }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [ratings, setRatings] = useState<Record<string, number>>({});

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentQuestion = questions[currentIndex];

  // Timer
  useEffect(() => {
    if (!isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused]);

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setShowAnswer(false);
    } else {
      // Complete session
      const avgRating =
        Object.values(ratings).reduce((a, b) => a + b, 0) / Object.values(ratings).length || 0;
      onComplete({
        sessionId: '',
        mode: 'quick',
        questionIds: questions.map((q) => q.id),
        durationSeconds: elapsedTime,
        selfRating: Math.round(avgRating),
      });
    }
  };

  const handleRate = (rating: number) => {
    setRatings((prev) => ({ ...prev, [currentQuestion.id]: rating }));
  };

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="default">
            Question {currentIndex + 1} of {questions.length}
          </Badge>
          <div className="flex items-center gap-2 text-gray-400">
            <Clock className="w-4 h-4" />
            {formatTime(elapsedTime)}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <Square className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Badge className="bg-blue-900/40 text-blue-400">
            {currentQuestion.category}
          </Badge>
          <Badge
            className={cn(
              currentQuestion.likelihood === 'high'
                ? 'bg-red-900/40 text-red-400'
                : 'bg-yellow-900/40 text-yellow-400'
            )}
          >
            {currentQuestion.likelihood}
          </Badge>
        </div>

        <h3 className="text-xl font-medium text-white mb-4">
          {currentQuestion.question}
        </h3>

        {/* Show answer hint */}
        {!showAnswer ? (
          <Button
            variant="outline"
            onClick={() => setShowAnswer(true)}
            className="w-full"
          >
            Show Suggested Approach
          </Button>
        ) : (
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-400 mb-2">Suggested Approach</h4>
            <p className="text-sm text-gray-300">{currentQuestion.suggestedApproach}</p>
          </div>
        )}
      </Card>

      {/* Self Rating */}
      <Card className="p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3">How did you do?</h4>
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              onClick={() => handleRate(rating)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                ratings[currentQuestion.id] === rating
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              )}
            >
              <Star
                className="w-6 h-6"
                fill={ratings[currentQuestion.id] >= rating ? 'currentColor' : 'none'}
              />
            </button>
          ))}
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="ghost"
          onClick={() => {
            if (currentIndex > 0) {
              setCurrentIndex((prev) => prev - 1);
              setShowAnswer(false);
            }
          }}
          disabled={currentIndex === 0}
        >
          Previous
        </Button>
        <Button onClick={handleNext}>
          {currentIndex < questions.length - 1 ? (
            <>
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </>
          ) : (
            'Complete'
          )}
        </Button>
      </div>
    </div>
  );
};

// Past sessions list
const PastSessions: React.FC<{ sessions: PrepPracticeSession[] }> = ({ sessions }) => {
  if (sessions.length === 0) {
    return (
      <Card className="p-4 text-center text-gray-400">
        <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No practice sessions yet</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-white flex items-center gap-2">
        <History className="w-4 h-4" />
        Past Sessions
      </h3>
      {sessions.slice(0, 5).map((session) => (
        <Card key={session.id} className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs">
                  {session.mode}
                </Badge>
                <span className="text-sm text-white">
                  {session.questionIds.length} questions
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(session.createdAt).toLocaleDateString()} -{' '}
                {formatTime(session.durationSeconds)}
              </p>
            </div>
            {session.selfRating && (
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      'w-4 h-4',
                      star <= session.selfRating!
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-600'
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};

// Main practice panel
export const PracticePanel: React.FC<PracticePanelProps> = ({ session }) => {
  const navigate = useNavigate();
  const { addPracticeSession, getPracticeSessions, recordQuestionPractice } = useInterviewPrepStore();

  const [mode, setMode] = useState<PracticeMode>('quick');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [isInSession, setIsInSession] = useState(false);

  const practiceSessions = getPracticeSessions(session.id);

  // Get selected questions
  const selectedQuestions = session.predictedQuestions.filter((q) =>
    selectedQuestionIds.has(q.id)
  );

  // Toggle question selection
  const toggleQuestion = useCallback((id: string) => {
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Select all questions
  const selectAllQuestions = useCallback(() => {
    setSelectedQuestionIds(new Set(session.predictedQuestions.map((q) => q.id)));
  }, [session.predictedQuestions]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedQuestionIds(new Set());
  }, []);

  // Start practice
  const handleStartPractice = () => {
    if (mode === 'mock') {
      // Navigate to mock interview with context
      navigate('/interview');
      return;
    }

    if (selectedQuestionIds.size === 0) {
      toast.error('Select at least one question');
      return;
    }

    setIsInSession(true);
  };

  // Complete practice session
  const handleCompleteSession = (practiceData: Omit<PrepPracticeSession, 'id' | 'createdAt'>) => {
    addPracticeSession({
      ...practiceData,
      sessionId: session.id,
    });

    // Record practice for each question
    selectedQuestions.forEach((q) => {
      recordQuestionPractice(session.id, q.id);
    });

    toast.success('Practice complete', `You practiced ${selectedQuestions.length} questions`);
    setIsInSession(false);
    setSelectedQuestionIds(new Set());
  };

  // Cancel session
  const handleCancelSession = () => {
    if (window.confirm('End practice session? Progress will be lost.')) {
      setIsInSession(false);
    }
  };

  // Render active session
  if (isInSession && mode === 'quick') {
    return (
      <QuickPracticeSession
        questions={selectedQuestions}
        onComplete={handleCompleteSession}
        onCancel={handleCancelSession}
      />
    );
  }

  // Render setup
  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PracticeModeCard
          mode="quick"
          title="Quick Practice"
          description="Answer questions one at a time with self-rating"
          icon={<Zap className="w-5 h-5 text-yellow-400" />}
          isSelected={mode === 'quick'}
          onClick={() => setMode('quick')}
        />
        <PracticeModeCard
          mode="timed"
          title="Timed Session"
          description="2-minute limit per question"
          icon={<Clock className="w-5 h-5 text-blue-400" />}
          isSelected={mode === 'timed'}
          onClick={() => setMode('timed')}
        />
        <PracticeModeCard
          mode="mock"
          title="Mock Interview"
          description="Full AI-powered simulation with voice"
          icon={<Mic className="w-5 h-5 text-purple-400" />}
          isSelected={mode === 'mock'}
          onClick={() => setMode('mock')}
        />
      </div>

      {/* Question Selection (not for mock) */}
      {mode !== 'mock' && (
        <QuestionSelection
          questions={session.predictedQuestions}
          selectedIds={selectedQuestionIds}
          onToggle={toggleQuestion}
          onSelectAll={selectAllQuestions}
          onClearAll={clearSelection}
        />
      )}

      {/* Start Button */}
      <Button
        size="lg"
        className="w-full"
        disabled={mode !== 'mock' && selectedQuestionIds.size === 0}
        onClick={handleStartPractice}
      >
        <Play className="w-5 h-5 mr-2" />
        {mode === 'mock' ? (
          'Start Mock Interview'
        ) : (
          `Start Practice (${selectedQuestionIds.size} questions)`
        )}
      </Button>

      {/* Past Sessions */}
      <PastSessions sessions={practiceSessions} />
    </div>
  );
};
