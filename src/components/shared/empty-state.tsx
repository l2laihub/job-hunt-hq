import React from 'react';
import { cn } from '@/src/lib/utils';
import { Button } from '@/src/components/ui';
import {
  Briefcase,
  FileText,
  Book,
  Mic,
  Globe,
  Plus,
  Upload,
  Search
} from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-6',
        className
      )}
    >
      {icon && (
        <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
          <div className="text-gray-500">{icon}</div>
        </div>
      )}
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 max-w-sm mb-6">{description}</p>
      {action && (
        <Button
          variant="primary"
          onClick={action.onClick}
          leftIcon={action.icon || <Plus className="w-4 h-4" />}
        >
          {action.label}
        </Button>
      )}
      {secondaryAction && (
        <button
          onClick={secondaryAction.onClick}
          className="mt-3 text-sm text-gray-400 hover:text-white transition-colors"
        >
          {secondaryAction.label}
        </button>
      )}
    </div>
  );
};

// Pre-built empty states for different sections
export const DashboardEmptyState: React.FC<{ onAddApplication: () => void }> = ({
  onAddApplication,
}) => (
  <EmptyState
    icon={<Briefcase className="w-8 h-8" />}
    title="No applications yet"
    description="Start tracking your job search by adding your first application. You can analyze job descriptions and research companies."
    action={{
      label: 'Add Application',
      onClick: onAddApplication,
      icon: <Plus className="w-4 h-4" />,
    }}
  />
);

export const StoriesEmptyState: React.FC<{ onAddStory: () => void }> = ({
  onAddStory,
}) => (
  <EmptyState
    icon={<Book className="w-8 h-8" />}
    title="No stories yet"
    description="Build your interview story bank by adding experiences formatted in STAR structure. You can type, paste, or use voice input."
    action={{
      label: 'Add Your First Story',
      onClick: onAddStory,
      icon: <Plus className="w-4 h-4" />,
    }}
  />
);

export const ProfileEmptyState: React.FC<{ onUpload: () => void }> = ({
  onUpload,
}) => (
  <EmptyState
    icon={<FileText className="w-8 h-8" />}
    title="Build your profile"
    description="Upload your resume or portfolio documents to automatically extract your skills, experience, and achievements."
    action={{
      label: 'Upload Documents',
      onClick: onUpload,
      icon: <Upload className="w-4 h-4" />,
    }}
  />
);

export const ResearchEmptyState: React.FC = () => (
  <EmptyState
    icon={<Globe className="w-8 h-8" />}
    title="Research a company"
    description="Enter a company name to gather intelligence about their culture, news, engineering practices, and interview process."
  />
);

export const AnalysisEmptyState: React.FC = () => (
  <EmptyState
    icon={<Search className="w-8 h-8" />}
    title="Analyze a job description"
    description="Paste a job description to get AI-powered analysis of your fit, talking points, and questions to ask."
  />
);

export const InterviewEmptyState: React.FC<{ onStart: () => void }> = ({
  onStart,
}) => (
  <EmptyState
    icon={<Mic className="w-8 h-8" />}
    title="Practice interviewing"
    description="Start a mock interview session with AI to practice your responses and get real-time feedback."
    action={{
      label: 'Start Practice Session',
      onClick: onStart,
      icon: <Mic className="w-4 h-4" />,
    }}
  />
);

export const SearchEmptyState: React.FC<{ query: string }> = ({ query }) => (
  <EmptyState
    icon={<Search className="w-8 h-8" />}
    title="No results found"
    description={`We couldn't find anything matching "${query}". Try adjusting your search terms.`}
  />
);
