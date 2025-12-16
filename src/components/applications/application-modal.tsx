import React, { useState, useEffect } from 'react';
import { useApplicationStore, useUIStore, toast } from '@/src/stores';
import type { JobApplication, ApplicationStatus, JDAnalysis } from '@/src/types';
import { Dialog, Button, Input, Textarea, Select, Badge } from '@/src/components/ui';
import { cn } from '@/src/lib/utils';
import { APPLICATION_STATUSES } from '@/src/lib/constants';
import {
  Edit2,
  Brain,
  CheckCircle,
  AlertTriangle,
  MessageCircle,
  DollarSign,
  Clock,
  Target,
} from 'lucide-react';

interface FormData {
  company: string;
  role: string;
  type: 'fulltime' | 'freelance';
  status: ApplicationStatus;
  salaryRange: string;
  source: JobApplication['source'];
  notes: string;
  jobDescriptionRaw: string;
}

const initialFormData: FormData = {
  company: '',
  role: '',
  type: 'fulltime',
  status: 'wishlist',
  salaryRange: '',
  source: 'linkedin',
  notes: '',
  jobDescriptionRaw: '',
};

const sourceOptions = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'upwork', label: 'Upwork' },
  { value: 'direct', label: 'Direct' },
  { value: 'referral', label: 'Referral' },
  { value: 'other', label: 'Other' },
];

const statusOptions = APPLICATION_STATUSES.map((s) => ({
  value: s.id,
  label: s.label,
}));

