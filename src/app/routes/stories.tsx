import React, { useState } from 'react';
import { useStoriesStore, toast } from '@/src/stores';
import { formatExperienceToSTAR } from '@/src/services/gemini';
import { Button, Input, Textarea, Card, CardHeader, CardContent, Badge, Dialog } from '@/src/components/ui';
import { StoriesEmptyState } from '@/src/components/shared';
import { cn } from '@/src/lib/utils';
import type { Experience, STAR } from '@/src/types';
import {
  Book,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  Tag,
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  Mic,
  Search,
} from 'lucide-react';

export const StoriesPage: React.FC = () => {
  const stories = useStoriesStore((s) => s.stories);
  const addStory = useStoriesStore((s) => s.addStory);
  const updateStory = useStoriesStore((s) => s.updateStory);
  const deleteStory = useStoriesStore((s) => s.deleteStory);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStory, setEditingStory] = useState<Experience | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Get unique tags from all stories
  const allTags = Array.from(new Set(stories.flatMap((s) => s.tags)));

  // Filter stories
  const filteredStories = stories.filter((story) => {
    const matchesSearch =
      !searchQuery ||
      story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.rawInput.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.star.situation.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !selectedTag || story.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const handleAddStory = () => {
    setEditingStory(null);
    setShowAddModal(true);
  };

  const handleEditStory = (story: Experience) => {
    setEditingStory(story);
    setShowAddModal(true);
  };

  const handleDeleteStory = (id: string) => {
    deleteStory(id);
    toast.success('Story deleted', 'Your story has been removed');
  };

  const handleSaveStory = (story: Partial<Experience>) => {
    if (editingStory) {
      updateStory(editingStory.id, story);
      toast.success('Story updated', 'Your changes have been saved');
    } else {
      addStory(story);
      toast.success('Story added', 'New story saved to your collection');
    }
    setShowAddModal(false);
    setEditingStory(null);
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Book className="w-6 h-6 text-blue-500" />
              My Stories
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Build your interview story library with AI-formatted STAR responses
            </p>
          </div>
          <Button
            variant="primary"
            onClick={handleAddStory}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Story
          </Button>
        </div>

        {stories.length > 0 ? (
          <>
            {/* Search & Filter */}
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search stories..."
                  leftIcon={<Search className="w-4 h-4" />}
                />
              </div>
              {allTags.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedTag(null)}
                    className={cn(
                      'px-3 py-1 text-xs rounded-full transition-colors',
                      !selectedTag
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    )}
                  >
                    All
                  </button>
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                      className={cn(
                        'px-3 py-1 text-xs rounded-full transition-colors',
                        tag === selectedTag
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:text-white'
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Stories List */}
            <div className="space-y-4">
              {filteredStories.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  onEdit={() => handleEditStory(story)}
                  onDelete={() => handleDeleteStory(story.id)}
                />
              ))}
              {filteredStories.length === 0 && (
                <div className="text-center py-10 text-gray-500">
                  No stories match your search
                </div>
              )}
            </div>
          </>
        ) : (
          <Card className="min-h-[400px] flex items-center justify-center">
            <StoriesEmptyState onAddStory={handleAddStory} />
          </Card>
        )}

        {/* Add/Edit Modal */}
        <StoryModal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setEditingStory(null);
          }}
          onSave={handleSaveStory}
          initialData={editingStory || undefined}
        />
      </div>
    </div>
  );
};

// Story Card Component
interface StoryCardProps {
  story: Experience;
  onEdit: () => void;
  onDelete: () => void;
}

const StoryCard: React.FC<StoryCardProps> = ({ story, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied', 'Story copied to clipboard');
  };

  const formatSTARForCopy = () => {
    return `**Situation:** ${story.star.situation}\n\n**Task:** ${story.star.task}\n\n**Action:** ${story.star.action}\n\n**Result:** ${story.star.result}`;
  };

  return (
    <Card className="overflow-hidden">
      <div
        className="p-4 cursor-pointer hover:bg-gray-800/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-white">{story.title}</h3>
            <p className="text-sm text-gray-400 line-clamp-2 mt-1">{story.star.situation}</p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <div className="flex gap-1">
              {story.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="default" size="sm">
                  {tag}
                </Badge>
              ))}
            </div>
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-800">
          <CardContent className="p-4 space-y-4">
            {/* STAR Format */}
            <div className="space-y-3">
              <STARSection label="Situation" content={story.star.situation} />
              <STARSection label="Task" content={story.star.task} />
              <STARSection label="Action" content={story.star.action} />
              <STARSection label="Result" content={story.star.result} />
            </div>

            {/* Metrics */}
            {story.metrics.primary && (
              <div className="p-3 bg-green-900/20 border border-green-800/50 rounded-lg">
                <span className="text-xs text-green-400 uppercase font-semibold">Key Metric</span>
                <p className="text-green-300 font-medium">{story.metrics.primary}</p>
                {story.metrics.secondary.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {story.metrics.secondary.map((m, i) => (
                      <Badge key={i} variant="success" size="sm">
                        {m}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Coaching Notes */}
            {story.coachingNotes && (
              <div className="p-3 bg-blue-900/20 border border-blue-800/50 rounded-lg">
                <span className="text-xs text-blue-400 uppercase font-semibold">AI Coaching</span>
                <p className="text-sm text-gray-300 mt-1">{story.coachingNotes}</p>
              </div>
            )}

            {/* Follow-up Questions */}
            {story.followUpQuestions.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs text-gray-500 uppercase font-semibold">
                  Prepare for Follow-ups
                </span>
                <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
                  {story.followUpQuestions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-800">
              <div className="text-xs text-gray-500">
                Used {story.timesUsed} times • Created{' '}
                {new Date(story.createdAt).toLocaleDateString()}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(formatSTARForCopy())}
                  leftIcon={<Copy className="w-3 h-3" />}
                >
                  Copy
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEdit}
                  leftIcon={<Edit2 className="w-3 h-3" />}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                  leftIcon={<Trash2 className="w-3 h-3" />}
                  className="text-red-400 hover:text-red-300"
                >
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </div>
      )}
    </Card>
  );
};

// STAR Section Component
const STARSection: React.FC<{ label: string; content: string }> = ({ label, content }) => (
  <div>
    <span
      className={cn(
        'text-xs uppercase font-bold',
        label === 'Situation' && 'text-purple-400',
        label === 'Task' && 'text-blue-400',
        label === 'Action' && 'text-green-400',
        label === 'Result' && 'text-yellow-400'
      )}
    >
      {label}
    </span>
    <p className="text-sm text-gray-300 mt-1">{content}</p>
  </div>
);

// Story Modal Component
interface StoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (story: Partial<Experience>) => void;
  initialData?: Experience;
}

