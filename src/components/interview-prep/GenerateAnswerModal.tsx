import React, { useState, useCallback } from 'react';
import { Dialog, Button, Card, Badge } from '@/src/components/ui';
import { cn } from '@/src/lib/utils';
import {
  generateStarAnswer,
  refineStarAnswer,
  answerToExperience,
  type GeneratedAnswer
} from '@/src/services/gemini';
import { toast } from '@/src/stores';
import { useStories, useUnifiedActiveProfileId } from '@/src/hooks/useAppData';
import type {
  PredictedQuestion,
  UserProfile,
  JDAnalysis,
  CompanyResearch,
} from '@/src/types';
import {
  Sparkles,
  Loader2,
  CheckCircle,
  Edit3,
  Save,
  RefreshCw,
  Target,
  MessageSquare,
  Lightbulb,
  BookOpen,
  AlertCircle,
  Send,
  Wand2,
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
  const [generatedAnswer, setGeneratedAnswer] = useState<GeneratedAnswer | null>(null);
  const [editedAnswer, setEditedAnswer] = useState<GeneratedAnswer | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refinementInput, setRefinementInput] = useState('');
  const [showRefinementPanel, setShowRefinementPanel] = useState(false);
  const [refinementHistory, setRefinementHistory] = useState<string[]>([]);

  const activeProfileId = useUnifiedActiveProfileId();
  const { addStory, isUsingSupabase } = useStories();

  // Quick refinement suggestions
  const refinementSuggestions = [
    'Make it more concise',
    'Add more technical details',
    'Emphasize leadership',
    'Include more metrics',
    'Make it more conversational',
    'Focus on problem-solving',
  ];

  // Generate answer when modal opens
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setViewMode('generating');

    try {
      const answer = await generateStarAnswer({
        question,
        profile,
        analysis,
        research,
        company,
        role,
      });

      setGeneratedAnswer(answer);
      setEditedAnswer(answer);
      setViewMode('preview');
    } catch (err) {
      console.error('Failed to generate answer:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate answer');
      setViewMode('preview');
    } finally {
      setIsGenerating(false);
    }
  }, [question, profile, analysis, research, company, role]);

  // Refine answer with user feedback
  const handleRefine = useCallback(async (feedback: string) => {
    if (!editedAnswer || !feedback.trim()) return;

    setIsRefining(true);
    setError(null);

    try {
      const refined = await refineStarAnswer({
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
      const experienceData = answerToExperience(
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

      toast.success('Story created!', 'Answer saved to My Stories and linked to question');
      onStoryCreated(newStory.id);
      onClose();
    } catch (err) {
      console.error('Failed to save story:', err);
      toast.error('Save failed', 'Could not save story. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [editedAnswer, question.question, activeProfileId, addStory, onStoryCreated, onClose, isUsingSupabase]);

  // Handle field edits
  const handleEditField = (field: string, value: string) => {
    if (!editedAnswer) return;

    if (field.startsWith('star.')) {
      const starField = field.replace('star.', '') as keyof typeof editedAnswer.star;
      setEditedAnswer({
        ...editedAnswer,
        star: {
          ...editedAnswer.star,
          [starField]: value,
        },
      });
    } else if (field === 'title') {
      setEditedAnswer({
        ...editedAnswer,
        title: value,
      });
    }
  };

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
          <h3 className="text-lg font-medium text-white mt-6">Generating Your Answer</h3>
          <p className="text-sm text-gray-400 mt-2 text-center max-w-sm">
            AI is crafting a tailored STAR response based on your profile and this job...
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-4">
            <Loader2 className="w-3 h-3 animate-spin" />
            Analyzing your experience...
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

    return (
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Story Title</label>
          {viewMode === 'editing' ? (
            <input
              type="text"
              value={editedAnswer.title}
              onChange={(e) => handleEditField('title', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <p className="text-white font-medium">{editedAnswer.title}</p>
          )}
        </div>

        {/* STAR Sections */}
        <Card className="p-4 space-y-4">
          <h4 className="text-sm font-medium text-blue-400 flex items-center gap-2">
            <Target className="w-4 h-4" />
            STAR Response
          </h4>

          {(['situation', 'task', 'action', 'result'] as const).map((section) => (
            <div key={section}>
              <label className="block text-xs font-medium text-gray-400 uppercase mb-1">
                {section}
              </label>
              {viewMode === 'editing' ? (
                <textarea
                  value={editedAnswer.star[section]}
                  onChange={(e) => handleEditField(`star.${section}`, e.target.value)}
                  rows={section === 'action' ? 4 : 2}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                />
              ) : (
                <p className="text-sm text-gray-300">{editedAnswer.star[section]}</p>
              )}
            </div>
          ))}
        </Card>

        {/* Metrics */}
        {editedAnswer.metrics.primary && (
          <Card className="p-4">
            <h4 className="text-sm font-medium text-green-400 flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4" />
              Key Metrics
            </h4>
            <div className="text-lg font-semibold text-white">{editedAnswer.metrics.primary}</div>
            {editedAnswer.metrics.secondary.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
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
          <label className="block text-sm font-medium text-gray-300 mb-2">Skills Demonstrated</label>
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
            <MessageSquare className="w-4 h-4" />
            Key Talking Points
          </h4>
          <ul className="space-y-1">
            {editedAnswer.keyTalkingPoints.map((point, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
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
          <p className="text-sm text-gray-300">{editedAnswer.coachingNotes}</p>
        </Card>

        {/* Delivery Tips */}
        <Card className="p-4">
          <h4 className="text-sm font-medium text-cyan-400 flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4" />
            Delivery Tips
          </h4>
          <ul className="space-y-1">
            {editedAnswer.deliveryTips.map((tip, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">{i + 1}.</span>
                {tip}
              </li>
            ))}
          </ul>
        </Card>

        {/* Follow-up Questions */}
        <Card className="p-4">
          <h4 className="text-sm font-medium text-orange-400 flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4" />
            Likely Follow-up Questions
          </h4>
          <ul className="space-y-2">
            {editedAnswer.followUpQuestions.map((q, i) => (
              <li key={i} className="text-sm text-gray-300 italic">
                "{q}"
              </li>
            ))}
          </ul>
        </Card>
      </div>
    );
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Answer"
      className="max-w-2xl"
    >
      {/* Question Context */}
      <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
        <p className="text-xs text-gray-400 mb-1">Question:</p>
        <p className="text-sm text-white">{question.question}</p>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant={question.likelihood === 'high' ? 'danger' : question.likelihood === 'medium' ? 'warning' : 'default'} className="text-xs">
            {question.likelihood}
          </Badge>
          <Badge variant="info" className="text-xs">
            {question.category}
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

              {/* Quick Suggestions */}
              <div className="flex flex-wrap gap-2 mb-3">
                {refinementSuggestions.map((suggestion) => (
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
                Start Over
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
