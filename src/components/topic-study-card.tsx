import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
  BookOpen,
  HelpCircle,
  ExternalLink,
  CheckCircle,
  Clock,
  Play,
  Target,
  Video,
  FileText,
  GraduationCap,
  Code,
} from 'lucide-react';
import { Card, CardContent, Button, Badge } from '@/src/components/ui';
import { MarkdownRenderer } from '@/src/components/ui/markdown-renderer';
import { cn } from '@/src/lib/utils';
import type { TopicDetails, TopicQuestion, TopicResource, JDAnalysis, UserProfile } from '@/src/types';

interface TopicStudyCardProps {
  topic: string;
  depth: 'basic' | 'intermediate' | 'deep';
  notes: string;
  details?: TopicDetails;
  isGenerating: boolean;
  onGenerate: () => void;
  onPractice: (confidenceLevel: 'low' | 'medium' | 'high') => void;
}

const depthColors = {
  basic: 'bg-gray-700 text-gray-400',
  intermediate: 'bg-yellow-900/30 text-yellow-400',
  deep: 'bg-red-900/30 text-red-400',
};

const difficultyColors = {
  basic: 'bg-green-900/30 text-green-400 border-green-700/50',
  intermediate: 'bg-yellow-900/30 text-yellow-400 border-yellow-700/50',
  advanced: 'bg-red-900/30 text-red-400 border-red-700/50',
};

const confidenceColors = {
  low: 'bg-red-900/30 text-red-400',
  medium: 'bg-yellow-900/30 text-yellow-400',
  high: 'bg-green-900/30 text-green-400',
};

const resourceIcons = {
  article: FileText,
  video: Video,
  course: GraduationCap,
  documentation: BookOpen,
  practice: Code,
};