const StoryModal: React.FC<StoryModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [rawInput, setRawInput] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [star, setStar] = useState<STAR>({
    situation: '',
    task: '',
    action: '',
    result: '',
  });
  const [isFormatting, setIsFormatting] = useState(false);
  const [coachingNotes, setCoachingNotes] = useState('');
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title);
        setRawInput(initialData.rawInput);
        setStar(initialData.star);
        setTags(initialData.tags);
        setCoachingNotes(initialData.coachingNotes || '');
        setFollowUpQuestions(initialData.followUpQuestions);
        setStep('review');
      } else {
        setTitle('');
        setRawInput('');
        setStar({ situation: '', task: '', action: '', result: '' });
        setTags([]);
        setCoachingNotes('');
        setFollowUpQuestions([]);
        setStep('input');
      }
    }
  }, [isOpen, initialData]);

  const handleFormat = async () => {
    if (!rawInput.trim()) {
      toast.error('Missing input', 'Please describe your experience');
      return;
    }

    setIsFormatting(true);
    try {
      const result = await formatExperienceToSTAR(rawInput);
      setTitle(result.title);
      setStar(result.star);
      setTags(result.suggestedTags);
      setCoachingNotes(result.coachingNotes || '');
      setFollowUpQuestions(result.followUpQuestions);
      setStep('review');
      toast.success('Formatted!', 'Review your STAR story below');
    } catch (error) {
      console.error('Formatting failed:', error);
      toast.error('Formatting failed', 'Please try again');
    } finally {
      setIsFormatting(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSave = () => {
    if (!title.trim() || !star.situation.trim()) {
      toast.error('Missing required fields', 'Please fill in the title and STAR content');
      return;
    }

    onSave({
      title,
      rawInput,
      inputMethod: 'manual',
      star,
      tags,
      coachingNotes,
      followUpQuestions,
      metrics: {
        primary: undefined,
        secondary: [],
      },
      variations: {},
    });
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Story' : 'Add Story'}
      size="lg"
    >
      <div className="p-6 space-y-4">
        {step === 'input' ? (
          <>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Describe your experience (the AI will format it into STAR format)
              </label>
              <Textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="Tell me about a time when you... What was the situation? What did you do? What was the outcome?"
                rows={10}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleFormat}
                disabled={!rawInput.trim() || isFormatting}
                isLoading={isFormatting}
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                Format with AI
              </Button>
            </div>
          </>
        ) : (
          <>
            <Input
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Led migration to microservices"
            />

            <div className="space-y-3">
              <Textarea
                label="Situation"
                value={star.situation}
                onChange={(e) => setStar({ ...star, situation: e.target.value })}
                rows={2}
              />
              <Textarea
                label="Task"
                value={star.task}
                onChange={(e) => setStar({ ...star, task: e.target.value })}
                rows={2}
              />
              <Textarea
                label="Action"
                value={star.action}
                onChange={(e) => setStar({ ...star, action: e.target.value })}
                rows={3}
              />
              <Textarea
                label="Result"
                value={star.result}
                onChange={(e) => setStar({ ...star, result: e.target.value })}
                rows={2}
              />
            </div>

            {/* Tags */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Tags</label>
              <div className="flex gap-2 flex-wrap mb-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="info"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag} ×
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add a tag..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                />
                <Button variant="ghost" onClick={handleAddTag} disabled={!tagInput.trim()}>
                  Add
                </Button>
              </div>
            </div>

            {/* Coaching Notes */}
            {coachingNotes && (
              <div className="p-3 bg-blue-900/20 border border-blue-800/50 rounded-lg text-sm text-gray-300">
                <span className="text-xs text-blue-400 uppercase font-semibold block mb-1">
                  AI Coaching
                </span>
                {coachingNotes}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep('input')}>
                ← Back to Input
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSave}>
                  Save Story
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
};

export default StoriesPage;
