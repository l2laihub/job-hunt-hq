import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardContent, Button } from '@/src/components/ui';
import { cn, formatTime } from '@/src/lib/utils';
import { QuestionFeedback, QuestionFeedbackCompact } from './QuestionFeedback';
import type { EnhancedInterviewFeedback, QuestionResult } from '@/src/types/interview-prep';
import {
  TrendingUp,
  TrendingDown,
  Target,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  BarChart3,
  RefreshCw,
  BookOpen,
  ArrowLeft,
  Star,
  MessageSquare,
} from 'lucide-react';

interface InterviewSummaryProps {
  feedback: EnhancedInterviewFeedback;
  companyName?: string;
  roleName?: string;
  onPracticeAgain?: () => void;
  onBackToPrep?: () => void;
}

/**
 * Overall score display with rating
 */
const OverallScoreCard: React.FC<{
  score: number;
  questionsAnswered: number;
  totalDuration: number;
}> = ({ score, questionsAnswered, totalDuration }) => {
  const getScoreLabel = (s: number) => {
    if (s >= 9) return 'Exceptional';
    if (s >= 8) return 'Excellent';
    if (s >= 7) return 'Good';
    if (s >= 6) return 'Solid';
    if (s >= 5) return 'Fair';
    if (s >= 4) return 'Needs Work';
    return 'Keep Practicing';
  };

  const getScoreColor = (s: number) => {
    if (s >= 8) return 'text-green-400 border-green-500';
    if (s >= 6) return 'text-yellow-400 border-yellow-500';
    if (s >= 4) return 'text-orange-400 border-orange-500';
    return 'text-red-400 border-red-500';
  };

  return (
    <Card className="bg-gradient-to-br from-gray-800/50 to-gray-900/50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-white mb-1">Interview Complete</h3>
            <p className="text-gray-400 text-sm">
              {questionsAnswered} questions • {formatTime(totalDuration)}
            </p>
          </div>
          <div className="text-center">
            <div
              className={cn(
                'w-24 h-24 rounded-full flex items-center justify-center border-4 bg-gray-900/50',
                getScoreColor(score)
              )}
            >
              <div>
                <span className="text-4xl font-bold">{score.toFixed(1)}</span>
                <span className="text-sm opacity-70">/10</span>
              </div>
            </div>
            <p className={cn('text-sm font-medium mt-2', getScoreColor(score))}>
              {getScoreLabel(score)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Category scores breakdown
 */
const CategoryScoresCard: React.FC<{
  categoryScores: EnhancedInterviewFeedback['categoryScores'];
}> = ({ categoryScores }) => {
  const categories = Object.entries(categoryScores).filter(
    ([, score]) => score !== undefined
  ) as [string, number][];

  if (categories.length === 0) return null;

  const getBarColor = (score: number) => {
    if (score >= 8) return 'bg-green-500';
    if (score >= 6) return 'bg-yellow-500';
    if (score >= 4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-white flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-400" />
          Score by Category
        </h3>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {categories.map(([category, score]) => (
          <div key={category}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-300 capitalize">{category.replace('-', ' ')}</span>
              <span
                className={cn(
                  'font-medium',
                  score >= 8
                    ? 'text-green-400'
                    : score >= 6
                    ? 'text-yellow-400'
                    : 'text-red-400'
                )}
              >
                {score.toFixed(1)}
              </span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={cn('h-full transition-all', getBarColor(score))}
                style={{ width: `${(score / 10) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

/**
 * Progress update card
 */
const ProgressCard: React.FC<{
  progressUpdate: EnhancedInterviewFeedback['progressUpdate'];
}> = ({ progressUpdate }) => {
  const isPositive = progressUpdate.readinessScoreChange >= 0;

  return (
    <Card className={cn(
      'border',
      isPositive ? 'border-green-800/50 bg-green-900/10' : 'border-gray-800'
    )}>
      <CardHeader>
        <h3 className="font-semibold text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-400" />
          Progress Update
        </h3>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {progressUpdate.questionsNewlyPracticed}
            </div>
            <div className="text-xs text-gray-400">New Questions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {progressUpdate.questionsImproved}
            </div>
            <div className="text-xs text-gray-400">Improved</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">
              {progressUpdate.totalPracticeCount}
            </div>
            <div className="text-xs text-gray-400">Total Practiced</div>
          </div>
          <div className="text-center">
            <div
              className={cn(
                'text-2xl font-bold flex items-center justify-center gap-1',
                isPositive ? 'text-green-400' : 'text-red-400'
              )}
            >
              {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              {isPositive ? '+' : ''}{progressUpdate.readinessScoreChange}%
            </div>
            <div className="text-xs text-gray-400">Readiness</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Prepared answer comparison stats
 */
const PreparedAnswerStats: React.FC<{
  preparedVsActual: EnhancedInterviewFeedback['preparedVsActual'];
}> = ({ preparedVsActual }) => {
  if (preparedVsActual.questionsWithPreparedAnswers === 0) return null;

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Target className="w-4 h-4 text-purple-400" />
          Prepared Answer Comparison
        </h3>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-400">
            {preparedVsActual.questionsWithPreparedAnswers} questions had prepared answers
          </span>
          <span
            className={cn(
              'text-lg font-bold',
              preparedVsActual.averageSimilarity >= 70
                ? 'text-green-400'
                : preparedVsActual.averageSimilarity >= 40
                ? 'text-yellow-400'
                : 'text-red-400'
            )}
          >
            {preparedVsActual.averageSimilarity.toFixed(0)}% match
          </span>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all',
              preparedVsActual.averageSimilarity >= 70
                ? 'bg-green-500'
                : preparedVsActual.averageSimilarity >= 40
                ? 'bg-yellow-500'
                : 'bg-red-500'
            )}
            style={{ width: `${preparedVsActual.averageSimilarity}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Practice more to increase similarity with your prepared answers.
        </p>
      </CardContent>
    </Card>
  );
};

/**
 * Strengths and improvements side by side
 */
const InsightsCards: React.FC<{
  topStrengths: string[];
  priorityImprovements: string[];
}> = ({ topStrengths, priorityImprovements }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <Card className="bg-green-900/10 border-green-800/30">
      <CardHeader>
        <h3 className="font-semibold text-green-400 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Top Strengths
        </h3>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <ul className="space-y-2">
          {topStrengths.map((strength, i) => (
            <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
              <Star className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              {strength}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>

    <Card className="bg-yellow-900/10 border-yellow-800/30">
      <CardHeader>
        <h3 className="font-semibold text-yellow-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Priority Improvements
        </h3>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <ul className="space-y-2">
          {priorityImprovements.map((improvement, i) => (
            <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
              <span className="text-yellow-400 font-bold">{i + 1}.</span>
              {improvement}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  </div>
);

/**
 * Next steps recommendations
 */
const NextStepsCard: React.FC<{ nextSteps: string[] }> = ({ nextSteps }) => (
  <Card className="bg-blue-900/10 border-blue-800/30">
    <CardHeader>
      <h3 className="font-semibold text-blue-400 flex items-center gap-2">
        <ChevronRight className="w-4 h-4" />
        Recommended Next Steps
      </h3>
    </CardHeader>
    <CardContent className="p-4 pt-0">
      <ul className="space-y-2">
        {nextSteps.map((step, i) => (
          <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-900/50 text-blue-400 flex items-center justify-center text-xs shrink-0">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
);

/**
 * Question results list
 */
const QuestionResultsList: React.FC<{
  results: QuestionResult[];
  onSelectQuestion: (index: number) => void;
}> = ({ results, onSelectQuestion }) => {
  // Sort by score (lowest first for improvement focus)
  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => a.evaluation.score - b.evaluation.score);
  }, [results]);

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-white flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-gray-400" />
          Question Breakdown
        </h3>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        {sortedResults.map((result) => (
          <QuestionFeedbackCompact
            key={result.questionId}
            result={result}
            onClick={() => onSelectQuestion(results.indexOf(result))}
          />
        ))}
      </CardContent>
    </Card>
  );
};

export const InterviewSummary: React.FC<InterviewSummaryProps> = ({
  feedback,
  companyName,
  roleName,
  onPracticeAgain,
  onBackToPrep,
}) => {
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);

  // If a question is selected, show its detailed feedback
  if (selectedQuestionIndex !== null) {
    const result = feedback.questionResults[selectedQuestionIndex];
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedQuestionIndex(null)}
          className="mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Summary
        </Button>
        <QuestionFeedback
          result={result}
          showPreparedAnswer={feedback.config.showPreparedAnswers}
          onNextQuestion={
            selectedQuestionIndex < feedback.questionResults.length - 1
              ? () => setSelectedQuestionIndex(selectedQuestionIndex + 1)
              : undefined
          }
          isLastQuestion={selectedQuestionIndex === feedback.questionResults.length - 1}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with company context */}
      {(companyName || roleName) && (
        <div className="flex items-center gap-2 text-gray-400">
          <BookOpen className="w-4 h-4" />
          <span>
            {companyName} {roleName && `• ${roleName}`}
          </span>
        </div>
      )}

      {/* Overall Score */}
      <OverallScoreCard
        score={feedback.overallScore}
        questionsAnswered={feedback.questionsAnswered}
        totalDuration={feedback.totalDuration}
      />

      {/* Summary text */}
      <Card className="bg-gradient-to-r from-purple-900/10 to-blue-900/10 border-purple-800/30">
        <CardContent className="p-4">
          <p className="text-gray-200 leading-relaxed">{feedback.summary}</p>
        </CardContent>
      </Card>

      {/* Progress Update */}
      <ProgressCard progressUpdate={feedback.progressUpdate} />

      {/* Category Scores & Prepared Answer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CategoryScoresCard categoryScores={feedback.categoryScores} />
        <PreparedAnswerStats preparedVsActual={feedback.preparedVsActual} />
      </div>

      {/* Strengths & Improvements */}
      <InsightsCards
        topStrengths={feedback.topStrengths}
        priorityImprovements={feedback.priorityImprovements}
      />

      {/* Next Steps */}
      <NextStepsCard nextSteps={feedback.nextSteps} />

      {/* Question Breakdown */}
      <QuestionResultsList
        results={feedback.questionResults}
        onSelectQuestion={setSelectedQuestionIndex}
      />

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        {onPracticeAgain && (
          <Button
            variant="primary"
            size="lg"
            onClick={onPracticeAgain}
            className="flex-1"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Practice Again
          </Button>
        )}
        {onBackToPrep && (
          <Button
            variant="secondary"
            size="lg"
            onClick={onBackToPrep}
            className="flex-1"
          >
            <BookOpen className="w-5 h-5 mr-2" />
            Back to Prep
          </Button>
        )}
      </div>

      {/* Timestamp */}
      <p className="text-xs text-gray-500 text-center">
        Completed {new Date(feedback.completedAt).toLocaleString()}
      </p>
    </div>
  );
};

export default InterviewSummary;