export const TopicStudyCard: React.FC<TopicStudyCardProps> = ({
  topic,
  depth,
  notes,
  details,
  isGenerating,
  onGenerate,
  onPractice,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState<Record<number, boolean>>({});

  const toggleAnswer = (index: number) => {
    setShowAnswer((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const hasDetails = !!details;

  return (
    <Card className="overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-start gap-3 text-left hover:bg-gray-800/50 transition-colors"
      >
        <span
          className={cn(
            'px-2 py-0.5 rounded text-xs font-bold uppercase flex-shrink-0',
            depthColors[depth]
          )}
        >
          {depth}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white">{topic}</p>
          <p className="text-xs text-gray-400 mt-1 line-clamp-1">{notes}</p>
          {details && (
            <div className="flex items-center gap-3 mt-2 text-xs">
              {details.practiceCount > 0 && (
                <span className="flex items-center gap-1 text-blue-400">
                  <Play className="w-3 h-3" />
                  Practiced {details.practiceCount}x
                </span>
              )}
              {details.confidenceLevel && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded',
                    confidenceColors[details.confidenceLevel]
                  )}
                >
                  {details.confidenceLevel} confidence
                </span>
              )}
              <span className="text-gray-500">
                {details.questions.length} questions • {details.resources.length} resources
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!hasDetails && !isGenerating && (
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onGenerate();
              }}
              leftIcon={<Sparkles className="w-3 h-3" />}
            >
              Study Guide
            </Button>
          )}
          {isGenerating && (
            <div className="flex items-center gap-1 text-xs text-blue-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </div>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <CardContent className="pt-0 px-4 pb-4 border-t border-gray-700">
          {!hasDetails ? (
            <div className="py-8 text-center">
              <BookOpen className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-4">
                Generate a study guide to get interview questions, key concepts, and learning resources
              </p>
              <Button
                variant="primary"
                onClick={onGenerate}
                disabled={isGenerating}
                isLoading={isGenerating}
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                Generate Study Guide
              </Button>
            </div>
          ) : (
            <div className="space-y-6 mt-4">
              {/* Key Concepts */}
              <div>
                <h5 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Key Concepts
                </h5>
                <div className="grid md:grid-cols-2 gap-2">
                  {details.keyConcepts.map((concept, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-2 bg-gray-800/50 rounded text-sm text-gray-300"
                    >
                      <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      {concept}
                    </div>
                  ))}
                </div>
              </div>

              {/* Interview Questions */}
              <div>
                <h5 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  Interview Questions ({details.questions.length})
                </h5>
                <div className="space-y-3">
                  {details.questions.map((q, i) => (
                    <QuestionCard
                      key={i}
                      question={q}
                      index={i}
                      showAnswer={showAnswer[i] || false}
                      onToggleAnswer={() => toggleAnswer(i)}
                    />
                  ))}
                </div>
              </div>

              {/* Learning Resources */}
              <div>
                <h5 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Learning Resources ({details.resources.length})
                </h5>
                <div className="space-y-2">
                  {details.resources.map((resource, i) => (
                    <ResourceCard key={i} resource={resource} />
                  ))}
                </div>
              </div>

              {/* Practice Notes */}
              {details.practiceNotes && (
                <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-800/50">
                  <h5 className="text-sm font-semibold text-purple-400 mb-3">Practice Tips</h5>
                  <p className="text-[15px] text-gray-300 leading-[1.7] tracking-wide">{details.practiceNotes}</p>
                </div>
              )}

              {/* Practice Tracking */}
              <div className="pt-4 border-t border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    {details.lastPracticedAt ? (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Last practiced:{' '}
                        {new Date(details.lastPracticedAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span>Haven&apos;t practiced yet</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Mark confidence:</span>
                    {(['low', 'medium', 'high'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => onPractice(level)}
                        className={cn(
                          'px-2 py-1 rounded text-xs font-medium transition-colors',
                          details.confidenceLevel === level
                            ? confidenceColors[level]
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        )}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

// Question Card Sub-component
const QuestionCard: React.FC<{
  question: TopicQuestion;
  index: number;
  showAnswer: boolean;
  onToggleAnswer: () => void;
}> = ({ question, index, showAnswer, onToggleAnswer }) => {
  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
      <button
        onClick={onToggleAnswer}
        className="w-full p-3 flex items-start gap-3 text-left hover:bg-gray-800/70 transition-colors"
      >
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-700 text-gray-300 text-xs font-medium flex-shrink-0">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">{question.question}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              size="sm"
              className={cn('text-xs', difficultyColors[question.difficulty])}
            >
              {question.difficulty}
            </Badge>
            {question.keyPoints.length > 0 && (
              <span className="text-xs text-gray-500">
                {question.keyPoints.length} key points
              </span>
            )}
          </div>
        </div>
        {showAnswer ? (
          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {showAnswer && (
        <div className="px-4 pb-4 border-t border-gray-700 pt-4 ml-9">
          {/* Key Points */}
          <div className="mb-4">
            <span className="text-sm font-bold text-gray-500 uppercase">Key Points</span>
            <ul className="mt-2 space-y-2">
              {question.keyPoints.map((point, i) => (
                <li key={i} className="text-sm text-gray-300 leading-[1.7] tracking-wide flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">•</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* Full Answer */}
          <div className="mb-4">
            <span className="text-sm font-bold text-gray-500 uppercase">Answer</span>
            <div className="mt-2 p-4 bg-gray-900/50 rounded-lg">
              <MarkdownRenderer content={question.answer} variant="compact" />
            </div>
          </div>

          {/* Follow-up */}
          {question.followUp && (
            <div className="p-3 bg-yellow-900/10 rounded border border-yellow-800/30">
              <span className="text-sm font-bold text-yellow-500">Likely Follow-up:</span>
              <p className="text-sm text-gray-300 leading-[1.7] tracking-wide mt-2">{question.followUp}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Resource Card Sub-component
const ResourceCard: React.FC<{ resource: TopicResource }> = ({ resource }) => {
  const Icon = resourceIcons[resource.type] || FileText;

  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 hover:bg-gray-800/70 transition-colors group"
    >
      <div
        className={cn(
          'p-2 rounded',
          resource.priority === 'high'
            ? 'bg-red-900/30 text-red-400'
            : resource.priority === 'medium'
            ? 'bg-yellow-900/30 text-yellow-400'
            : 'bg-gray-700 text-gray-400'
        )}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
            {resource.title}
          </span>
          <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-blue-400" />
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500">{resource.source}</span>
          <span className="text-xs text-gray-600">•</span>
          <Badge size="sm" className="text-xs bg-gray-700 text-gray-400">
            {resource.type}
          </Badge>
        </div>
        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{resource.description}</p>
      </div>
    </a>
  );
};

export default TopicStudyCard;
