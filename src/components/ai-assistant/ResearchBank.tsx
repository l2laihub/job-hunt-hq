/**
 * Research Bank
 *
 * Panel displaying saved research with filtering and organization.
 */
import React from 'react';
import {
  X,
  Search,
  DollarSign,
  TrendingUp,
  Code,
  MessageSquareText,
  Library,
  Star,
  Layers,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useTopicResearchStore } from '@/src/stores/topic-research';
import type { TopicResearchType, TopicResearch } from '@/src/types/topic-research';
import { ResearchCard } from './ResearchCard';

interface ResearchBankProps {
  onClose: () => void;
  onSelectResearch?: (research: TopicResearch) => void;
}

type TabType = 'all' | TopicResearchType | 'favorites';

const tabs: Array<{ id: TabType; label: string; icon: React.ElementType }> = [
  { id: 'all', label: 'All', icon: Layers },
  { id: 'salary', label: 'Salary', icon: DollarSign },
  { id: 'industry', label: 'Industry', icon: TrendingUp },
  { id: 'technical', label: 'Technical', icon: Code },
  { id: 'interview', label: 'Interview', icon: MessageSquareText },
  { id: 'favorites', label: 'Favorites', icon: Star },
];

export const ResearchBank: React.FC<ResearchBankProps> = ({
  onClose,
  onSelectResearch,
}) => {
  const [activeTab, setActiveTab] = React.useState<TabType>('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  const {
    researches,
    toggleFavorite,
    deleteResearch,
    getByType,
    getFavorites,
    getStats,
  } = useTopicResearchStore();

  const stats = getStats();

  // Filter researches based on tab and search
  const filteredResearches = React.useMemo(() => {
    let result: TopicResearch[];

    if (activeTab === 'all') {
      result = researches;
    } else if (activeTab === 'favorites') {
      result = getFavorites();
    } else {
      result = getByType(activeTab);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.query.toLowerCase().includes(query) ||
          r.tags.some((t) => t.toLowerCase().includes(query)) ||
          r.companyContext?.toLowerCase().includes(query) ||
          r.roleContext?.toLowerCase().includes(query)
      );
    }

    // Sort by most recent
    return result.sort(
      (a, b) => new Date(b.searchedAt).getTime() - new Date(a.searchedAt).getTime()
    );
  }, [researches, activeTab, searchQuery, getByType, getFavorites]);

  const getTabCount = (tab: TabType): number => {
    if (tab === 'all') return stats.total;
    if (tab === 'favorites') return stats.favorites;
    return stats.byType[tab as TopicResearchType] || 0;
  };

  return (
    <div className="absolute inset-0 bg-gray-900 z-10 flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-gray-700">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Library className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-gray-100">Research Bank</h3>
              <p className="text-xs text-gray-500">{stats.total} saved researches</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search research..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'w-full pl-9 pr-3 py-2 rounded-lg',
                'bg-gray-800 border border-gray-700',
                'text-sm text-gray-200 placeholder-gray-500',
                'focus:outline-none focus:border-gray-600'
              )}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="px-2 pb-1 flex gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const count = getTabCount(tab.id);
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                  'text-xs font-medium whitespace-nowrap',
                  'transition-colors',
                  isActive
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className={cn(
                    'px-1.5 py-0.5 rounded-full text-xs',
                    isActive ? 'bg-gray-600' : 'bg-gray-800'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Research list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredResearches.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Library className="w-12 h-12 mx-auto mb-3 opacity-50" />
            {searchQuery ? (
              <>
                <p>No results found</p>
                <p className="text-sm mt-1">Try a different search term</p>
              </>
            ) : activeTab === 'favorites' ? (
              <>
                <p>No favorites yet</p>
                <p className="text-sm mt-1">Star a research to add it here</p>
              </>
            ) : (
              <>
                <p>No research saved</p>
                <p className="text-sm mt-1">
                  Ask me about salaries, industry trends, technical topics, or interviews
                </p>
              </>
            )}
          </div>
        ) : (
          filteredResearches.map((research) => (
            <ResearchCard
              key={research.id}
              research={research}
              onToggleFavorite={toggleFavorite}
              onDelete={deleteResearch}
              onSelect={onSelectResearch}
            />
          ))
        )}
      </div>
    </div>
  );
};
