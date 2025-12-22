import React, { useRef } from 'react';
import { Button, Card, Badge } from '@/src/components/ui';
import { cn, formatDate } from '@/src/lib/utils';
import type { InterviewPrepSession, JobApplication, Experience } from '@/src/types';
import {
  FileText,
  Printer,
  RefreshCw,
  Sparkles,
  MessageSquare,
  Book,
  Target,
  Building2,
  HelpCircle,
  Clock,
  MapPin,
  User,
  Briefcase,
} from 'lucide-react';

interface InterviewDayCardProps {
  session: InterviewPrepSession;
  application?: JobApplication;
  stories: Experience[];
  onGenerateQuickRef: () => Promise<void>;
  isGenerating: boolean;
}

// Print styles component
const PrintStyles: React.FC = () => (
  <style>
    {`
      @media print {
        body * {
          visibility: hidden;
        }
        .print-area, .print-area * {
          visibility: visible;
        }
        .print-area {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          padding: 20px;
        }
        .no-print {
          display: none !important;
        }
        .print-area .card {
          break-inside: avoid;
          border: 1px solid #333;
          margin-bottom: 10px;
        }
      }
    `}
  </style>
);

// Section card component
const SectionCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  color: string;
  children: React.ReactNode;
}> = ({ title, icon, color, children }) => (
  <Card className="p-4 card">
    <h3 className={cn('text-sm font-bold uppercase mb-3 flex items-center gap-2', color)}>
      {icon}
      {title}
    </h3>
    {children}
  </Card>
);

// Empty quick reference state
const EmptyQuickRef: React.FC<{
  onGenerate: () => void;
  isGenerating: boolean;
  session: InterviewPrepSession;
}> = ({ onGenerate, isGenerating, session }) => {
  const hasEnoughPrep =
    session.checklist.filter((i) => i.status === 'completed').length >= 3 ||
    session.predictedQuestions.filter((q) => q.isPrepared).length >= 3;

  return (
    <Card className="p-8 text-center">
      <FileText className="w-12 h-12 mx-auto text-gray-600 mb-4" />
      <h3 className="text-lg font-medium text-white mb-2">Quick Reference Not Ready</h3>
      <p className="text-gray-400 mb-4">
        {hasEnoughPrep
          ? 'Generate your interview day quick reference card.'
          : 'Complete more preparation items to generate a meaningful quick reference.'}
      </p>
      <Button onClick={onGenerate} disabled={isGenerating || !hasEnoughPrep}>
        {isGenerating ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Quick Reference
          </>
        )}
      </Button>
      {!hasEnoughPrep && (
        <p className="text-xs text-gray-500 mt-4">
          Tip: Complete at least 3 checklist items or prepare 3 questions first.
        </p>
      )}
    </Card>
  );
};

