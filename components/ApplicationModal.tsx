import React, { useState, useEffect } from 'react';
import { JobApplication, JDAnalysis, ApplicationStatus } from '../types';
import { X, Edit2, Brain } from 'lucide-react';
import { AnalysisResultView } from './AnalysisResultView';

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (app: Partial<JobApplication>) => void;
  initialData?: Partial<JobApplication>;
  analysisData?: JDAnalysis | null;
  jdText?: string;
}

export const ApplicationModal: React.FC<ApplicationModalProps> = ({ isOpen, onClose, onSave, initialData, analysisData, jdText }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'analysis'>('details');
  const [formData, setFormData] = useState<Partial<JobApplication>>({
    company: '',
    role: '',
    status: 'wishlist',
    type: 'fulltime',
    salaryRange: '',
    source: 'linkedin',
    notes: '',
    jobDescriptionRaw: '',
  });

  // Effective analysis data might come from the passed prop (new analysis) or the edited application's existing analysis
  const effectiveAnalysis = analysisData || initialData?.analysis;

  useEffect(() => {
    if (isOpen) {
      // Auto-detect type if analysis exists
      const type = analysisData?.analysisType === 'freelance' ? 'freelance' : (initialData?.type || 'fulltime');
      
      setFormData({
        company: '',
        role: '',
        status: 'wishlist',
        salaryRange: '',
        source: 'linkedin',
        notes: '',
        jobDescriptionRaw: jdText || '',
        ...initialData,
        type, 
        ...(analysisData ? { analysis: analysisData } : {})
      });
      // Reset tab to details when opening
      setActiveTab('details');
    }
  }, [isOpen, initialData, analysisData, jdText]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-gray-850 rounded-t-xl">
          <div className="flex items-center gap-4">
             <h2 className="text-lg font-semibold text-white">
               {initialData?.id ? 'Application Details' : 'New Application'}
             </h2>
             {/* Tab Switcher */}
             {effectiveAnalysis && (
                <div className="flex bg-gray-900 rounded p-0.5 border border-gray-700">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`px-3 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition-colors ${
                      activeTab === 'details' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                  <button
                    onClick={() => setActiveTab('analysis')}
                    className={`px-3 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition-colors ${
                      activeTab === 'analysis' ? 'bg-blue-900/40 text-blue-300' : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <Brain className="w-3 h-3" /> Analysis
                  </button>
                </div>
             )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {activeTab === 'details' ? (
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Type Toggle */}
          <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800">
            <button
              type="button"
              onClick={() => setFormData({...formData, type: 'fulltime'})}
              className={`flex-1 py-1 text-xs font-medium rounded ${formData.type === 'fulltime' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >
              Full-Time Role
            </button>
            <button
              type="button"
              onClick={() => setFormData({...formData, type: 'freelance'})}
              className={`flex-1 py-1 text-xs font-medium rounded ${formData.type === 'freelance' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >
              Freelance / Contract
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                {formData.type === 'freelance' ? 'Client / Platform' : 'Company'} *
              </label>
              <input 
                required
                type="text" 
                value={formData.company}
                onChange={e => setFormData({...formData, company: e.target.value})}
                className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                 {formData.type === 'freelance' ? 'Project Title' : 'Role Title'} *
              </label>
              <input 
                required
                type="text" 
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value})}
                className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Status</label>
              <select 
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value as ApplicationStatus})}
                className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none appearance-none"
              >
                <option value="wishlist">Wishlist</option>
                <option value="applied">Applied / Submitted</option>
                <option value="interviewing">Interviewing</option>
                <option value="offer">Offer</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
               <label className="block text-xs font-medium text-gray-400 mb-1">Source</label>
               <select 
                value={formData.source}
                onChange={e => setFormData({...formData, source: e.target.value as any})}
                className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="linkedin">LinkedIn</option>
                <option value="upwork">Upwork</option>
                <option value="direct">Direct</option>
                <option value="referral">Referral</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              {formData.type === 'freelance' ? 'Budget / Rate' : 'Salary Range'}
            </label>
            <input 
              type="text" 
              placeholder={formData.type === 'freelance' ? 'e.g. $50/hr or $2000 fixed' : 'e.g. $160k - $190k'}
              value={formData.salaryRange}
              onChange={e => setFormData({...formData, salaryRange: e.target.value})}
              className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Notes</label>
            <textarea 
              rows={3}
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          {effectiveAnalysis && (
             <div 
               onClick={() => setActiveTab('analysis')}
               className={`p-3 border rounded text-xs flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity ${effectiveAnalysis.analysisType === 'freelance' ? 'bg-purple-900/20 border-purple-800 text-purple-200' : 'bg-blue-900/20 border-blue-800 text-blue-200'}`}
             >
                <span className={`w-2 h-2 rounded-full ${effectiveAnalysis.analysisType === 'freelance' ? 'bg-purple-400' : 'bg-blue-400'}`}></span>
                Includes {effectiveAnalysis.analysisType === 'freelance' ? 'Freelance Strategy' : 'Fit Analysis'} (Score: {effectiveAnalysis.fitScore}/10)
                <span className="ml-auto underline">View Analysis &rarr;</span>
             </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded transition-colors"
            >
              Save Application
            </button>
          </div>
        </form>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 bg-gray-900/50">
            {effectiveAnalysis ? (
              <AnalysisResultView analysis={effectiveAnalysis} />
            ) : (
              <div className="text-center text-gray-500 py-10">No analysis data available.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};