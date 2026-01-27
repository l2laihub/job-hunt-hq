import React, { useState, useMemo, useCallback } from 'react';
import { toast } from '@/src/stores';
import { useStories, useUnifiedActiveProfileId, useProfile } from '@/src/hooks/useAppData';
import { formatExperienceToSTAR, enhanceStory, type EnhanceStoryOptions } from '@/src/services/gemini';
import { Button, Input, Textarea, Card, CardContent, Badge, Dialog, ConfirmDialog, Abbr } from '@/src/components/ui';
import { MarkdownRenderer } from '@/src/components/ui/markdown-renderer';
import { StoriesEmptyState } from '@/src/components/shared';
import { cn } from '@/src/lib/utils';
import type { Experience, STAR } from '@/src/types';
import {
  Book,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  Search,
  X,
  CheckSquare,
  Square,
  Filter,
  FileText,
  Target,
  Star,
  BookOpen,
  MessageSquare,
  Lightbulb,
  CheckCircle,
  Wand2,
} from 'lucide-react';

export const StoriesPage: React.FC = () => {
  const activeProfileId = useUnifiedActiveProfileId();
  // Use unified hook that switches between Supabase and localStorage
  const { stories: allStories, addStory, updateStory, deleteStory } = useStories();

  // Filter stories by active profile - include stories with no profileId (legacy) or matching profileId
  const stories = useMemo(() => {
    if (!activeProfileId) return allStories;
    return allStories.filter((s) => !s.profileId || s.profileId === activeProfileId);
  }, [allStories, activeProfileId]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStory, setEditingStory] = useState<Experience | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagFilter, setShowTagFilter] = useState(false);

  // Bulk selection state
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedStoryIds, setSelectedStoryIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Get unique tags from all stories, sorted alphabetically
  const allTags = useMemo(() =>
    Array.from(new Set(stories.flatMap((s) => s.tags))).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    ),
    [stories]
  );

  // Advanced search - matches across all fields
  const searchStory = useCallback((story: Experience, query: string): boolean => {
    if (!query.trim()) return true;
    const lowerQuery = query.toLowerCase();

    // Search in title
    if (story.title.toLowerCase().includes(lowerQuery)) return true;

    // Search in raw input
    if (story.rawInput.toLowerCase().includes(lowerQuery)) return true;

    // Search in STAR sections
    if (story.star.situation.toLowerCase().includes(lowerQuery)) return true;
    if (story.star.task.toLowerCase().includes(lowerQuery)) return true;
    if (story.star.action.toLowerCase().includes(lowerQuery)) return true;
    if (story.star.result.toLowerCase().includes(lowerQuery)) return true;

    // Search in tags
    if (story.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) return true;

    // Search in metrics
    if (story.metrics.primary?.toLowerCase().includes(lowerQuery)) return true;
    if (story.metrics.secondary?.some(m => m.toLowerCase().includes(lowerQuery))) return true;

    // Search in coaching notes
    if (story.coachingNotes?.toLowerCase().includes(lowerQuery)) return true;

    return false;
  }, []);

  // Filter stories with advanced search and multi-tag support
  const filteredStories = useMemo(() => {
    return stories.filter((story) => {
      const matchesSearch = searchStory(story, searchQuery);
      const matchesTags = selectedTags.length === 0 ||
        selectedTags.every(tag => story.tags.includes(tag));
      return matchesSearch && matchesTags;
    });
  }, [stories, searchQuery, selectedTags, searchStory]);

  // Toggle tag selection for multi-select
  const toggleTagFilter = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // Clear all tag filters
  const clearTagFilters = () => {
    setSelectedTags([]);
  };

  // Bulk selection handlers
  const toggleStorySelection = (storyId: string) => {
    setSelectedStoryIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(storyId)) {
        newSet.delete(storyId);
      } else {
        newSet.add(storyId);
      }
      return newSet;
    });
  };

  const selectAllVisible = () => {
    setSelectedStoryIds(new Set(filteredStories.map(s => s.id)));
  };

  const deselectAll = () => {
    setSelectedStoryIds(new Set());
  };

  const exitBulkSelectMode = () => {
    setBulkSelectMode(false);
    setSelectedStoryIds(new Set());
  };

  const handleBulkDelete = () => {
    if (selectedStoryIds.size === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = () => {
    const count = selectedStoryIds.size;
    selectedStoryIds.forEach(id => {
      deleteStory(id);
    });
    toast.success(
      `${count} ${count === 1 ? 'story' : 'stories'} deleted`,
      'Selected stories have been removed'
    );
    setSelectedStoryIds(new Set());
    setBulkSelectMode(false);
    setShowBulkDeleteConfirm(false);
  };

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
      addStory(story, activeProfileId || undefined);
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
              Build your interview story library with AI-formatted <Abbr variant="subtle">STAR</Abbr> responses
            </p>
          </div>
          <div className="flex items-center gap-2">
            {bulkSelectMode ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exitBulkSelectMode}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={selectedStoryIds.size === 0}
                  leftIcon={<Trash2 className="w-4 h-4" />}
                >
                  Delete ({selectedStoryIds.size})
                </Button>
              </>
            ) : (
              <>
                {stories.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBulkSelectMode(true)}
                    leftIcon={<CheckSquare className="w-4 h-4" />}
                  >
                    Select
                  </Button>
                )}
                <Button
                  variant="primary"
                  onClick={handleAddStory}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Add Story
                </Button>
              </>
            )}
          </div>
        </div>

        {stories.length > 0 ? (
          <>
            {/* Search & Filter Bar */}
            <div className="space-y-3">
              <div className="flex gap-3 items-center">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search titles, STAR content, tags, metrics..."
                    leftIcon={<Search className="w-4 h-4" />}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      title="Clear search"
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Tag Filter Toggle */}
                {allTags.length > 0 && (
                  <Button
                    variant={showTagFilter || selectedTags.length > 0 ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setShowTagFilter(!showTagFilter)}
                    leftIcon={<Filter className="w-4 h-4" />}
                  >
                    Filter
                    {selectedTags.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-600 rounded-full">
                        {selectedTags.length}
                      </span>
                    )}
                  </Button>
                )}
              </div>

              {/* Expanded Tag Filter Panel */}
              {showTagFilter && allTags.length > 0 && (
                <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Filter by tags (select multiple)</span>
                    {selectedTags.length > 0 && (
                      <button
                        onClick={clearTagFilters}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTagFilter(tag)}
                        className={cn(
                          'px-3 py-1.5 text-xs rounded-lg transition-colors border',
                          selectedTags.includes(tag)
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Filters Display */}
              {(searchQuery || selectedTags.length > 0) && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">
                    Showing {filteredStories.length} of {stories.length} stories
                  </span>
                  {selectedTags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {selectedTags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded text-xs"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => toggleTagFilter(tag)}
                            className="hover:text-white"
                            title={`Remove ${tag} filter`}
                            aria-label={`Remove ${tag} filter`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Bulk Selection Controls */}
              {bulkSelectMode && (
                <div className="flex items-center gap-3 p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
                  <button
                    onClick={selectedStoryIds.size === filteredStories.length ? deselectAll : selectAllVisible}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    {selectedStoryIds.size === filteredStories.length ? 'Deselect all' : 'Select all visible'}
                  </button>
                  <span className="text-gray-500 text-sm">
                    {selectedStoryIds.size} selected
                  </span>
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
                  onEnhance={async (enhanced) => {
                    await updateStory(story.id, enhanced);
                  }}
                  bulkSelectMode={bulkSelectMode}
                  isSelected={selectedStoryIds.has(story.id)}
                  onToggleSelect={() => toggleStorySelection(story.id)}
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

        {/* Bulk Delete Confirmation */}
        <ConfirmDialog
          isOpen={showBulkDeleteConfirm}
          onClose={() => setShowBulkDeleteConfirm(false)}
          onConfirm={confirmBulkDelete}
          title="Delete Stories"
          message={`Are you sure you want to delete ${selectedStoryIds.size} ${selectedStoryIds.size === 1 ? 'story' : 'stories'}? This action cannot be undone.`}
          confirmText="Delete"
          variant="danger"
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
  onEnhance: (enhancedStory: Partial<Experience>) => Promise<void>;
  bulkSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

const StoryCard: React.FC<StoryCardProps> = ({
  story,
  onEdit,
  onDelete,
  onEnhance,
  bulkSelectMode = false,
  isSelected = false,
  onToggleSelect,
}) => {
  const { profile } = useProfile();
  const [expanded, setExpanded] = useState(false);
  const [showNarrative, setShowNarrative] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0, 1, 2, 3, 4, 5]));
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showEnhanceOptions, setShowEnhanceOptions] = useState(false);
  const enhanceDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (enhanceDropdownRef.current && !enhanceDropdownRef.current.contains(event.target as Node)) {
        setShowEnhanceOptions(false);
      }
    };

    if (showEnhanceOptions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEnhanceOptions]);

  // Check if story could benefit from enhancement
  const needsEnhancement = () => {
    const situationLength = story.star.situation?.length || 0;
    const taskLength = story.star.task?.length || 0;
    const actionLength = story.star.action?.length || 0;
    const resultLength = story.star.result?.length || 0;
    const totalLength = situationLength + taskLength + actionLength + resultLength;

    // Story needs enhancement if:
    // - Total STAR content is less than 400 characters
    // - Any section is missing or very short
    // - No metrics are defined
    // - No coaching notes exist
    const hasShortContent = totalLength < 400;
    const hasMissingSection = situationLength < 20 || taskLength < 20 || actionLength < 20 || resultLength < 20;
    const noMetrics = !story.metrics.primary && story.metrics.secondary.length === 0;
    const noCoaching = !story.coachingNotes;

    return hasShortContent || hasMissingSection || noMetrics || noCoaching;
  };

  const handleEnhance = async (focus: EnhanceStoryOptions['focus'] = 'full') => {
    setIsEnhancing(true);
    setShowEnhanceOptions(false);
    try {
      const enhanced = await enhanceStory(story, { focus, profile: profile || undefined });

      // Build generatedAnswerMetadata for the enhanced view
      const generatedAnswerMetadata = {
        detectedQuestionType: 'experience' as const,
        answerFormat: 'STAR' as const,
        sections: [
          { label: 'Situation', content: enhanced.star.situation },
          { label: 'Task', content: enhanced.star.task },
          { label: 'Action', content: enhanced.star.action },
          { label: 'Result', content: enhanced.star.result },
        ],
        narrative: enhanced.narrative,
        bulletPoints: enhanced.keyTalkingPoints,
        keyTalkingPoints: enhanced.keyTalkingPoints,
        deliveryTips: enhanced.deliveryTips,
        followUpQA: enhanced.followUpQA,
        sources: {
          storyIds: [story.id],
          profileSections: [],
          synthesized: true,
        },
      };

      await onEnhance({
        title: enhanced.title,
        star: enhanced.star,
        metrics: enhanced.metrics,
        tags: enhanced.tags,
        variations: enhanced.variations,
        followUpQuestions: enhanced.followUpQuestions,
        coachingNotes: enhanced.coachingNotes,
        generatedAnswerMetadata,
      });

      toast.success('Story enhanced!', enhanced.improvementSummary || 'Your story has been improved with AI');
    } catch (error) {
      console.error('Enhancement failed:', error);
      toast.error('Enhancement failed', 'Please try again');
    } finally {
      setIsEnhancing(false);
    }
  };

  // Check if this story has generated answer metadata
  const hasGeneratedMetadata = !!story.generatedAnswerMetadata;
  const metadata = story.generatedAnswerMetadata;

  // Get format info for display
  const getFormatInfo = () => {
    if (!metadata) return null;
    const formatMap: Record<string, { name: string; color: string }> = {
      'STAR': { name: 'STAR Format', color: 'purple' },
      'Requirements-Design-Tradeoffs': { name: 'System Design', color: 'blue' },
      'Explain-Example-Tradeoffs': { name: 'Conceptual', color: 'green' },
      'Approach-Implementation-Complexity': { name: 'Problem Solving', color: 'orange' },
    };
    return formatMap[metadata.answerFormat] || { name: 'General', color: 'gray' };
  };

  const formatInfo = getFormatInfo();

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied', 'Story copied to clipboard');
  };

  const formatSTARForCopy = () => {
    if (hasGeneratedMetadata && metadata) {
      return metadata.narrative;
    }
    return `**Situation:** ${story.star.situation}\n\n**Task:** ${story.star.task}\n\n**Action:** ${story.star.action}\n\n**Result:** ${story.star.result}`;
  };

  const handleCardClick = () => {
    if (bulkSelectMode && onToggleSelect) {
      onToggleSelect();
    } else {
      setExpanded(!expanded);
    }
  };

  return (
    <Card className={cn(
      "overflow-hidden transition-all",
      bulkSelectMode && isSelected && "ring-2 ring-blue-500 bg-blue-900/10"
    )}>
      <div
        className={cn(
          "p-4 cursor-pointer transition-colors",
          bulkSelectMode
            ? "hover:bg-gray-800/50"
            : "hover:bg-gray-800/30"
        )}
        onClick={handleCardClick}
      >
        <div className="flex items-start gap-3">
          {/* Checkbox for bulk selection */}
          {bulkSelectMode && (
            <div className="flex-shrink-0 pt-1">
              {isSelected ? (
                <CheckSquare className="w-5 h-5 text-blue-500" />
              ) : (
                <Square className="w-5 h-5 text-gray-500" />
              )}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white truncate">{story.title}</h3>
                  {/* Format badge for generated answers */}
                  {hasGeneratedMetadata && formatInfo && (
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      formatInfo.color === 'purple' && 'bg-purple-900/50 text-purple-400',
                      formatInfo.color === 'blue' && 'bg-blue-900/50 text-blue-400',
                      formatInfo.color === 'green' && 'bg-green-900/50 text-green-400',
                      formatInfo.color === 'orange' && 'bg-orange-900/50 text-orange-400',
                      formatInfo.color === 'gray' && 'bg-gray-800 text-gray-400',
                    )}>
                      {formatInfo.name}
                    </span>
                  )}
                  {/* Enhancement suggestion badge */}
                  {needsEnhancement() && !hasGeneratedMetadata && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-900/30 text-purple-400 flex items-center gap-1">
                      <Wand2 className="w-3 h-3" />
                      Enhance
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400 line-clamp-2 mt-1">
                  {hasGeneratedMetadata && metadata?.narrative
                    ? metadata.narrative.substring(0, 150) + '...'
                    : story.star.situation}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                <div className="flex gap-1">
                  {story.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="default" size="sm">
                      {tag}
                    </Badge>
                  ))}
                  {story.tags.length > 3 && (
                    <Badge variant="default" size="sm">
                      +{story.tags.length - 3}
                    </Badge>
                  )}
                </div>
                {!bulkSelectMode && (
                  expanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-800">
          <CardContent className="p-4 space-y-4">
            {/* Enhanced view for generated answers with metadata */}
            {hasGeneratedMetadata && metadata ? (
              <>
                {/* Toggle between Narrative and Structured view */}
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNarrative(!showNarrative)}
                    className="text-xs"
                  >
                    {showNarrative ? 'Show Structured' : 'Show Narrative'}
                  </Button>
                </div>

                {/* Main Content - Two columns on larger screens */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left Column */}
                  <div className="space-y-4">
                    {/* Narrative or Structured View */}
                    {showNarrative ? (
                      <div className="p-4 bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700 rounded-lg">
                        <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 mb-3">
                          <FileText className="w-4 h-4" />
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
                      </div>
                    ) : (
                      <div className="p-4 border border-gray-700 rounded-lg space-y-3">
                        <h4 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                          <Target className="w-4 h-4" />
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
                      </div>
                    )}

                    {/* Key Metrics */}
                    {(story.metrics.primary || story.metrics.secondary.length > 0) && (
                      <div className="p-3 bg-green-900/20 border border-green-800/50 rounded-lg">
                        <h4 className="text-sm font-semibold text-green-400 flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4" />
                          Key Metrics & Results
                        </h4>
                        {story.metrics.primary && (
                          <div className="text-lg font-bold text-white mb-2">{story.metrics.primary}</div>
                        )}
                        {story.metrics.secondary.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {story.metrics.secondary.map((metric, i) => (
                              <Badge key={i} variant="default" size="sm">
                                {metric}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Coaching Notes */}
                    {story.coachingNotes && (
                      <div className="p-3 bg-yellow-900/20 border border-yellow-800/50 rounded-lg">
                        <h4 className="text-sm font-semibold text-yellow-400 flex items-center gap-2 mb-2">
                          <Lightbulb className="w-4 h-4" />
                          Coaching Notes
                        </h4>
                        <p className="text-sm text-gray-300 leading-[1.7] whitespace-pre-wrap">{story.coachingNotes}</p>
                      </div>
                    )}
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    {/* Key Talking Points */}
                    {metadata.keyTalkingPoints.length > 0 && (
                      <div className="p-3 border border-gray-700 rounded-lg">
                        <h4 className="text-sm font-semibold text-purple-400 flex items-center gap-2 mb-2">
                          <Star className="w-4 h-4" />
                          Key Talking Points
                        </h4>
                        <ul className="space-y-1">
                          {metadata.keyTalkingPoints.map((point, i) => (
                            <li key={i} className="text-sm text-gray-300 leading-[1.6] flex items-start gap-2">
                              <span className="text-purple-400 mt-0.5">•</span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Delivery Tips */}
                    {metadata.deliveryTips.length > 0 && (
                      <div className="p-3 border border-gray-700 rounded-lg">
                        <h4 className="text-sm font-semibold text-cyan-400 flex items-center gap-2 mb-2">
                          <BookOpen className="w-4 h-4" />
                          Delivery Tips
                        </h4>
                        <ul className="space-y-1">
                          {metadata.deliveryTips.map((tip, i) => (
                            <li key={i} className="text-sm text-gray-300 leading-[1.6] flex items-start gap-2">
                              <span className="text-cyan-400 mt-0.5">{i + 1}.</span>
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Follow-up Questions with Full Answers */}
                    {metadata.followUpQA.length > 0 && (
                      <div className="p-3 border border-gray-700 rounded-lg">
                        <h4 className="text-sm font-semibold text-orange-400 flex items-center gap-2 mb-3">
                          <MessageSquare className="w-4 h-4" />
                          Likely Follow-up Questions
                        </h4>
                        <div className="space-y-3">
                          {metadata.followUpQA.map((followUp, i) => (
                            <div key={i} className="border-l-2 border-orange-800/50 pl-3">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm text-white font-medium italic">"{followUp.question}"</p>
                                <Badge
                                  variant={followUp.likelihood === 'high' ? 'danger' : followUp.likelihood === 'medium' ? 'warning' : 'default'}
                                  size="sm"
                                >
                                  {followUp.likelihood}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-400 mb-1">Suggested response:</p>
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
                      </div>
                    )}

                    {/* Sources */}
                    {(metadata.sources.profileSections.length > 0 || metadata.sources.storyIds.length > 0) && (
                      <div className="p-3 bg-gray-800/30 border border-gray-700 rounded-lg">
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">Sources Used</h4>
                        <div className="flex flex-wrap gap-2">
                          {metadata.sources.profileSections.map((section, i) => (
                            <Badge key={`profile-${i}`} variant="default" size="sm">
                              Profile: {section}
                            </Badge>
                          ))}
                          {metadata.sources.storyIds.length > 0 && (
                            <Badge variant="info" size="sm">
                              {metadata.sources.storyIds.length} stories referenced
                            </Badge>
                          )}
                          {metadata.sources.synthesized && (
                            <Badge variant="warning" size="sm">
                              AI-synthesized
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* Legacy STAR Format view */
              <>
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
                  <div className="p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
                    <span className="text-sm text-blue-400 uppercase font-semibold">AI Coaching</span>
                    <p className="text-[15px] text-gray-300 leading-[1.7] tracking-wide mt-2">{story.coachingNotes}</p>
                  </div>
                )}

                {/* Follow-up Questions (legacy - just questions without answers) */}
                {story.followUpQuestions.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm text-gray-500 uppercase font-semibold">
                      Prepare for Follow-ups
                    </span>
                    <ul className="text-[15px] text-gray-400 space-y-2 list-disc list-inside leading-[1.7]">
                      {story.followUpQuestions.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-800">
              <div className="text-xs text-gray-500">
                Used {story.timesUsed} times • Created{' '}
                {new Date(story.createdAt).toLocaleDateString()}
              </div>
              <div className="flex gap-2">
                {/* Enhance Button with dropdown */}
                <div className="relative" ref={enhanceDropdownRef}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEnhanceOptions(!showEnhanceOptions)}
                    disabled={isEnhancing}
                    leftIcon={isEnhancing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                    className={cn(
                      needsEnhancement() && !isEnhancing && 'text-purple-400 hover:text-purple-300'
                    )}
                  >
                    {isEnhancing ? 'Enhancing...' : 'Enhance'}
                  </Button>

                  {/* Enhancement options dropdown */}
                  {showEnhanceOptions && (
                    <div className="absolute right-0 bottom-full mb-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10">
                      <div className="p-2 border-b border-gray-700">
                        <span className="text-xs text-gray-400 uppercase font-semibold">Enhancement Focus</span>
                      </div>
                      <div className="p-1">
                        <button
                          onClick={() => handleEnhance('full')}
                          className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 rounded flex items-center gap-2"
                        >
                          <Sparkles className="w-4 h-4 text-purple-400" />
                          <div>
                            <div className="font-medium">Full Enhancement</div>
                            <div className="text-xs text-gray-400">Improve all aspects</div>
                          </div>
                        </button>
                        <button
                          onClick={() => handleEnhance('metrics')}
                          className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 rounded flex items-center gap-2"
                        >
                          <Target className="w-4 h-4 text-green-400" />
                          <div>
                            <div className="font-medium">Strengthen Metrics</div>
                            <div className="text-xs text-gray-400">Focus on quantifiable results</div>
                          </div>
                        </button>
                        <button
                          onClick={() => handleEnhance('narrative')}
                          className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 rounded flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4 text-blue-400" />
                          <div>
                            <div className="font-medium">Improve Narrative</div>
                            <div className="text-xs text-gray-400">Better flow and clarity</div>
                          </div>
                        </button>
                        <button
                          onClick={() => handleEnhance('impact')}
                          className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 rounded flex items-center gap-2"
                        >
                          <Star className="w-4 h-4 text-yellow-400" />
                          <div>
                            <div className="font-medium">Highlight Impact</div>
                            <div className="text-xs text-gray-400">Business and team effects</div>
                          </div>
                        </button>
                        <button
                          onClick={() => handleEnhance('interview-ready')}
                          className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 rounded flex items-center gap-2"
                        >
                          <MessageSquare className="w-4 h-4 text-cyan-400" />
                          <div>
                            <div className="font-medium">Interview Ready</div>
                            <div className="text-xs text-gray-400">Talking points & delivery tips</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

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
        'text-sm uppercase font-bold',
        label === 'Situation' && 'text-purple-400',
        label === 'Task' && 'text-blue-400',
        label === 'Action' && 'text-green-400',
        label === 'Result' && 'text-yellow-400'
      )}
    >
      {label}
    </span>
    <MarkdownRenderer
      content={content}
      className="mt-2 prose-p:my-2 prose-p:first:mt-0"
      variant="default"
    />
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
      setTags(result.tags);
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
                Describe your experience (the AI will format it into <Abbr variant="subtle">STAR</Abbr> format)
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
