/**
 * Practice Page
 * Spaced repetition flashcard practice for interview Q&A
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { toast } from '@/src/stores';
import { useTechnicalAnswers, useApplications, useFlashcards, useUnifiedActiveProfileId } from '@/src/hooks/useAppData';
import { Button, Card } from '@/src/components/ui';
import {
  FlashcardView,
  FlashcardRating,
  StudySessionSetup,
  StudySessionProgress,
  StudySessionComplete,
  DailyReviewWidget,
  MasteryProgress,
  MasteryProgressBar,
  StreakDisplay,
} from '@/src/components/flashcards';
import {
  calculateNextReview,
  getStudyQueue,
  calculateStudyStats,
  getMasteryLevel,
  initializeSRSData,
} from '@/src/services/srs';
import type { TechnicalAnswer, SRSRating, StudyMode } from '@/src/types';
import { Brain, Play, Clock, Target, Trophy, Flame, ChevronRight, ArrowLeft, History } from 'lucide-react';

type ViewType = 'dashboard' | 'setup' | 'study' | 'complete';

export const PracticePage: React.FC = () => {
  const [view, setView] = useState<ViewType>('dashboard');
  const [studyQueue, setStudyQueue] = useState<TechnicalAnswer[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Hooks
  const activeProfileId = useUnifiedActiveProfileId();
  const { answers: allAnswers, updateAnswer } = useTechnicalAnswers();
  const { applications } = useApplications();
  const {
    activeSession,
    progress,
    startSession,
    recordReview,
    endSession,
    abandonSession,
    getProgress,
    getSessionStats,
    getRecentSessions,
  } = useFlashcards();

  // Filter answers by active profile
  const answers = useMemo(() => {
    if (!activeProfileId) return allAnswers;
    return allAnswers.filter((a) => !a.profileId || a.profileId === activeProfileId);
  }, [allAnswers, activeProfileId]);

  // Get current progress
  const currentProgress = getProgress(activeProfileId || undefined);
  const sessionStats = getSessionStats(activeProfileId || undefined);
  const recentSessions = getRecentSessions(5, activeProfileId || undefined);
  const stats = useMemo(() => calculateStudyStats(answers), [answers]);

  // Current card
  const currentCard = studyQueue[currentCardIndex];

  // Timer effect
  useEffect(() => {
    if (view === 'study' && activeSession) {
      timerRef.current = setInterval(() => {
        setElapsedTime((t) => t + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [view, activeSession]);

  // Handle starting a session
  const handleStartSession = useCallback(async (mode: StudyMode, applicationId?: string) => {
    const queue = getStudyQueue(answers, {
      profileId: activeProfileId || undefined,
      applicationId,
      maxNew: mode === 'quick' ? 3 : 10,
      maxReview: mode === 'quick' ? 10 : 50,
    });

    if (queue.length === 0) {
      toast.info('No cards to study', 'All cards are up to date!');
      return;
    }

    setStudyQueue(queue);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setElapsedTime(0);

    await startSession({
      mode,
      applicationId,
      profileId: activeProfileId || undefined,
      totalCards: queue.length,
    });

    setView('study');
  }, [answers, activeProfileId, startSession]);

  // Handle rating a card
  const handleRate = useCallback(async (rating: SRSRating) => {
    if (!currentCard || !activeSession) return;

    // Calculate new SRS data
    const currentSrsData = currentCard.srsData || initializeSRSData();
    const newSrsData = calculateNextReview(currentSrsData, rating);

    // Update the answer with new SRS data
    updateAnswer(currentCard.id, {
      srsData: newSrsData,
      practiceCount: currentCard.practiceCount + 1,
      lastPracticedAt: new Date().toISOString(),
    });

    // Record the review in the session
    recordReview(currentCard.id, rating, () => {});

    // Move to next card or end session
    if (currentCardIndex < studyQueue.length - 1) {
      setCurrentCardIndex((i) => i + 1);
      setIsFlipped(false);
    } else {
      // Session complete
      const completedSession = await endSession();
      if (completedSession) {
        setView('complete');
      }
    }
  }, [currentCard, activeSession, currentCardIndex, studyQueue.length, updateAnswer, recordReview, endSession]);

  // Handle abandoning session
  const handleAbandon = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    abandonSession();
    setStudyQueue([]);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setElapsedTime(0);
    setView('dashboard');
  }, [abandonSession]);

  // Handle practice again
  const handlePracticeAgain = useCallback(() => {
    setView('setup');
  }, []);

  // Handle go home
  const handleGoHome = useCallback(() => {
    setView('dashboard');
  }, []);

  // Render dashboard view
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Brain className="w-6 h-6 text-blue-500" />
            Practice Mode
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Master your interview answers with spaced repetition
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setView('setup')}
          leftIcon={<Play className="w-4 h-4" />}
          className="bg-blue-600 hover:bg-blue-500"
          disabled={answers.length === 0}
        >
          Start Practice
        </Button>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <span className="text-2xl font-mono text-white">{stats.dueToday}</span>
              <span className="text-xs text-gray-500 block">Due Today</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-900/30 flex items-center justify-center">
              <Target className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <span className="text-2xl font-mono text-white">{stats.mastered}</span>
              <span className="text-xs text-gray-500 block">Mastered</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-900/30 flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <span className="text-2xl font-mono text-orange-400">
                {currentProgress?.currentStreak || 0}
              </span>
              <span className="text-xs text-gray-500 block">Day Streak</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-900/30 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <span className="text-2xl font-mono text-white">
                {currentProgress?.totalCardsStudied || 0}
              </span>
              <span className="text-xs text-gray-500 block">Total Reviews</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Mastery distribution */}
      <Card className="p-5 bg-gray-900/50">
        <h3 className="text-sm font-bold text-white mb-4">Mastery Distribution</h3>
        <MasteryProgressBar
          counts={{
            new: stats.new,
            learning: stats.learning,
            reviewing: stats.reviewing,
            mastered: stats.mastered,
          }}
          showLabels
        />
        <div className="mt-4 flex justify-between text-sm text-gray-400">
          <span>Total: {stats.total} cards</span>
          {stats.overdue > 0 && (
            <span className="text-red-400">{stats.overdue} overdue</span>
          )}
        </div>
      </Card>

      {/* Daily review widget */}
      <DailyReviewWidget
        answers={answers}
        progress={currentProgress}
        onStartPractice={() => setView('setup')}
      />

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <Card className="p-5 bg-gray-900/50">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <History className="w-4 h-4 text-gray-400" />
            Recent Sessions
          </h3>
          <div className="space-y-3">
            {recentSessions.map((session) => {
              const totalRatings = Object.values(session.ratings).reduce((a, b) => a + b, 0);
              const goodRatings = (session.ratings[3] || 0) + (session.ratings[4] || 0) + (session.ratings[5] || 0);
              const successRate = totalRatings > 0 ? Math.round((goodRatings / totalRatings) * 100) : 0;

              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400 capitalize">{session.mode}</span>
                    <span className="text-xs text-gray-500">-</span>
                    <span className="text-sm text-white">{session.cardsReviewed} cards</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={
                      successRate >= 70 ? 'text-green-400' :
                      successRate >= 50 ? 'text-yellow-400' :
                      'text-red-400'
                    }>
                      {successRate}%
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(session.startedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Empty state */}
      {answers.length === 0 && (
        <Card className="min-h-[400px] flex flex-col items-center justify-center text-center p-8">
          <Brain className="w-16 h-16 text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Cards Yet</h3>
          <p className="text-gray-400 mb-6 max-w-md">
            Create technical answers in the Answer Prep section to start practicing with flashcards.
          </p>
          <Button
            variant="primary"
            onClick={() => window.location.href = '/answers'}
            leftIcon={<ChevronRight className="w-4 h-4" />}
            className="bg-blue-600 hover:bg-blue-500"
          >
            Go to Answer Prep
          </Button>
        </Card>
      )}
    </div>
  );

  // Render study view
  const renderStudy = () => (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handleAbandon}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          End Session
        </Button>
        {activeSession && (
          <StreakDisplay
            currentStreak={currentProgress?.currentStreak || 0}
            size="sm"
          />
        )}
      </div>

      {/* Progress bar */}
      {activeSession && (
        <StudySessionProgress
          session={activeSession}
          elapsedTime={elapsedTime}
        />
      )}

      {/* Flashcard */}
      {currentCard && (
        <div className="py-4">
          <FlashcardView
            answer={currentCard}
            isFlipped={isFlipped}
            onFlip={() => setIsFlipped(!isFlipped)}
            onPrevious={() => {
              if (currentCardIndex > 0) {
                setCurrentCardIndex((i) => i - 1);
                setIsFlipped(false);
              }
            }}
            onNext={() => {
              if (currentCardIndex < studyQueue.length - 1) {
                setCurrentCardIndex((i) => i + 1);
                setIsFlipped(false);
              }
            }}
            hasPrevious={currentCardIndex > 0}
            hasNext={currentCardIndex < studyQueue.length - 1}
            showProgress
            currentIndex={currentCardIndex}
            totalCards={studyQueue.length}
          />
        </div>
      )}

      {/* Rating buttons (only show when flipped) */}
      {isFlipped && currentCard && (
        <div className="pt-4">
          <FlashcardRating onRate={handleRate} />
        </div>
      )}

      {/* Flip hint when not flipped */}
      {!isFlipped && currentCard && (
        <div className="text-center text-sm text-gray-400">
          Try to recall the answer, then flip the card to check
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Dashboard */}
        {view === 'dashboard' && renderDashboard()}

        {/* Setup modal */}
        {view === 'setup' && (
          <StudySessionSetup
            answers={answers}
            applications={applications}
            profileId={activeProfileId || undefined}
            onStart={handleStartSession}
            onCancel={() => setView('dashboard')}
          />
        )}

        {/* Study view */}
        {view === 'study' && renderStudy()}

        {/* Complete view */}
        {view === 'complete' && activeSession && (
          <StudySessionComplete
            session={activeSession}
            currentStreak={currentProgress?.currentStreak || 0}
            onPracticeAgain={handlePracticeAgain}
            onGoHome={handleGoHome}
          />
        )}
      </div>
    </div>
  );
};

export default PracticePage;