export const ApplicationModal: React.FC = () => {
  const activeModal = useUIStore((s) => s.activeModal);
  const modalData = useUIStore((s) => s.modalData) as JobApplication | undefined;
  const closeModal = useUIStore((s) => s.closeModal);

  const addApplication = useApplicationStore((s) => s.addApplication);
  const updateApplication = useApplicationStore((s) => s.updateApplication);

  const [activeTab, setActiveTab] = useState<'details' | 'analysis'>('details');
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const isOpen = activeModal === 'application';
  const isEditing = Boolean(modalData?.id);
  const analysis = modalData?.analysis;

  useEffect(() => {
    if (isOpen) {
      if (modalData) {
        setFormData({
          company: modalData.company || '',
          role: modalData.role || '',
          type: modalData.type || 'fulltime',
          status: modalData.status || 'wishlist',
          salaryRange: modalData.salaryRange || '',
          source: modalData.source || 'linkedin',
          notes: modalData.notes || '',
          jobDescriptionRaw: modalData.jobDescriptionRaw || '',
        });
      } else {
        setFormData(initialFormData);
      }
      setActiveTab('details');
    }
  }, [isOpen, modalData]);

  const handleClose = () => {
    closeModal();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.company.trim() || !formData.role.trim()) {
      toast.error('Missing required fields', 'Please enter company and role');
      return;
    }

    if (isEditing && modalData) {
      updateApplication(modalData.id, {
        ...formData,
        analysis: modalData.analysis,
        companyResearch: modalData.companyResearch,
      });
      toast.success('Application updated', `${formData.company} - ${formData.role}`);
    } else {
      addApplication(formData);
      toast.success('Application added', `${formData.company} - ${formData.role}`);
    }

    handleClose();
  };

  const handleFieldChange = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      showCloseButton
    >
      {/* Custom Header with Tabs */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-850">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-white">
            {isEditing ? 'Application Details' : 'New Application'}
          </h2>

          {analysis && (
            <div className="flex bg-gray-900 rounded p-0.5 border border-gray-700">
              <button
                onClick={() => setActiveTab('details')}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition-colors',
                  activeTab === 'details'
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                )}
              >
                <Edit2 className="w-3 h-3" /> Edit
              </button>
              <button
                onClick={() => setActiveTab('analysis')}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition-colors',
                  activeTab === 'analysis'
                    ? 'bg-blue-900/40 text-blue-300'
                    : 'text-gray-400 hover:text-gray-200'
                )}
              >
                <Brain className="w-3 h-3" /> Analysis
              </button>
            </div>
          )}
        </div>
      </div>

      {activeTab === 'details' ? (
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type Toggle */}
          <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800">
            <button
              type="button"
              onClick={() => handleFieldChange('type', 'fulltime')}
              className={cn(
                'flex-1 py-1.5 text-xs font-medium rounded transition-colors',
                formData.type === 'fulltime'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              )}
            >
              Full-Time Role
            </button>
            <button
              type="button"
              onClick={() => handleFieldChange('type', 'freelance')}
              className={cn(
                'flex-1 py-1.5 text-xs font-medium rounded transition-colors',
                formData.type === 'freelance'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              )}
            >
              Freelance / Contract
            </button>
          </div>

          {/* Company & Role */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={formData.type === 'freelance' ? 'Client / Platform *' : 'Company *'}
              value={formData.company}
              onChange={(e) => handleFieldChange('company', e.target.value)}
              placeholder={formData.type === 'freelance' ? 'e.g. Upwork Client' : 'e.g. Acme Corp'}
              required
            />
            <Input
              label={formData.type === 'freelance' ? 'Project Title *' : 'Role Title *'}
              value={formData.role}
              onChange={(e) => handleFieldChange('role', e.target.value)}
              placeholder={formData.type === 'freelance' ? 'e.g. React App Development' : 'e.g. Senior Engineer'}
              required
            />
          </div>

          {/* Status & Source */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              value={formData.status}
              onChange={(val) => handleFieldChange('status', val as ApplicationStatus)}
              options={statusOptions}
            />
            <Select
              label="Source"
              value={formData.source}
              onChange={(val) => handleFieldChange('source', val as JobApplication['source'])}
              options={sourceOptions}
            />
          </div>

          {/* Salary/Budget */}
          <Input
            label={formData.type === 'freelance' ? 'Budget / Rate' : 'Salary Range'}
            value={formData.salaryRange}
            onChange={(e) => handleFieldChange('salaryRange', e.target.value)}
            placeholder={
              formData.type === 'freelance' ? 'e.g. $50/hr or $2000 fixed' : 'e.g. $160k - $190k'
            }
          />

          {/* Notes */}
          <Textarea
            label="Notes"
            value={formData.notes}
            onChange={(e) => handleFieldChange('notes', e.target.value)}
            placeholder="Any additional notes..."
            rows={3}
          />

          {/* Analysis Preview */}
          {analysis && (
            <button
              type="button"
              onClick={() => setActiveTab('analysis')}
              className={cn(
                'w-full p-3 border rounded text-xs flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity text-left',
                analysis.analysisType === 'freelance'
                  ? 'bg-purple-900/20 border-purple-800 text-purple-200'
                  : 'bg-blue-900/20 border-blue-800 text-blue-200'
              )}
            >
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  analysis.analysisType === 'freelance' ? 'bg-purple-400' : 'bg-blue-400'
                )}
              />
              Includes {analysis.analysisType === 'freelance' ? 'Freelance Strategy' : 'Fit Analysis'}{' '}
              (Score: {analysis.fitScore}/10)
              <span className="ml-auto underline">View Analysis →</span>
            </button>
          )}

          {/* Actions */}
          <div className="pt-2 flex justify-end gap-2 border-t border-gray-800">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {isEditing ? 'Save Changes' : 'Save Application'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="p-6 overflow-y-auto max-h-[60vh] bg-gray-900/50">
          {analysis ? (
            <AnalysisResultView analysis={analysis} />
          ) : (
            <div className="text-center text-gray-500 py-10">No analysis data available.</div>
          )}
        </div>
      )}
    </Dialog>
  );
};

// Analysis Result View Component (embedded)
interface AnalysisResultViewProps {
  analysis: JDAnalysis;
}

