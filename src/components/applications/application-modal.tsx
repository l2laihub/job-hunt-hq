import React, { useState, useEffect, useMemo } from 'react';
import { useUIStore, toast } from '@/src/stores';
import { useAuth } from '@/src/lib/supabase';
import { useSupabaseActiveProfile, useSupabaseStoriesStore } from '@/src/stores/supabase';
import { useApplications } from '@/src/hooks/useAppData';
import type { JobApplication, ApplicationStatus } from '@/src/types';
import { Dialog, Button, Input, Textarea, Select } from '@/src/components/ui';
import { cn, todayLocal } from '@/src/lib/utils';
import { APPLICATION_STATUSES } from '@/src/lib/constants';
import { InterviewNotesTab } from '@/components/InterviewNotesTab';
import { AnalysisResultView } from '@/components/AnalysisResultView';
import { compOf, formatComp } from '@/src/lib/comp';
import { Edit2, Brain, Mic } from 'lucide-react';

interface FormData {
  company: string;
  role: string;
  type: 'fulltime' | 'freelance';
  status: ApplicationStatus;
  salaryRange: string;
  source: JobApplication['source'];
  notes: string;
  jobDescriptionRaw: string;
  recruiter: string;
  recruiterContact: string;
  contactedDate: string;
  nextAction: string;
  nextActionDate: string;
  compMin: string; // form strings; converted to numbers on save
  compMax: string;
  compUnit: 'year' | 'hour';
  compCurrency: 'USD' | 'CAD';
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
  recruiter: '',
  recruiterContact: '',
  contactedDate: '',
  nextAction: '',
  nextActionDate: '',
  compMin: '',
  compMax: '',
  compUnit: 'year',
  compCurrency: 'USD',
};

