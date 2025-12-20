import React, { useState, useMemo } from 'react';
import { useUIStore, useActiveProfileId, toast } from '@/src/stores';
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
  Trash2,
  MoreVertical,
  Globe,
  Calendar,
  DollarSign,
  Building,
} from 'lucide-react';
import { Button, Badge, ScoreBadge, ConfirmDialog, Card } from '@/src/components/ui';
import { DashboardEmptyState } from '@/src/components/shared';
import { useNavigate } from 'react-router-dom';

const statusIcons: Record<ApplicationStatus, React.ReactNode> = {
  wishlist: <Archive className="w-4 h-4" />,
  applied: <Briefcase className="w-4 h-4" />,
  interviewing: <PieChart className="w-4 h-4" />,
  offer: <CheckCircle className="w-4 h-4" />,
  rejected: <XCircle className="w-4 h-4" />,
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const activeProfileId = useActiveProfileId();
  // Use unified hook that switches between Supabase and localStorage
  const { applications: allApplications, moveApplication, deleteApplication } = useApplications();
  // Filter applications by active profile
  const applications = useMemo(() => {
    if (!activeProfileId) return allApplications;
    return allApplications.filter((app) => !app.profileId || app.profileId === activeProfileId);
  }, [allApplications, activeProfileId]);
  const openModal = useUIStore((s) => s.openModal);

  const [deleteTarget, setDeleteTarget] = useState<JobApplication | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

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

  if (applications.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <DashboardEmptyState onAddApplication={handleAddApplication} />
      </div>
    );
  }

  return (
    <div className="h-full p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Applications</h2>
        <Button
          variant="primary"
          onClick={handleAddApplication}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Application
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 h-[calc(100%-4rem)] overflow-x-auto pb-4 snap-x">
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
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onClick: () => void;
  onDelete: () => void;
  onResearch: () => void;
}

const JobCard: React.FC<JobCardProps> = ({
  application,
  isDragging,
  onDragStart,
  onDragEnd,
  onClick,
  onDelete,
  onResearch,
}) => {
  const [showMenu, setShowMenu] = useState(false);

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
        isDragging && 'opacity-50 scale-95'
      )}
    >
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