// Main component
export const InterviewDayCard: React.FC<InterviewDayCardProps> = ({
  session,
  application,
  stories,
  onGenerateQuickRef,
  isGenerating,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  // Get stories by ID
  const getStory = (id: string) => stories.find((s) => s.id === id);

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // If no quick reference yet
  if (!session.quickReference) {
    return (
      <EmptyQuickRef
        onGenerate={onGenerateQuickRef}
        isGenerating={isGenerating}
        session={session}
      />
    );
  }

  const quickRef = session.quickReference;

  return (
    <div className="space-y-6">
      <PrintStyles />

      {/* Header */}
      <div className="flex justify-between items-center no-print">
        <div>
          <h2 className="text-xl font-bold text-white">{application?.role || 'Interview'}</h2>
          <p className="text-gray-400">{application?.company || 'Company'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="ghost" onClick={onGenerateQuickRef} disabled={isGenerating}>
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Interview Details */}
      {(session.interviewDate || session.interviewLocation) && (
        <Card className="p-4 bg-blue-900/20 border-blue-800/50 no-print">
          <div className="flex flex-wrap gap-6">
            {session.interviewDate && (
              <div className="flex items-center gap-2 text-blue-300">
                <Clock className="w-4 h-4" />
                <span>{formatDate(session.interviewDate)}</span>
                {session.interviewTime && <span>at {session.interviewTime}</span>}
              </div>
            )}
            {session.interviewLocation && (
              <div className="flex items-center gap-2 text-blue-300">
                <MapPin className="w-4 h-4" />
                {session.interviewLocation.startsWith('http') ? (
                  <a
                    href={session.interviewLocation}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    Meeting Link
                  </a>
                ) : (
                  <span>{session.interviewLocation}</span>
                )}
              </div>
            )}
            {session.interviewerName && (
              <div className="flex items-center gap-2 text-blue-300">
                <User className="w-4 h-4" />
                <span>{session.interviewerName}</span>
                {session.interviewerRole && (
                  <span className="text-blue-400">({session.interviewerRole})</span>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Main Content - Printable */}
      <div className="print-area" ref={printRef}>
        {/* Print Header (only visible when printing) */}
        <div className="hidden print:block mb-6 text-center border-b pb-4">
          <h1 className="text-2xl font-bold">PREPPRLY</h1>
          <p className="text-lg">Interview Quick Reference</p>
          <div className="mt-2">
            <strong>{application?.role}</strong> at <strong>{application?.company}</strong>
          </div>
          {session.interviewDate && (
            <p className="text-sm mt-1">{formatDate(session.interviewDate)}</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4 print:grid-cols-2">
          {/* Elevator Pitch */}
          <SectionCard
            title="Elevator Pitch"
            icon={<MessageSquare className="w-4 h-4" />}
            color="text-blue-400"
          >
            <p className="text-gray-300 text-sm leading-relaxed">{quickRef.elevatorPitch}</p>
          </SectionCard>

          {/* Company Facts */}
          <SectionCard
            title="Company Quick Facts"
            icon={<Building2 className="w-4 h-4" />}
            color="text-purple-400"
          >
            <ul className="space-y-1">
              {quickRef.companyFacts.map((fact, i) => (
                <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                  <span className="text-purple-400 mt-1">•</span>
                  {fact}
                </li>
              ))}
            </ul>
          </SectionCard>

          {/* Top Stories */}
          <SectionCard
            title="Stories to Use"
            icon={<Book className="w-4 h-4" />}
            color="text-green-400"
          >
            <div className="space-y-2">
              {quickRef.topStories.map((storyId, i) => {
                const story = getStory(storyId);
                if (!story) return null;
                return (
                  <div key={storyId} className="bg-gray-800/50 p-2 rounded">
                    <p className="text-sm font-medium text-white flex items-center gap-2">
                      <span className="w-5 h-5 bg-green-900/50 rounded-full flex items-center justify-center text-xs text-green-400">
                        {i + 1}
                      </span>
                      {story.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-1 ml-7">
                      {story.star.result}
                    </p>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* Talking Points */}
          <SectionCard
            title="Key Talking Points"
            icon={<Target className="w-4 h-4" />}
            color="text-yellow-400"
          >
            <ul className="space-y-1">
              {quickRef.talkingPoints.map((point, i) => (
                <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                  <span className="text-yellow-400 font-bold">{i + 1}.</span>
                  {point}
                </li>
              ))}
            </ul>
          </SectionCard>

          {/* Questions to Ask */}
          <div className="md:col-span-2">
            <SectionCard
              title="Questions to Ask Them"
              icon={<HelpCircle className="w-4 h-4" />}
              color="text-cyan-400"
            >
              <div className="grid md:grid-cols-2 gap-2">
                {quickRef.questionsToAsk.map((q, i) => (
                  <p key={i} className="text-sm text-gray-300">
                    <span className="text-cyan-400 mr-2">Q{i + 1}:</span>
                    {q}
                  </p>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>

        {/* Print Footer */}
        <div className="hidden print:block mt-6 text-center text-xs text-gray-500 border-t pt-4">
          Generated by Prepprly • {formatDate(quickRef.generatedAt)}
        </div>
      </div>

      {/* Additional Info (not printed) */}
      <div className="no-print space-y-4">
        {/* JD Analysis Summary */}
        {application?.analysis && (
          <Card className="p-4">
            <h3 className="font-medium text-white mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-400" />
              Job Fit Summary
            </h3>
            <div className="flex items-center gap-4 mb-3">
              <div className="text-3xl font-bold text-blue-400">
                {application.analysis.fitScore}/10
              </div>
              <Badge
                className={cn(
                  'text-sm',
                  application.analysis.fitScore >= 8
                    ? 'bg-green-900/40 text-green-400'
                    : application.analysis.fitScore >= 6
                    ? 'bg-yellow-900/40 text-yellow-400'
                    : 'bg-red-900/40 text-red-400'
                )}
              >
                {application.analysis.fitScore >= 8
                  ? 'Strong Fit'
                  : application.analysis.fitScore >= 6
                  ? 'Good Fit'
                  : 'Some Gaps'}
              </Badge>
            </div>
            <p className="text-sm text-gray-400">{application.analysis.reasoning}</p>
          </Card>
        )}

        {/* Last Generated */}
        <p className="text-xs text-gray-500 text-center">
          Quick reference generated {formatDate(quickRef.generatedAt)}
        </p>
      </div>
    </div>
  );
};
