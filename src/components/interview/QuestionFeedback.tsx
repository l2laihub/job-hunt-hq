import React, { useState } from 'react';
import { Card, CardContent, Badge, Button } from '@/src/components/ui';
import { cn } from '@/src/lib/utils';
import type {
  QuestionResult,
  QuestionEvaluation,
} from '@/src/types/interview-prep';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Star,
  Target,
  MessageSquare,
  Lightbulb,
  TrendingUp,
  Clock,
  BookOpen,
} from 'lucide-react';

interface QuestionFeedbackProps {
  result: QuestionResult;
  preparedAnswer?: string;
  showPreparedAnswer?: boolean;
  onNextQuestion?: () => void;
  isLastQuestion?: boolean;
}

/**
 * STAR adherence visual indicator
 */
const StarAdherenceDisplay: React.FC<{
  starAdherence: QuestionEvaluation['starAdherence'];
}> = ({ starAdherence }) => {
  const elements = [
    { key: 'situation', label: 'S', full: 'Situation', present: starAdherence.situation },
    { key: 'task', label: 'T', full: 'Task', present: starAdherence.task },
    { key: 'action', label: 'A', full: 'Action', present: starAdherence.action },
    { key: 'result', label: 'R', full: 'Result', present: starAdherence.result },
  ];

  return (
    <div className="flex items-center gap-1">
      {elements.map((el) => (
        <div
          key={el.key}
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
            el.present
              ? 'bg-green-900/40 text-green-400 border border-green-700/50'
              : 'bg-gray-800 text-gray-500 border border-gray-700'
          )}
          title={`${el.full}: ${el.present ? 'Present' : 'Missing'}`}
        >
          {el.label}
        </div>
      ))}
      <span className="ml-2 text-sm text-gray-400">
        {starAdherence.score}/4 elements
      </span>
    </div>
  );
};

/**
 * Score display with color coding
 */
const ScoreDisplay: React.FC<{ score: number; size?: 'sm' | 'md' | 'lg' }> = ({
  score,
  size = 'md',
}) => {
  const getScoreColor = (s: number) => {
    if (s >= 8) return 'text-green-400 border-green-500 bg-green-900/20';
    if (s >= 6) return 'text-yellow-400 border-yellow-500 bg-yellow-900/20';
    if (s >= 4) return 'text-orange-400 border-orange-500 bg-orange-900/20';
    return 'text-red-400 border-red-500 bg-red-900/20';
  };

  const sizeClasses = {
    sm: 'w-10 h-10 text-lg',
    md: 'w-14 h-14 text-xl',
    lg: 'w-20 h-20 text-3xl',
  };

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold border-2',
        getScoreColor(score),
        sizeClasses[size]
      )}
    >
      {score}
    </div>
  );
};

/**
 * Collapsible section
 */
const CollapsibleSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-gray-800/50 hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          {icon}
          {title}
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {isOpen && <div className="p-3 bg-gray-900/50">{children}</div>}
    </div>
  );
};

/**
 * Key points comparison (if prepared answer exists)
 */
