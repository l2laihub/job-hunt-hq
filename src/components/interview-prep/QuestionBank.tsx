import React, { useState, useMemo } from 'react';
import { Button, Card, Select } from '@/src/components/ui';
import { cn } from '@/src/lib/utils';
import type { InterviewPrepSession, Experience, QuestionCategory, LikelihoodLevel, UserProfile, JDAnalysis, CompanyResearch } from '@/src/types';
import { QUESTION_CATEGORIES } from '@/src/types';
import { QuestionCard } from './QuestionCard';
import {
  MessageSquare,
  RefreshCw,
  Filter,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Search,
  SortAsc,
  SortDesc,
} from 'lucide-react';

interface QuestionBankProps {
  session: InterviewPrepSession;
  stories: Experience[];
  onGenerateQuestions: () => Promise<void>;
  isGenerating: boolean;
  // For answer generation
  profile?: UserProfile;
  analysis?: JDAnalysis;
  research?: CompanyResearch;
  company?: string;
  role?: string;
}

type FilterType = 'all' | 'unprepared' | 'high-priority' | 'prepared';
type SortType = 'likelihood' | 'category' | 'difficulty';

export const QuestionBank: React.FC<QuestionBankProps> = ({
  session,
  stories,
  onGenerateQuestions,
  isGenerating,
  profile,
  analysis,
  research,
  company,
  role,
}) => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState<QuestionCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortType>('likelihood');
  const [sortDesc, setSortDesc] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter and sort questions
  const filteredQuestions = useMemo(() => {
    let questions = [...session.predictedQuestions];

    // Apply text search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      questions = questions.filter(
        (q) =>
          q.question.toLowerCase().includes(query) ||
          q.source.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filter === 'unprepared') {
      questions = questions.filter((q) => !q.isPrepared);
    } else if (filter === 'high-priority') {
      questions = questions.filter((q) => q.likelihood === 'high');
    } else if (filter === 'prepared') {
      questions = questions.filter((q) => q.isPrepared);
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      questions = questions.filter((q) => q.category === categoryFilter);
    }

    // Sort
    const likelihoodOrder: Record<LikelihoodLevel, number> = { high: 3, medium: 2, low: 1 };
    const difficultyOrder: Record<string, number> = { hard: 3, medium: 2, easy: 1 };

    questions.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'likelihood') {
        comparison = likelihoodOrder[a.likelihood] - likelihoodOrder[b.likelihood];
      } else if (sortBy === 'category') {
        comparison = a.category.localeCompare(b.category);
      } else if (sortBy === 'difficulty') {
        comparison = difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
      }
      return sortDesc ? -comparison : comparison;
    });

    return questions;
  }, [session.predictedQuestions, filter, categoryFilter, sortBy, sortDesc, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = session.predictedQuestions.length;
    const prepared = session.predictedQuestions.filter((q) => q.isPrepared).length;
    const highPriority = session.predictedQuestions.filter((q) => q.likelihood === 'high').length;
    const highPrepared = session.predictedQuestions.filter(
      (q) => q.likelihood === 'high' && q.isPrepared
    ).length;
    const gaps = highPriority - highPrepared;

    return { total, prepared, highPriority, highPrepared, gaps };
  }, [session.predictedQuestions]);

  // Empty state
  if (session.predictedQuestions.length === 0) {
    return (
      <Card className="p-8 text-center">
        <MessageSquare className="w-12 h-12 mx-auto text-gray-600 mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No Questions Yet</h3>
        <p className="text-gray-400 mb-4">
          Generate AI-predicted interview questions based on the job description and your profile.
        </p>
        <Button onClick={onGenerateQuestions} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Questions
            </>
          )}
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-xs text-gray-400">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{stats.prepared}</div>
              <div className="text-xs text-gray-400">Prepared</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{stats.highPriority}</div>
              <div className="text-xs text-gray-400">High Priority</div>
            </div>
            {stats.gaps > 0 && (
              <div className="flex items-center gap-2 bg-yellow-900/30 px-3 py-2 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-yellow-400">
                  {stats.gaps} high-priority questions need preparation
                </span>
              </div>
            )}
            {stats.gaps === 0 && stats.highPriority > 0 && (
              <div className="flex items-center gap-2 bg-green-900/30 px-3 py-2 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400">
                  All high-priority questions prepared!
                </span>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onGenerateQuestions}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions..."
            className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex rounded-lg border border-gray-700 overflow-hidden">
          {[
            { id: 'all', label: 'All' },
            { id: 'unprepared', label: 'Unprepared' },
            { id: 'high-priority', label: 'High Priority' },
            { id: 'prepared', label: 'Prepared' },
          ].map((option) => (
            <button
              key={option.id}
              onClick={() => setFilter(option.id as FilterType)}
              className={cn(
                'px-3 py-2 text-sm transition-colors',
                filter === option.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <Select
          value={categoryFilter}
          onChange={(v) => setCategoryFilter(v as QuestionCategory | 'all')}
          options={[
            { value: 'all', label: 'All Categories' },
            ...QUESTION_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
          ]}
        />

        {/* Sort */}
        <div className="flex items-center gap-2">
          <Select
            value={sortBy}
            onChange={(v) => setSortBy(v as SortType)}
            options={[
              { value: 'likelihood', label: 'Likelihood' },
              { value: 'category', label: 'Category' },
              { value: 'difficulty', label: 'Difficulty' },
            ]}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortDesc(!sortDesc)}
          >
            {sortDesc ? (
              <SortDesc className="w-4 h-4" />
            ) : (
              <SortAsc className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Results Count */}
      <p className="text-sm text-gray-400">
        Showing {filteredQuestions.length} of {session.predictedQuestions.length} questions
      </p>

      {/* Question Cards */}
      <div className="space-y-3">
        {filteredQuestions.map((question) => (
          <QuestionCard
            key={question.id}
            question={question}
            sessionId={session.id}
            stories={stories}
            profile={profile}
            analysis={analysis}
            research={research}
            company={company}
            role={role}
          />
        ))}
      </div>

      {/* No Results */}
      {filteredQuestions.length === 0 && (
        <Card className="p-8 text-center">
          <Filter className="w-12 h-12 mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Matching Questions</h3>
          <p className="text-gray-400">
            Try adjusting your filters to see more questions.
          </p>
        </Card>
      )}
    </div>
  );
};
