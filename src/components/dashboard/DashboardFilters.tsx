import React, { useState, useCallback } from 'react';
import { cn } from '@/src/lib/utils';
import { Input, Button, ButtonGroup, Select, Badge } from '@/src/components/ui';
import { APPLICATION_SOURCES } from '@/src/lib/constants';
import {
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';

export interface DashboardFilters {
  searchQuery: string;
  types: ('fulltime' | 'freelance')[];
  sources: string[];
  fitScoreRange: 'all' | 'high' | 'medium' | 'low' | 'unanalyzed';
  staleOnly: boolean;
}

export const defaultFilters: DashboardFilters = {
  searchQuery: '',
  types: [],
  sources: [],
  fitScoreRange: 'all',
  staleOnly: false,
};

interface DashboardFiltersProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  totalCount: number;
  filteredCount: number;
}

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'fulltime', label: 'Full-time' },
  { value: 'freelance', label: 'Freelance' },
];

const FIT_SCORE_OPTIONS = [
  { value: 'all', label: 'Any Fit' },
  { value: 'high', label: 'High (8+)' },
  { value: 'medium', label: 'Med (5-7)' },
  { value: 'low', label: 'Low (<5)' },
  { value: 'unanalyzed', label: 'No Score' },
];

const SOURCE_OPTIONS = [
  { value: '', label: 'All Sources' },
  ...APPLICATION_SOURCES.map((s) => ({ value: s.value, label: s.label })),
];

