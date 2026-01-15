/**
 * Research Card
 *
 * Displays a single research item with summary, type, sources, and actions.
 */
import React from 'react';
import {
  DollarSign,
  TrendingUp,
  Code,
  MessageSquareText,
  Star,
  Trash2,
  ExternalLink,
  Calendar,
  Building2,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { TopicResearch, TopicResearchType } from '@/src/types/topic-research';
import { generateResearchSummary } from '@/src/services/gemini';

interface ResearchCardProps {
  research: TopicResearch;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onSelect?: (research: TopicResearch) => void;
}

const typeConfig: Record<TopicResearchType, { icon: React.ElementType; color: string; label: string }> = {
  salary: { icon: DollarSign, color: 'text-green-400', label: 'Salary' },
  industry: { icon: TrendingUp, color: 'text-blue-400', label: 'Industry' },
  technical: { icon: Code, color: 'text-purple-400', label: 'Technical' },
  interview: { icon: MessageSquareText, color: 'text-orange-400', label: 'Interview' },
};

export const ResearchCard: React.FC<ResearchCardProps> = ({
  research,
  onToggleFavorite,
  onDelete,
  onSelect,
}) => {
  const [showActions, setShowActions] = React.useState(false);
  const config = typeConfig[research.type];
  const Icon = config.icon;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const summary = generateResearchSummary(research);

  return (
    <div
      className={cn(
        'group relative rounded-lg p-3 cursor-pointer',
        'bg-gray-800/50 hover:bg-gray-800',
        'border border-gray-700/50 hover:border-gray-600',
        'transition-all'
      )}
      onClick={() => onSelect?.(research)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn(
            'w-7 h-7 rounded-md flex items-center justify-center shrink-0',
            'bg-gray-700/50'
          )}>
            <Icon className={cn('w-4 h-4', config.color)} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={cn('text-xs font-medium', config.color)}>
                {config.label}
              </span>
              {research.isFavorite && (
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              )}
            </div>
            <p className="text-sm font-medium text-gray-200 truncate">
              {research.query}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        {showActions && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(research.id);
              }}
              className={cn(
                'p-1 rounded hover:bg-gray-700 transition-colors',
                research.isFavorite ? 'text-yellow-400' : 'text-gray-400'
              )}
              title={research.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className={cn('w-4 h-4', research.isFavorite && 'fill-current')} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(research.id);
              }}
              className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Summary */}
      <p className="text-xs text-gray-400 line-clamp-2 mb-2">
        {summary}
      </p>

      {/* Context and metadata */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        {research.companyContext && (
          <span className="flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            {research.companyContext}
          </span>
        )}
        {research.roleContext && (
          <span className="flex items-center gap-1">
            <Briefcase className="w-3 h-3" />
            {research.roleContext}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDate(research.searchedAt)}
        </span>
      </div>

      {/* Sources */}
      {research.sources.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-700/50">
          <div className="flex flex-wrap gap-1">
            {research.sources.slice(0, 3).map((source, idx) => (
              <a
                key={idx}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded',
                  'text-xs text-gray-400 hover:text-gray-200',
                  'bg-gray-700/30 hover:bg-gray-700',
                  'transition-colors'
                )}
              >
                <ExternalLink className="w-3 h-3" />
                <span className="truncate max-w-[120px]">
                  {source.title || new URL(source.url).hostname}
                </span>
              </a>
            ))}
            {research.sources.length > 3 && (
              <span className="text-xs text-gray-500 px-1">
                +{research.sources.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