const AnalysisResultView: React.FC<AnalysisResultViewProps> = ({ analysis }) => {
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-400 border-green-500/30 bg-green-900/20';
    if (score >= 5) return 'text-yellow-400 border-yellow-500/30 bg-yellow-900/20';
    return 'text-red-400 border-red-500/30 bg-red-900/20';
  };

  if (analysis.analysisType === 'freelance') {
    const data = analysis;
    return (
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="flex gap-4">
          <div
            className={cn(
              'flex flex-col items-center justify-center p-4 rounded-xl border min-w-[100px]',
              getScoreColor(data.fitScore)
            )}
          >
            <span className="text-3xl font-bold">{data.fitScore}</span>
            <span className="text-xs uppercase tracking-wider opacity-80">Fit Score</span>
          </div>
          <div className="flex-1 p-4 bg-gray-800/50 rounded-xl border border-gray-700 space-y-2">
            <p className="text-sm text-gray-300 italic">"{data.reasoning}"</p>
            <div className="flex gap-2">
              <Badge variant="info" size="sm">{data.projectType}</Badge>
              {data.estimatedEffort && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-300">
                  <Clock className="w-3 h-3 mr-1" /> {data.estimatedEffort}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Proposal Angle */}
        <div className="p-5 bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-xl border border-blue-800/30">
          <h3 className="text-sm font-semibold text-blue-300 mb-2 flex items-center gap-2">
            <Target className="w-4 h-4" /> Winning Proposal Strategy
          </h3>
          <p className="text-sm text-gray-300 mb-4">{data.proposalAngle}</p>
          <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
            <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Opening Hook</span>
            <p className="text-sm text-white font-medium">"{data.openingHook}"</p>
          </div>
        </div>

        {/* Bid Strategy */}
        <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
          <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Suggested Bid
          </h3>
          <div className="flex items-center gap-6 mb-2">
            {data.suggestedBid.hourly && (
              <div>
                <span className="text-xs text-gray-500 block">Hourly Rate</span>
                <span className="text-lg font-bold text-white">${data.suggestedBid.hourly}/hr</span>
              </div>
            )}
            {data.suggestedBid.fixed && (
              <div>
                <span className="text-xs text-gray-500 block">Fixed Price</span>
                <span className="text-lg font-bold text-white">${data.suggestedBid.fixed}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 border-t border-gray-700 pt-2">
            {data.suggestedBid.rationale}
          </p>
        </div>

        {/* Skills & Experience */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700">
            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Relevant Experience</h4>
            <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside">
              {data.relevantExperience?.map((exp, i) => (
                <li key={i}>{exp}</li>
              ))}
            </ul>
          </div>
          <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700">
            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Questions for Client</h4>
            <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside">
              {data.questionsForClient?.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // FTE Analysis
  const data = analysis;
  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="flex gap-4">
        <div
          className={cn(
            'flex flex-col items-center justify-center p-4 rounded-xl border min-w-[100px]',
            getScoreColor(data.fitScore)
          )}
        >
          <span className="text-3xl font-bold">{data.fitScore}</span>
          <span className="text-xs uppercase tracking-wider opacity-80">Fit Score</span>
        </div>
        <div className="flex-1 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
          <p className="text-sm text-gray-300 italic">"{data.reasoning}"</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
              Role Type: <span className="text-white ml-1 capitalize">{data.roleType}</span>
            </span>
            {data.salaryAssessment && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-300 border border-green-800/50">
                <DollarSign className="w-3 h-3 mr-1" /> {data.salaryAssessment}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
          <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> You Have
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.matchedSkills?.map((skill) => (
              <span
                key={skill}
                className="px-2 py-1 bg-green-900/30 text-green-300 rounded text-xs border border-green-800"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
        <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
          <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Missing / Gaps
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.missingSkills?.map((skill) => (
              <span
                key={skill}
                className="px-2 py-1 bg-red-900/30 text-red-300 rounded text-xs border border-red-800"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Talking Points */}
      <div className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-400">
          <MessageCircle className="w-4 h-4" /> Talking Points
        </h3>
        <div className="grid gap-2">
          {data.talkingPoints?.map((point, i) => (
            <div key={i} className="flex gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <span className="text-blue-500 font-mono text-xs mt-0.5">0{i + 1}</span>
              <p className="text-sm text-gray-300">{point}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ApplicationModal;
