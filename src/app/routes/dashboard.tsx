import React, { useState, useMemo, useCallback } from 'react';
import { useUIStore, toast } from '@/src/stores';
import { useUnifiedActiveProfileId } from '@/src/hooks/useAppData';
import { useApplications } from '@/src/hooks/useAppData';
import { cn } from '@/src/lib/utils';
import { APPLICATION_STATUSES } from '@/src/lib/constants';
import type { ApplicationStatus, JobApplication } from '@/src/types';
import {
  Plus,
  Archive,
  Briefcase,
  PieChart,
  CheckCircle,
  XCircle,
  MinusCircle,
  Trash2,
  MoreVertical,
  Globe,
  Calendar,
  DollarSign,
  Building,
  Clock,
} from 'lucide-react';
import { Button, Badge, ScoreBadge, ConfirmDialog } from '@/src/components/ui';
import { DashboardEmptyState } from '@/src/components/shared';
import {
  DashboardFiltersComponent,
  defaultFilters,
  type DashboardFilters,
} from '@/src/components/dashboard';
import { useNavigate } from 'react-router-dom';

const statusIcons: Record<ApplicationStatus, React.ReactNode> = {
  wishlist: <Archive className="w-4 h-4" />,
  applied: <Briefcase className="w-4 h-4" />,
  interviewing: <PieChart className="w-4 h-4" />,
  offer: <CheckCircle className="w-4 h-4" />,
  passed: <MinusCircle className="w-4 h-4" />,
  rejected: <XCircle className="w-4 h-4" />,
};