const toNum = (v: string) => (v.trim() === '' || !Number.isFinite(Number(v)) ? undefined : Number(v));

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
  const modalInitialTab = useUIStore((s) => s.modalInitialTab);
  const closeModal = useUIStore((s) => s.closeModal);

  const { addApplication, updateApplication } = useApplications();

  // Get auth and profile data for Interview Notes
  const { user } = useAuth();
  const profile = useSupabaseActiveProfile();
  const allStories = useSupabaseStoriesStore((s) => s.stories);
  // Scope stories to the active profile so interview-note AI analysis never
  // pulls another profile's experiences (strict per-profile isolation).
  const stories = useMemo(() => {
    const pid = profile?.metadata?.id;
    return pid ? allStories.filter((s) => s.profileId === pid) : allStories;
  }, [allStories, profile]);

  const [activeTab, setActiveTab] = useState<'details' | 'analysis' | 'notes'>('details');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [interviewNotesCount, setInterviewNotesCount] = useState(0);

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
          recruiter: modalData.recruiter || '',
          recruiterContact: modalData.recruiterContact || '',
          contactedDate: modalData.contactedDate || '',
          nextAction: modalData.nextAction || '',
          nextActionDate: modalData.nextActionDate || '',
          compMin: modalData.compMin?.toString() ?? '',
          compMax: modalData.compMax?.toString() ?? '',
          compUnit: modalData.compUnit || 'year',
          compCurrency: modalData.compCurrency || 'USD',
        });
      } else {
        setFormData(initialFormData);
      }
      setActiveTab(
        (modalInitialTab as 'details' | 'analysis' | 'notes') || 'details'
      );
    }
  }, [isOpen, modalData, modalInitialTab]);

  const handleClose = () => {
    closeModal();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.company.trim() || !formData.role.trim()) {
      toast.error('Missing required fields', 'Please enter company and role');
      return;
    }

    const compMin = toNum(formData.compMin);
    const compMax = toNum(formData.compMax);
    // Mirror the DB checks so the save doesn't fail with an opaque error
    if ((compMin ?? 0) < 0 || (compMax ?? 0) < 0 || (compMin != null && compMax != null && compMin > compMax)) {
      toast.error('Invalid compensation', 'Comp must be non-negative, and min must not exceed max');
      return;
    }

    const { compMin: _min, compMax: _max, ...fields } = formData;
    const app: Partial<JobApplication> = {
      ...fields,
      compMin,
      compMax,
      // Same auto-stamping the Kanban drag does
      contactedDate: formData.contactedDate || (formData.status === 'contact' ? todayLocal() : ''),
      ...(formData.status === 'applied' && !modalData?.dateApplied && { dateApplied: new Date().toISOString() }),
    };

    if (isEditing && modalData) {
      updateApplication(modalData.id, {
        ...app,
        analysis: modalData.analysis,
        companyResearch: modalData.companyResearch,
      });
      toast.success('Application updated', `${formData.company} - ${formData.role}`);
    } else {
      addApplication(app);
      toast.success('Application added', `${formData.company} - ${formData.role}`);
    }

    handleClose();
  };

  const handleFieldChange = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const comp = compOf({
    ...formData,
    compMin: toNum(formData.compMin),
    compMax: toNum(formData.compMax),
  });
  const compPreview = comp ? formatComp(comp) : null;

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

          {isEditing && (
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
              {analysis && (
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
              )}
              <button
                onClick={() => setActiveTab('notes')}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition-colors',
                  activeTab === 'notes'
                    ? 'bg-purple-900/40 text-purple-300'
                    : 'text-gray-400 hover:text-gray-200'
                )}
              >
                <Mic className="w-3 h-3" /> Notes
                {interviewNotesCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-purple-600 rounded-full text-[10px] text-white">
                    {interviewNotesCount}
                  </span>
                )}
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

          {/* Structured comp (optional — parsed from the range above when blank) */}
          <div className="grid grid-cols-4 gap-4">
            <Input
              label="Comp min"
              type="number"
              min="0"
              step="any"
              value={formData.compMin}
              onChange={(e) => handleFieldChange('compMin', e.target.value)}
              placeholder="auto"
            />
            <Input
              label="Comp max"
              type="number"
              min="0"
              step="any"
              value={formData.compMax}
              onChange={(e) => handleFieldChange('compMax', e.target.value)}
              placeholder="auto"
            />
            <Select
              label="Per"
              value={formData.compUnit}
              onChange={(val) => handleFieldChange('compUnit', val as FormData['compUnit'])}
              options={[{ value: 'year', label: 'Year' }, { value: 'hour', label: 'Hour' }]}
            />
            <Select
              label="Currency"
              value={formData.compCurrency}
              onChange={(val) => handleFieldChange('compCurrency', val as FormData['compCurrency'])}
              options={[{ value: 'USD', label: 'USD' }, { value: 'CAD', label: 'CAD' }]}
            />
          </div>
          {compPreview && <p className="-mt-2 text-xs text-gray-500 font-mono">{compPreview}</p>}

          {/* Recruiter */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Recruiter / contact"
              value={formData.recruiter}
              onChange={(e) => handleFieldChange('recruiter', e.target.value)}
              placeholder="e.g. Jane Doe"
            />
            <Input
              label="Recruiter email / LinkedIn"
              value={formData.recruiterContact}
              onChange={(e) => handleFieldChange('recruiterContact', e.target.value)}
              placeholder="email or profile URL"
            />
          </div>

          {/* Next action */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Input
                label="Next action"
                value={formData.nextAction}
                onChange={(e) => handleFieldChange('nextAction', e.target.value)}
                placeholder="e.g. Follow up with recruiter"
              />
            </div>
            <Input
              label="Next action date"
              type="date"
              value={formData.nextActionDate}
              onChange={(e) => handleFieldChange('nextActionDate', e.target.value)}
            />
          </div>
          <Input
            label="First contacted"
            type="date"
            value={formData.contactedDate}
            onChange={(e) => handleFieldChange('contactedDate', e.target.value)}
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
      ) : activeTab === 'analysis' ? (
        <div className="p-6 overflow-y-auto max-h-[60vh] bg-gray-900/50">
          {analysis ? (
            <AnalysisResultView analysis={analysis} />
          ) : (
            <div className="text-center text-gray-500 py-10">No analysis data available.</div>
          )}
        </div>
      ) : activeTab === 'notes' && modalData?.id && user && profile ? (
        <div className="p-6 overflow-y-auto max-h-[60vh] bg-gray-900/50">
          <InterviewNotesTab
            application={modalData as JobApplication}
            userId={user.id}
            profile={profile}
            stories={stories}
            onNotesCountChange={setInterviewNotesCount}
          />
        </div>
      ) : (
        <div className="p-6 overflow-y-auto max-h-[60vh] bg-gray-900/50">
          <div className="text-center text-gray-500 py-10">
            {!user ? 'Please sign in to access interview notes.' : 'Interview notes not available.'}
          </div>
        </div>
      )}
    </Dialog>
  );
};

export default ApplicationModal;
