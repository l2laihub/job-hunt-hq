import React, { useState, useCallback } from 'react';
import { Dialog, Button, Card, Badge } from '@/src/components/ui';
import { cn } from '@/src/lib/utils';
import {
  generateInterviewAnswer,
  refineInterviewAnswer,
  interviewAnswerToExperience,
  getFormatDisplayInfo,
  getQuestionTypeDisplayName,
  type GeneratedInterviewAnswer,
} from '@/src/services/gemini';
import { toast } from '@/src/stores';
import { useStories, useUnifiedActiveProfileId } from '@/src/hooks/useAppData';
import type {
  PredictedQuestion,
  UserProfile,
  JDAnalysis,
  CompanyResearch,
  AnswerFormatType,
} from '@/src/types';
import {
  Sparkles,
  Loader2,
  CheckCircle,
  Edit3,
  Save,
  RefreshCw,
  MessageSquare,
  Lightbulb,
  BookOpen,
  AlertCircle,
  Send,
  Wand2,
  Layout,
  Code,
  FileText,
  ChevronDown,
  ChevronUp,
  Zap,
  Brain,
  Layers,
  Info,
} from 'lucide-react';

interface GenerateAnswerModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: PredictedQuestion;
  profile: UserProfile;
  analysis?: JDAnalysis;
  research?: CompanyResearch;
  company: string;
  role: string;
  onStoryCreated: (storyId: string) => void;
}

type ViewMode = 'generating' | 'preview' | 'editing';

// Format-specific icons
const formatIcons: Record<AnswerFormatType, React.ReactNode> = {
  'STAR': <FileText className="w-4 h-4" />,
  'Requirements-Design-Tradeoffs': <Layout className="w-4 h-4" />,
  'Explain-Example-Tradeoffs': <Brain className="w-4 h-4" />,
  'Approach-Implementation-Complexity': <Code className="w-4 h-4" />,
};

// Format-specific colors
const formatColors: Record<AnswerFormatType, string> = {
  'STAR': 'purple',
  'Requirements-Design-Tradeoffs': 'blue',
  'Explain-Example-Tradeoffs': 'green',
  'Approach-Implementation-Complexity': 'orange',
};

// Section label colors based on format
const getSectionColor = (format: AnswerFormatType, index: number): string => {
  const colorSchemes: Record<AnswerFormatType, string[]> = {
    'STAR': ['purple', 'blue', 'green', 'yellow'],
    'Requirements-Design-Tradeoffs': ['cyan', 'blue', 'indigo', 'purple', 'pink'],
    'Explain-Example-Tradeoffs': ['green', 'teal', 'emerald', 'lime'],
    'Approach-Implementation-Complexity': ['orange', 'amber', 'yellow', 'red'],
  };
  const colors = colorSchemes[format] || ['gray'];
  return colors[index % colors.length];
};