export const DashboardFiltersComponent: React.FC<DashboardFiltersProps> = ({
  filters,
  onFiltersChange,
  totalCount,
  filteredCount,
}) => {
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const hasActiveFilters =
    filters.searchQuery.trim() !== '' ||
    filters.types.length > 0 ||
    filters.sources.length > 0 ||
    filters.fitScoreRange !== 'all' ||
    filters.staleOnly;

  const activeFilterCount = [
    filters.types.length > 0,
    filters.sources.length > 0,
    filters.fitScoreRange !== 'all',
    filters.staleOnly,
  ].filter(Boolean).length;

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFiltersChange({ ...filters, searchQuery: e.target.value });
    },
    [filters, onFiltersChange]
  );

  const handleClearSearch = useCallback(() => {
    onFiltersChange({ ...filters, searchQuery: '' });
  }, [filters, onFiltersChange]);

  const handleTypeChange = useCallback(
    (value: string) => {
      if (value === 'all') {
        onFiltersChange({ ...filters, types: [] });
      } else {
        onFiltersChange({ ...filters, types: [value as 'fulltime' | 'freelance'] });
      }
    },
    [filters, onFiltersChange]
  );

  const handleFitScoreChange = useCallback(
    (value: string) => {
      onFiltersChange({
        ...filters,
        fitScoreRange: value as DashboardFilters['fitScoreRange'],
      });
    },
    [filters, onFiltersChange]
  );

  const handleSourceChange = useCallback(
    (value: string) => {
      if (value === '') {
        onFiltersChange({ ...filters, sources: [] });
      } else {
        onFiltersChange({ ...filters, sources: [value] });
      }
    },
    [filters, onFiltersChange]
  );

  const handleStaleToggle = useCallback(() => {
    onFiltersChange({ ...filters, staleOnly: !filters.staleOnly });
  }, [filters, onFiltersChange]);

  const handleClearAll = useCallback(() => {
    onFiltersChange(defaultFilters);
  }, [onFiltersChange]);

  const handleRemoveFilter = useCallback(
    (filterKey: keyof DashboardFilters) => {
      switch (filterKey) {
        case 'types':
          onFiltersChange({ ...filters, types: [] });
          break;
        case 'sources':
          onFiltersChange({ ...filters, sources: [] });
          break;
        case 'fitScoreRange':
          onFiltersChange({ ...filters, fitScoreRange: 'all' });
          break;
        case 'staleOnly':
          onFiltersChange({ ...filters, staleOnly: false });
          break;
        case 'searchQuery':
          onFiltersChange({ ...filters, searchQuery: '' });
          break;
      }
    },
    [filters, onFiltersChange]
  );

  const getTypeValue = () => {
    if (filters.types.length === 0) return 'all';
    return filters.types[0];
  };

  return (
    <div className="space-y-3">
      {/* Search and Filter Toggle Row */}
      <div className="flex gap-3 items-center">
        <div className="flex-1 relative">
          <Input
            value={filters.searchQuery}
            onChange={handleSearchChange}
            placeholder="Search company, role..."
            leftIcon={<Search className="w-4 h-4" />}
            rightIcon={
              filters.searchQuery ? (
                <button
                  onClick={handleClearSearch}
                  className="hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : undefined
            }
          />
        </div>

        <Button
          variant={showFilterPanel || activeFilterCount > 0 ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setShowFilterPanel(!showFilterPanel)}
          leftIcon={<Filter className="w-4 h-4" />}
          rightIcon={
            showFilterPanel ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )
          }
        >
          Filter
          {activeFilterCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-600 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Collapsible Filter Panel */}
      {showFilterPanel && (
        <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg space-y-4">
          {/* Row 1: Type and Fit Score */}
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">
                Job Type
              </label>
              <ButtonGroup
                options={TYPE_OPTIONS}
                value={getTypeValue()}
                onChange={handleTypeChange}
                size="sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">
                Fit Score
              </label>
              <ButtonGroup
                options={FIT_SCORE_OPTIONS}
                value={filters.fitScoreRange}
                onChange={handleFitScoreChange}
                size="sm"
              />
            </div>
          </div>

          {/* Row 2: Source and Stale Toggle */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-48">
              <Select
                label="Source"
                options={SOURCE_OPTIONS}
                value={filters.sources[0] || ''}
                onChange={handleSourceChange}
              />
            </div>

            <button
              onClick={handleStaleToggle}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors',
                filters.staleOnly
                  ? 'bg-amber-900/30 border-amber-700 text-amber-300'
                  : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-gray-200'
              )}
            >
              <Clock className="w-4 h-4" />
              <span className="text-sm">Stale only (14+ days)</span>
              {filters.staleOnly && (
                <span className="w-2 h-2 rounded-full bg-amber-400" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Active Filters Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500">Active:</span>

          {filters.searchQuery && (
            <Badge
              variant="primary"
              size="sm"
              removable
              onRemove={() => handleRemoveFilter('searchQuery')}
            >
              Search: "{filters.searchQuery}"
            </Badge>
          )}

          {filters.types.length > 0 && (
            <Badge
              variant="primary"
              size="sm"
              removable
              onRemove={() => handleRemoveFilter('types')}
            >
              {filters.types[0] === 'fulltime' ? 'Full-time' : 'Freelance'}
            </Badge>
          )}

          {filters.fitScoreRange !== 'all' && (
            <Badge
              variant="primary"
              size="sm"
              removable
              onRemove={() => handleRemoveFilter('fitScoreRange')}
            >
              Fit:{' '}
              {FIT_SCORE_OPTIONS.find((o) => o.value === filters.fitScoreRange)?.label}
            </Badge>
          )}

          {filters.sources.length > 0 && (
            <Badge
              variant="primary"
              size="sm"
              removable
              onRemove={() => handleRemoveFilter('sources')}
            >
              {APPLICATION_SOURCES.find((s) => s.value === filters.sources[0])?.label}
            </Badge>
          )}

          {filters.staleOnly && (
            <Badge
              variant="warning"
              size="sm"
              removable
              onRemove={() => handleRemoveFilter('staleOnly')}
            >
              Stale (14+ days)
            </Badge>
          )}

          <button
            onClick={handleClearAll}
            className="text-xs text-gray-500 hover:text-gray-300 underline ml-2"
          >
            Clear all
          </button>

          <span className="ml-auto text-xs text-gray-500">
            Showing {filteredCount} of {totalCount}
          </span>
        </div>
      )}
    </div>
  );
};