const KeyPointsComparison: React.FC<{
  comparison: QuestionEvaluation['preparedAnswerComparison'];
}> = ({ comparison }) => {
  if (!comparison) return null;

  return (
    <div className="space-y-3">
      {/* Similarity meter */}
      <div>
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-400">Similarity to prepared answer</span>
          <span
            className={cn(
              'font-medium',
              comparison.similarity >= 70
                ? 'text-green-400'
                : comparison.similarity >= 40
                ? 'text-yellow-400'
                : 'text-red-400'
            )}
          >
            {comparison.similarity}%
          </span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all',
              comparison.similarity >= 70
                ? 'bg-green-500'
                : comparison.similarity >= 40
                ? 'bg-yellow-500'
                : 'bg-red-500'
            )}
            style={{ width: `${comparison.similarity}%` }}
          />
        </div>
      </div>

      {/* Points covered */}
      {comparison.keyPointsCovered.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-green-400 mb-1 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Points Covered
          </h5>
          <ul className="space-y-1">
            {comparison.keyPointsCovered.map((point, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Points missed */}
      {comparison.keyPointsMissed.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-red-400 mb-1 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Points Missed
          </h5>
          <ul className="space-y-1">
            {comparison.keyPointsMissed.map((point, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Additional good points */}
      {comparison.additionalPoints.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-blue-400 mb-1 flex items-center gap-1">
            <Star className="w-3 h-3" />
            Additional Good Points
          </h5>
          <ul className="space-y-1">
            {comparison.additionalPoints.map((point, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export const QuestionFeedback: React.FC<QuestionFeedbackProps> = ({
  result,
  preparedAnswer,
  showPreparedAnswer = true,
  onNextQuestion,
  isLastQuestion = false,
}) => {
  const { question, userResponse, evaluation, responseTimeSeconds } = result;

  return (
    <div className="space-y-4">
      {/* Question & Score Header */}
      <Card className="bg-gradient-to-r from-gray-800/50 to-gray-900/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <ScoreDisplay score={evaluation.score} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  className={cn(
                    'text-xs',
                    question.category === 'behavioral'
                      ? 'bg-purple-900/40 text-purple-400'
                      : question.category === 'technical'
                      ? 'bg-blue-900/40 text-blue-400'
                      : 'bg-gray-800 text-gray-400'
                  )}
                >
                  {question.category}
                </Badge>
                <Badge
                  className={cn(
                    'text-xs',
                    question.difficulty === 'hard'
                      ? 'bg-red-900/40 text-red-400'
                      : question.difficulty === 'medium'
                      ? 'bg-yellow-900/40 text-yellow-400'
                      : 'bg-green-900/40 text-green-400'
                  )}
                >
                  {question.difficulty}
                </Badge>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {Math.round(responseTimeSeconds / 60)}:{String(responseTimeSeconds % 60).padStart(2, '0')}
                </span>
              </div>
              <p className="text-white font-medium">{question.question}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Feedback */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Feedback text */}
          <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-3">
            <p className="text-gray-200">{evaluation.feedback}</p>
          </div>

          {/* STAR Adherence */}
          {question.category === 'behavioral' && (
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2">STAR Method</h4>
              <StarAdherenceDisplay starAdherence={evaluation.starAdherence} />
            </div>
          )}

          {/* Strengths & Weaknesses side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strengths */}
            <div className="bg-green-900/10 border border-green-800/30 rounded-lg p-3">
              <h4 className="text-sm font-medium text-green-400 mb-2 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Strengths
              </h4>
              <ul className="space-y-1">
                {evaluation.strengths.map((strength, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-green-500 mt-1">•</span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>

            {/* Areas to Improve */}
            <div className="bg-yellow-900/10 border border-yellow-800/30 rounded-lg p-3">
              <h4 className="text-sm font-medium text-yellow-400 mb-2 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Areas to Improve
              </h4>
              <ul className="space-y-1">
                {evaluation.weaknesses.map((weakness, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-yellow-500 mt-1">•</span>
                    {weakness}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Improvement Tips */}
          <div className="bg-purple-900/10 border border-purple-800/30 rounded-lg p-3">
            <h4 className="text-sm font-medium text-purple-400 mb-2 flex items-center gap-1">
              <Lightbulb className="w-4 h-4" />
              Tips to Improve
            </h4>
            <ul className="space-y-1">
              {evaluation.improvementTips.map((tip, i) => (
                <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                  <span className="text-purple-400">{i + 1}.</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Collapsible sections */}
      <div className="space-y-2">
        {/* Your Response */}
        <CollapsibleSection
          title="Your Response"
          icon={<MessageSquare className="w-4 h-4 text-blue-400" />}
        >
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{userResponse}</p>
        </CollapsibleSection>

        {/* Prepared Answer Comparison */}
        {showPreparedAnswer && evaluation.preparedAnswerComparison && (
          <CollapsibleSection
            title="Comparison to Prepared Answer"
            icon={<Target className="w-4 h-4 text-green-400" />}
            defaultOpen={evaluation.preparedAnswerComparison.similarity < 50}
          >
            <KeyPointsComparison comparison={evaluation.preparedAnswerComparison} />
          </CollapsibleSection>
        )}

        {/* Prepared Answer (if available) */}
        {showPreparedAnswer && preparedAnswer && (
          <CollapsibleSection
            title="Prepared Answer"
            icon={<BookOpen className="w-4 h-4 text-purple-400" />}
          >
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{preparedAnswer}</p>
          </CollapsibleSection>
        )}

        {/* Suggested Follow-up */}
        {evaluation.suggestedFollowUp && (
          <CollapsibleSection
            title="Likely Follow-up Question"
            icon={<TrendingUp className="w-4 h-4 text-yellow-400" />}
          >
            <p className="text-sm text-gray-300 italic">&ldquo;{evaluation.suggestedFollowUp}&rdquo;</p>
            <p className="text-xs text-gray-500 mt-2">
              Consider how you would answer this if the interviewer asked.
            </p>
          </CollapsibleSection>
        )}
      </div>

      {/* Next Question Button */}
      {onNextQuestion && (
        <div className="flex justify-end pt-2">
          <Button onClick={onNextQuestion} size="lg">
            {isLastQuestion ? 'View Summary' : 'Next Question'}
            <ChevronDown className="w-4 h-4 ml-2 rotate-[-90deg]" />
          </Button>
        </div>
      )}
    </div>
  );
};

/**
 * Compact version for summary view
 */
export const QuestionFeedbackCompact: React.FC<{
  result: QuestionResult;
  onClick?: () => void;
}> = ({ result, onClick }) => {
  const { question, evaluation, responseTimeSeconds } = result;

  return (
    <Card
      className={cn(
        'cursor-pointer hover:border-gray-600 transition-colors',
        onClick && 'hover:bg-gray-800/30'
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <ScoreDisplay score={evaluation.score} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{question.question}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="text-xs bg-gray-800 text-gray-400">
                {question.category}
              </Badge>
              <span className="text-xs text-gray-500">
                STAR: {evaluation.starAdherence.score}/4
              </span>
              <span className="text-xs text-gray-500">
                {Math.floor(responseTimeSeconds / 60)}m {responseTimeSeconds % 60}s
              </span>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-500 rotate-[-90deg]" />
        </div>
      </CardContent>
    </Card>
  );
};

export default QuestionFeedback;