export const GenerateAnswerModal: React.FC<GenerateAnswerModalProps> = ({
  isOpen,
  onClose,
  question,
  profile,
  analysis,
  research,
  company,
  role,
  onStoryCreated,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('generating');
  const [generatedAnswer, setGeneratedAnswer] = useState<GeneratedInterviewAnswer | null>(null);
  const [editedAnswer, setEditedAnswer] = useState<GeneratedInterviewAnswer | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refinementInput, setRefinementInput] = useState('');
  const [showRefinementPanel, setShowRefinementPanel] = useState(false);
  const [refinementHistory, setRefinementHistory] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0, 1, 2, 3]));
  const [showNarrative, setShowNarrative] = useState(false);

  const activeProfileId = useUnifiedActiveProfileId();
  const { stories, addStory, isUsingSupabase } = useStories();

  // Get format-specific refinement suggestions
  const getRefinementSuggestions = (format?: AnswerFormatType): string[] => {
    const baseSuggestions = [
      'Make it more concise',
      'Add more metrics',
      'Make it more conversational',
    ];

    if (!format) return baseSuggestions;

    switch (format) {
      case 'STAR':
        return [
          ...baseSuggestions,
          'Emphasize leadership',
          'Add more technical details',
          'Strengthen the result section',
        ];
      case 'Requirements-Design-Tradeoffs':
        return [
          'Add more clarifying questions',
          'Deepen the architecture explanation',
          'Add scalability considerations',
          'Include more trade-off analysis',
          'Add data model details',
          'Reference similar systems I\'ve built',
        ];
      case 'Explain-Example-Tradeoffs':
        return [
          'Add more concrete examples',
          'Simplify the explanation',
          'Add code examples',
          'Include more trade-offs',
          'Add real-world applications',
          'Reference my experience with this',
        ];
      case 'Approach-Implementation-Complexity':
        return [
          'Add edge case handling',
          'Optimize the solution',
          'Add alternative approaches',
          'Include pseudocode',
          'Explain the complexity analysis',
          'Add follow-up optimizations',
        ];
      default:
        return baseSuggestions;
    }
  };

  // Generate answer when modal opens
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setViewMode('generating');

    try {
      const answer = await generateInterviewAnswer({
        question,
        profile,
        stories: stories || [],
        analysis,
        research,
        company,
        role,
      });

      setGeneratedAnswer(answer);
      setEditedAnswer(answer);
      setViewMode('preview');
      // Expand all sections by default
      setExpandedSections(new Set(answer.sections.map((_, i) => i)));
    } catch (err) {
      console.error('Failed to generate answer:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate answer');
      setViewMode('preview');
    } finally {
      setIsGenerating(false);
    }
  }, [question, profile, stories, analysis, research, company, role]);

  // Refine answer with user feedback
  const handleRefine = useCallback(async (feedback: string) => {
    if (!editedAnswer || !feedback.trim()) return;

    setIsRefining(true);
    setError(null);

    try {
      const refined = await refineInterviewAnswer({
        currentAnswer: editedAnswer,
        refinementFeedback: feedback,
        question: question.question,
        company,
        role,
      });

      setGeneratedAnswer(refined);
      setEditedAnswer(refined);
      setRefinementHistory((prev) => [...prev, feedback]);
      setRefinementInput('');
      toast.success('Answer refined', 'Your feedback has been applied');
    } catch (err) {
      console.error('Failed to refine answer:', err);
      setError(err instanceof Error ? err.message : 'Failed to refine answer');
    } finally {
      setIsRefining(false);
    }
  }, [editedAnswer, question.question, company, role]);

  // Handle refinement submission
  const handleSubmitRefinement = () => {
    if (refinementInput.trim()) {
      handleRefine(refinementInput);
    }
  };

  // Start generation when modal opens
  React.useEffect(() => {
    if (isOpen && !generatedAnswer && !isGenerating) {
      handleGenerate();
    }
  }, [isOpen, generatedAnswer, isGenerating, handleGenerate]);

  // Reset when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setGeneratedAnswer(null);
      setEditedAnswer(null);
      setViewMode('generating');
      setError(null);
      setRefinementInput('');
      setShowRefinementPanel(false);
      setRefinementHistory([]);
      setExpandedSections(new Set([0, 1, 2, 3]));
      setShowNarrative(false);
    }
  }, [isOpen]);

  // Save to stories
  const handleSave = useCallback(async () => {
    if (!editedAnswer) {
      console.error('handleSave: No edited answer to save');
      return;
    }

    console.log('handleSave: Starting save process, isUsingSupabase:', isUsingSupabase);
    setIsSaving(true);
    try {
      const experienceData = interviewAnswerToExperience(
        editedAnswer,
        question.question,
        activeProfileId ?? undefined
      );
      console.log('handleSave: Experience data prepared', experienceData);

      // Use Promise.resolve to handle both sync (legacy) and async (Supabase) returns
      const newStory = await Promise.resolve(addStory(experienceData, activeProfileId ?? undefined));
      console.log('handleSave: Story created', newStory);

      if (!newStory || !newStory.id) {
        throw new Error('Story was not created properly - no ID returned');
      }

      // Link the story to the question
      console.log('GenerateAnswerModal: Calling onStoryCreated with id:', newStory.id);
      onStoryCreated(newStory.id);

      toast.success('Answer saved & linked!', 'Your answer is ready for practice');
      setIsSaving(false);
      onClose();
    } catch (err) {
      console.error('Failed to save story:', err);
      toast.error('Save failed', 'Could not save answer. Please try again.');
      setIsSaving(false);
    }
  }, [editedAnswer, question.question, activeProfileId, addStory, onStoryCreated, onClose, isUsingSupabase]);

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

  // Handle section edit
  const handleEditSection = (index: number, content: string) => {
    if (!editedAnswer) return;
    const newSections = [...editedAnswer.sections];
    newSections[index] = { ...newSections[index], content };
    setEditedAnswer({ ...editedAnswer, sections: newSections });
  };

  // Render format badge
  const renderFormatBadge = (answer: GeneratedInterviewAnswer) => {
    const formatInfo = getFormatDisplayInfo(answer.answerFormat);
    const colorClass = formatColors[answer.answerFormat] || 'gray';

    return (
      <div className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium',
        `bg-${colorClass}-900/30 text-${colorClass}-400 border border-${colorClass}-800/50`
      )}>
        {formatIcons[answer.answerFormat]}
        <span>{formatInfo.name}</span>
      </div>
    );
  };

  // Render the main content based on answer format
  const renderContent = () => {
    if (viewMode === 'generating' || isGenerating) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-blue-500/20" />
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white animate-pulse" />
            </div>
          </div>
          <h3 className="text-lg font-medium text-white mt-6">Analyzing Question Type...</h3>
          <p className="text-sm text-gray-400 mt-2 text-center max-w-sm">
            AI is detecting the question type and generating the optimal answer format...
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-4">
            <Loader2 className="w-3 h-3 animate-spin" />
            Crafting your personalized answer...
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-full bg-red-900/30 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-lg font-medium text-white mt-6">Generation Failed</h3>
          <p className="text-sm text-gray-400 mt-2 text-center max-w-sm">{error}</p>
          <Button onClick={handleGenerate} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      );
    }

    if (!editedAnswer) return null;

    const formatInfo = getFormatDisplayInfo(editedAnswer.answerFormat);

    return (
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {/* Format Detection Banner */}
        <Card className="p-4 bg-gradient-to-r from-gray-800/80 to-gray-900/80 border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {renderFormatBadge(editedAnswer)}
              <div>
                <p className="text-sm text-gray-300">{formatInfo.description}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Detected: {getQuestionTypeDisplayName(editedAnswer.detectedQuestionType)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNarrative(!showNarrative)}
                className="text-xs"
              >
                {showNarrative ? 'Show Structured' : 'Show Narrative'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Answer Title</label>
          {viewMode === 'editing' ? (
            <input
              type="text"
              value={editedAnswer.title}
              onChange={(e) => setEditedAnswer({ ...editedAnswer, title: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <p className="text-white font-medium text-lg">{editedAnswer.title}</p>
          )}
        </div>

        {/* Narrative View */}
        {showNarrative ? (
          <Card className="p-4">
            <h4 className="text-sm font-medium text-emerald-400 flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4" />
              Conversational Answer
            </h4>
            <div className="prose prose-invert prose-sm max-w-none">
              <div
                className="text-gray-300 leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{
                  __html: editedAnswer.narrative
                    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/`(.*?)`/g, '<code class="bg-gray-800 px-1 rounded text-blue-300">$1</code>')
                }}
              />
            </div>
          </Card>
        ) : (
          /* Structured Sections View */
          <Card className="p-4 space-y-3">
            <h4 className="text-sm font-medium text-blue-400 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              {formatInfo.name} Structure
            </h4>

            {editedAnswer.sections.map((section, index) => {
              const color = getSectionColor(editedAnswer.answerFormat, index);
              const isExpanded = expandedSections.has(index);

              return (
                <div
                  key={index}
                  className={cn(
                    'rounded-lg border-l-4 overflow-hidden transition-all',
                    `bg-${color}-900/10 border-l-${color}-500`
                  )}
                >
                  <button
                    onClick={() => toggleSection(index)}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-800/30 transition-colors"
                  >
                    <span className={cn(
                      'text-xs font-bold uppercase tracking-wide',
                      `text-${color}-400`
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
                      {viewMode === 'editing' ? (
                        <textarea
                          value={section.content}
                          onChange={(e) => handleEditSection(index, e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                      ) : (
                        <div
                          className="text-[15px] text-gray-300 leading-[1.7] tracking-wide whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{
                            __html: section.content
                              .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
                              .replace(/\*(.*?)\*/g, '<em>$1</em>')
                              .replace(/`(.*?)`/g, '<code class="bg-gray-800 px-1 rounded text-blue-300 text-sm">$1</code>')
                              .replace(/^(\d+)\.\s+/gm, '<span class="text-blue-400 font-medium">$1.</span> ')
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        )}

        {/* Metrics */}
        {(editedAnswer.metrics.primary || editedAnswer.metrics.secondary.length > 0) && (
          <Card className="p-4">
            <h4 className="text-sm font-medium text-green-400 flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4" />
              Key Metrics & Results
            </h4>
            {editedAnswer.metrics.primary && (
              <div className="text-lg font-semibold text-white mb-2">{editedAnswer.metrics.primary}</div>
            )}
            {editedAnswer.metrics.secondary.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {editedAnswer.metrics.secondary.map((metric, i) => (
                  <Badge key={i} variant="default" className="text-xs">
                    {metric}
                  </Badge>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Skills & Topics</label>
          <div className="flex flex-wrap gap-2">
            {editedAnswer.tags.map((tag, i) => (
              <Badge key={i} variant="primary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Key Talking Points */}
        <Card className="p-4">
          <h4 className="text-sm font-medium text-purple-400 flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4" />
            Key Talking Points
          </h4>
          <ul className="space-y-2">
            {editedAnswer.keyTalkingPoints.map((point, i) => (
              <li key={i} className="text-[15px] text-gray-300 leading-[1.7] tracking-wide flex items-start gap-2">
                <span className="text-purple-400 mt-0.5">•</span>
                {point}
              </li>
            ))}
          </ul>
        </Card>

        {/* Coaching Notes */}
        <Card className="p-4 bg-yellow-900/10 border-yellow-800/30">
          <h4 className="text-sm font-medium text-yellow-400 flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4" />
            Coaching Notes
          </h4>
          <p className="text-[15px] text-gray-300 leading-[1.7] tracking-wide">{editedAnswer.coachingNotes}</p>
        </Card>

        {/* Delivery Tips */}
        <Card className="p-4">
          <h4 className="text-sm font-medium text-cyan-400 flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4" />
            Delivery Tips
          </h4>
          <ul className="space-y-2">
            {editedAnswer.deliveryTips.map((tip, i) => (
              <li key={i} className="text-[15px] text-gray-300 leading-[1.7] tracking-wide flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">{i + 1}.</span>
                {tip}
              </li>
            ))}
          </ul>
        </Card>

        {/* Follow-up Questions */}
        <Card className="p-4">
          <h4 className="text-sm font-medium text-orange-400 flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4" />
            Likely Follow-up Questions
          </h4>
          <div className="space-y-4">
            {editedAnswer.followUpQuestions.map((followUp, i) => (
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

        {/* Sources */}
        {(editedAnswer.sources.storyIds.length > 0 || editedAnswer.sources.profileSections.length > 0) && (
          <Card className="p-4 bg-gray-800/30">
            <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2 mb-2">
              <Info className="w-4 h-4" />
              Sources Used
            </h4>
            <div className="flex flex-wrap gap-2">
              {editedAnswer.sources.profileSections.map((section, i) => (
                <Badge key={`profile-${i}`} variant="default" className="text-xs">
                  Profile: {section}
                </Badge>
              ))}
              {editedAnswer.sources.storyIds.length > 0 && (
                <Badge variant="info" className="text-xs">
                  {editedAnswer.sources.storyIds.length} experience stories referenced
                </Badge>
              )}
              {editedAnswer.sources.synthesized && (
                <Badge variant="warning" className="text-xs">
                  AI-synthesized content included
                </Badge>
              )}
            </div>
          </Card>
        )}
      </div>
    );
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Interview Answer"
      className="max-w-3xl"
    >
      {/* Question Context */}
      <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
        <p className="text-xs text-gray-400 mb-1">Question:</p>
        <p className="text-sm text-white font-medium">{question.question}</p>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant={question.likelihood === 'high' ? 'danger' : question.likelihood === 'medium' ? 'warning' : 'default'} className="text-xs">
            {question.likelihood} likelihood
          </Badge>
          <Badge variant="info" className="text-xs">
            {question.category}
          </Badge>
          <Badge variant="default" className="text-xs">
            {question.difficulty}
          </Badge>
        </div>
      </div>

      {renderContent()}

      {/* Refinement Panel */}
      {(viewMode === 'preview' || viewMode === 'editing') && editedAnswer && !error && (
        <div className="mt-4 border-t border-gray-800 pt-4">
          {/* Toggle Refinement Panel */}
          {!showRefinementPanel ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRefinementPanel(true)}
              className="w-full mb-4"
              disabled={isRefining}
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Refine with AI
            </Button>
          ) : (
            <Card className="p-4 mb-4 bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-800/30">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-purple-400 flex items-center gap-2">
                  <Wand2 className="w-4 h-4" />
                  Refine Your Answer
                </h4>
                <button
                  onClick={() => setShowRefinementPanel(false)}
                  className="text-gray-400 hover:text-white text-xs"
                >
                  Close
                </button>
              </div>

              {/* Quick Suggestions - Format-specific */}
              <div className="flex flex-wrap gap-2 mb-3">
                {getRefinementSuggestions(editedAnswer?.answerFormat).map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleRefine(suggestion)}
                    disabled={isRefining}
                    className={cn(
                      'text-xs px-2 py-1 rounded-full transition-colors',
                      'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white',
                      'border border-gray-700 hover:border-gray-600',
                      isRefining && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              {/* Custom Refinement Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={refinementInput}
                  onChange={(e) => setRefinementInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isRefining) {
                      handleSubmitRefinement();
                    }
                  }}
                  placeholder="Tell AI how to improve this answer..."
                  disabled={isRefining}
                  className={cn(
                    'flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg',
                    'text-white text-sm placeholder-gray-500',
                    'focus:ring-2 focus:ring-purple-500 focus:border-transparent',
                    isRefining && 'opacity-50'
                  )}
                />
                <Button
                  onClick={handleSubmitRefinement}
                  disabled={isRefining || !refinementInput.trim()}
                  size="sm"
                >
                  {isRefining ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Refinement History */}
              {refinementHistory.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-800">
                  <p className="text-xs text-gray-500 mb-2">Refinement history:</p>
                  <div className="flex flex-wrap gap-1">
                    {refinementHistory.map((item, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded"
                      >
                        {i + 1}. {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Refining indicator */}
              {isRefining && (
                <div className="mt-3 flex items-center gap-2 text-sm text-purple-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Refining your answer...
                </div>
              )}
            </Card>
          )}

          {/* Main Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating || isRefining}
              >
                <RefreshCw className={cn('w-4 h-4 mr-1', isGenerating && 'animate-spin')} />
                Regenerate
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode(viewMode === 'editing' ? 'preview' : 'editing')}
                disabled={isRefining}
              >
                <Edit3 className="w-4 h-4 mr-1" />
                {viewMode === 'editing' ? 'Done Editing' : 'Edit Manually'}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={onClose} disabled={isRefining}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving || isRefining}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save to My Stories
              </Button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
};

export default GenerateAnswerModal;