// Helper function to check if an application is stale (>14 days in applied status)
const isStale = (app: JobApplication, staleDays: number = 14): boolean => {
  if (app.status !== 'applied' || !app.dateApplied) return false;
  const daysSince = Math.floor(
    (Date.now() - new Date(app.dateApplied).getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysSince >= staleDays;
};

// Helper function to get days since applied
const getDaysSinceApplied = (app: JobApplication): number | null => {
  if (!app.dateApplied) return null;
  return Math.floor(
    (Date.now() - new Date(app.dateApplied).getTime()) / (1000 * 60 * 60 * 24)
  );
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const activeProfileId = useUnifiedActiveProfileId();
  // Use unified hook that switches between Supabase and localStorage
  const { applications: allApplications, moveApplication, deleteApplication } = useApplications();
  // Filter applications by active profile
  const profileApplications = useMemo(() => {
    if (!activeProfileId) return allApplications;
    return allApplications.filter((app) => !app.profileId || app.profileId === activeProfileId);
  }, [allApplications, activeProfileId]);
  const openModal = useUIStore((s) => s.openModal);

  const [deleteTarget, setDeleteTarget] = useState<JobApplication | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters);

  // Search function
  const searchApplication = useCallback(
    (app: JobApplication, query: string): boolean => {
      if (!query.trim()) return true;
      const lowerQuery = query.toLowerCase();

      if (app.company.toLowerCase().includes(lowerQuery)) return true;
      if (app.role.toLowerCase().includes(lowerQuery)) return true;
      if (app.notes?.toLowerCase().includes(lowerQuery)) return true;

      return false;
    },
    []
  );

  // Fit score filter function
  const matchesFitScore = useCallback(
    (app: JobApplication, range: DashboardFilters['fitScoreRange']): boolean => {
      if (range === 'all') return true;

      const score = app.analysis?.fitScore;

      switch (range) {
        case 'high':
          return score !== undefined && score >= 8;
        case 'medium':
          return score !== undefined && score >= 5 && score < 8;
        case 'low':
          return score !== undefined && score < 5;
        case 'unanalyzed':
          return score === undefined;
        default:
          return true;
      }
    },
    []
  );

  // Apply all filters
  const applications = useMemo(() => {
    return profileApplications.filter((app) => {
      // Search filter
      if (!searchApplication(app, filters.searchQuery)) return false;

      // Type filter
      if (filters.types.length > 0 && !filters.types.includes(app.type as 'fulltime' | 'freelance')) {
        return false;
      }

      // Source filter
      if (filters.sources.length > 0 && !filters.sources.includes(app.source)) {
        return false;
      }

      // Fit score filter
      if (!matchesFitScore(app, filters.fitScoreRange)) return false;

      // Stale filter
      if (filters.staleOnly && !isStale(app)) return false;

      return true;
    });
  }, [profileApplications, filters, searchApplication, matchesFitScore]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('applicationId', id);
    setDraggedId(id);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: ApplicationStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('applicationId');
    if (id) {
      moveApplication(id, status);
      toast.success('Application moved', `Moved to ${status}`);
    }
    setDraggedId(null);
  };

  const handleAddApplication = () => {
    openModal('application');
  };

  const handleEditApplication = (app: JobApplication) => {
    openModal('application', app);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteApplication(deleteTarget.id);
      toast.success('Application deleted', `${deleteTarget.company} removed`);
      setDeleteTarget(null);
    }
  };

  const handleResearch = (app: JobApplication) => {
    navigate(`/research?company=${encodeURIComponent(app.company)}`);
  };

  // Show empty state only when there are no applications at all (not just filtered out)
  if (profileApplications.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <DashboardEmptyState onAddApplication={handleAddApplication} />
      </div>
    );
  }

  return (
    <div className="h-full p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Applications</h2>
        <Button
          variant="primary"
          onClick={handleAddApplication}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Application
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4">
        <DashboardFiltersComponent
          filters={filters}
          onFiltersChange={setFilters}
          totalCount={profileApplications.length}
          filteredCount={applications.length}
        />
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 flex-1 min-h-0 overflow-x-auto pb-4 snap-x">
        {APPLICATION_STATUSES.map((col) => {
          const columnApps = applications.filter((a) => a.status === col.id);

          return (
            <div
              key={col.id}
              className={cn(
                'flex-shrink-0 w-80 flex flex-col bg-gray-900/50 rounded-xl border border-gray-800/50',
                draggedId && 'border-dashed'
              )}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {/* Column Header */}
              <div className="p-3 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-900/90 backdrop-blur-sm rounded-t-xl z-10">
                <div className={cn('flex items-center gap-2 font-semibold text-sm', col.color)}>
                  {statusIcons[col.id]}
                  {col.label}
                </div>
                <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-xs font-mono">
                  {columnApps.length}
                </span>
              </div>

              {/* Column Content */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
                {columnApps.map((app) => (
                  <JobCard
                    key={app.id}
                    application={app}
                    isDragging={draggedId === app.id}
                    daysSinceApplied={getDaysSinceApplied(app)}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleEditApplication(app)}
                    onDelete={() => setDeleteTarget(app)}
                    onResearch={() => handleResearch(app)}
                  />
                ))}

                {columnApps.length === 0 && (
                  <div className="text-center py-10 text-gray-600 text-sm border-2 border-dashed border-gray-800 rounded-lg">
                    Drop here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Application"
        description={`Are you sure you want to delete the application for ${deleteTarget?.role} at ${deleteTarget?.company}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};

// Job Card Component
interface JobCardProps {
  application: JobApplication;
  isDragging: boolean;
  daysSinceApplied: number | null;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onClick: () => void;
  onDelete: () => void;
  onResearch: () => void;
}

const JobCard: React.FC<JobCardProps> = ({
  application,
  isDragging,
  daysSinceApplied,
  onDragStart,
  onDragEnd,
  onClick,
  onDelete,
  onResearch,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const isStaleApp = application.status === 'applied' && daysSinceApplied !== null && daysSinceApplied >= 14;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, application.id)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        'bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-blue-500/50',
        'rounded-lg p-4 cursor-pointer transition-all shadow-sm hover:shadow-md',
        'group relative flex flex-col gap-3',
        isDragging && 'opacity-50 scale-95',
        isStaleApp && 'border-l-2 border-l-amber-500'
      )}
    >
      {/* Stale Indicator */}
      {isStaleApp && (
        <div className="absolute -top-2 -right-2 z-10">
          <span className="flex items-center gap-1 bg-amber-900/80 text-amber-300 text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-amber-700">
            <Clock className="w-3 h-3" />
            {daysSinceApplied}d
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start">
        <h3 className="font-semibold text-gray-100 truncate pr-2 flex-1">
          {application.role}
        </h3>
        {application.analysis && (
          <ScoreBadge score={application.analysis.fitScore} size="sm" showLabel={false} />
        )}
      </div>

      {/* Company */}
      <div className="flex items-center text-sm text-gray-400">
        <Building className="w-3 h-3 mr-1.5" />
        <span className="truncate">{application.company}</span>
      </div>

      {/* Details */}
      <div className="space-y-1.5">
        {application.salaryRange && (
          <div className="flex items-center text-xs text-gray-500">
            <DollarSign className="w-3 h-3 mr-1.5 text-gray-600" />
            {application.salaryRange}
          </div>
        )}
        <div className="flex items-center text-xs text-gray-500">
          <Calendar className="w-3 h-3 mr-1.5 text-gray-600" />
          {application.dateApplied
            ? new Date(application.dateApplied).toLocaleDateString()
            : 'Not applied'}
        </div>
      </div>

      {/* Type Badge */}
      {application.type === 'freelance' && (
        <Badge variant="info" size="sm">
          Freelance
        </Badge>
      )}

      {/* Actions */}
      <div className="pt-2 mt-auto border-t border-gray-700/50 flex justify-between items-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onResearch();
          }}
          className={cn(
            'text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors',
            application.companyResearch
              ? 'bg-blue-900/20 text-blue-300 hover:bg-blue-900/40'
              : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
          )}
        >
          <Globe className="w-3 h-3" />
          {application.companyResearch ? 'View Research' : 'Research'}
        </button>

        {/* More Menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-gray-300"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                }}
              />
              <div className="absolute right-0 bottom-full mb-1 z-20 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 min-w-[120px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onDelete();
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Drag Handle Indicator */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="p-1 rounded bg-gray-700 text-gray-400">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
