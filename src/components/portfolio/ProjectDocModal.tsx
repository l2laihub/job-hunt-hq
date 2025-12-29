/**
 * ProjectDocModal Component
 * Full documentation editor for a project
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  X,
  Save,
  Image,
  FileCode,
  Lightbulb,
  BarChart3,
  Puzzle,
  Loader2,
  Trash2,
  Plus,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Files,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import {
  Project,
  ProjectDocumentation,
  MediaAsset,
  TechnicalDecision,
  ProjectChallenge,
  ProjectMetric,
  DocumentFile,
} from '@/src/types';
import { Dialog } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { ImageUploader } from './ImageUploader';
import { ImageAnnotator, AnnotatedImageViewer } from './ImageAnnotator';
import { DocumentFileUploader } from './DocumentFileUploader';
import {
  uploadMultipleAssets,
  deleteProjectAsset,
} from '@/src/services/storage/project-assets';

type TabId = 'overview' | 'media' | 'documents' | 'decisions' | 'challenges' | 'metrics';

interface ProjectDocModalProps {
  project: Project;
  documentation: ProjectDocumentation;
  isOpen: boolean;
  onClose: () => void;
  onSave: (documentation: ProjectDocumentation) => Promise<void>;
  userId: string;
  onGenerateAI?: (project: Project, docs: ProjectDocumentation) => Promise<{
    summary: string;
    talkingPoints: string[];
    interviewQuestions: string[];
  }>;
}

export const ProjectDocModal: React.FC<ProjectDocModalProps> = ({
  project,
  documentation: initialDocs,
  isOpen,
  onClose,
  onSave,
  userId,
  onGenerateAI,
}) => {
  const [docs, setDocs] = useState<ProjectDocumentation>(initialDocs);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [annotatingAsset, setAnnotatingAsset] = useState<MediaAsset | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Reset state when modal opens with new project
  useEffect(() => {
    if (isOpen) {
      setDocs(initialDocs);
      setHasChanges(false);
      setActiveTab('overview');
    }
  }, [isOpen, initialDocs]);

  const updateDocs = useCallback((updates: Partial<ProjectDocumentation>) => {
    setDocs(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(docs);
      setHasChanges(false);
      onClose();
    } catch (err) {
      alert('Failed to save documentation');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadScreenshots = async (files: File[]) => {
    const result = await uploadMultipleAssets(
      userId,
      project.id || project.name,
      files,
      'screenshot'
    );
    if (result.assets.length > 0) {
      updateDocs({
        screenshots: [...docs.screenshots, ...result.assets],
      });
    }
    return result;
  };

  const handleUploadDiagrams = async (files: File[]) => {
    const result = await uploadMultipleAssets(
      userId,
      project.id || project.name,
      files,
      'architecture'
    );
    if (result.assets.length > 0) {
      updateDocs({
        architectureDiagrams: [...docs.architectureDiagrams, ...result.assets],
      });
    }
    return result;
  };

  const handleDeleteAsset = async (asset: MediaAsset, type: 'screenshots' | 'architectureDiagrams') => {
    try {
      await deleteProjectAsset(userId, project.id || project.name, asset.url);
      updateDocs({
        [type]: docs[type].filter(a => a.id !== asset.id),
      });
    } catch {
      // Still remove from local state even if storage delete fails
      updateDocs({
        [type]: docs[type].filter(a => a.id !== asset.id),
      });
    }
  };

  const handleSaveAnnotations = (assetId: string, type: 'screenshots' | 'architectureDiagrams', annotations: MediaAsset['annotations']) => {
    updateDocs({
      [type]: docs[type].map(a =>
        a.id === assetId ? { ...a, annotations } : a
      ),
    });
    setAnnotatingAsset(null);
  };

  const handleGenerateAI = async () => {
    if (!onGenerateAI) return;
    setIsGeneratingAI(true);
    try {
      const result = await onGenerateAI(project, docs);
      updateDocs({
        aiSummary: result.summary,
        talkingPoints: result.talkingPoints,
        interviewQuestions: result.interviewQuestions,
      });
    } catch {
      alert('Failed to generate AI insights');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <FileCode className="w-4 h-4" /> },
    { id: 'media', label: 'Media', icon: <Image className="w-4 h-4" />, count: docs.screenshots.length + docs.architectureDiagrams.length },
    { id: 'documents', label: 'Documents', icon: <Files className="w-4 h-4" />, count: docs.documentFiles?.length || 0 },
    { id: 'decisions', label: 'Decisions', icon: <Lightbulb className="w-4 h-4" />, count: docs.technicalDecisions.length },
    { id: 'challenges', label: 'Challenges', icon: <Puzzle className="w-4 h-4" />, count: docs.challenges.length },
    { id: 'metrics', label: 'Metrics', icon: <BarChart3 className="w-4 h-4" />, count: docs.metrics.length },
  ];

  return (
    <>
      <Dialog
        isOpen={isOpen && !annotatingAsset}
        onClose={onClose}
        title={`Document: ${project.name}`}
        size="xl"
      >
        <div className="flex flex-col h-[70vh]">
          {/* Tabs */}
          <div className="flex border-b border-gray-800 px-4 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  activeTab === tab.id
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                )}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-800 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'overview' && (
              <OverviewTab docs={docs} updateDocs={updateDocs} project={project} />
            )}
            {activeTab === 'media' && (
              <MediaTab
                docs={docs}
                onUploadScreenshots={handleUploadScreenshots}
                onUploadDiagrams={handleUploadDiagrams}
                onDeleteAsset={handleDeleteAsset}
                onAnnotate={setAnnotatingAsset}
              />
            )}
            {activeTab === 'documents' && (
              <DocumentsTab docs={docs} updateDocs={updateDocs} />
            )}
            {activeTab === 'decisions' && (
              <DecisionsTab docs={docs} updateDocs={updateDocs} />
            )}
            {activeTab === 'challenges' && (
              <ChallengesTab docs={docs} updateDocs={updateDocs} />
            )}
            {activeTab === 'metrics' && (
              <MetricsTab docs={docs} updateDocs={updateDocs} />
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-gray-800 bg-gray-850">
            <div className="flex items-center gap-3">
              {onGenerateAI && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateAI}
                  disabled={isGeneratingAI}
                >
                  {isGeneratingAI ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Generate AI Insights
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {hasChanges && (
                <span className="text-xs text-yellow-500">Unsaved changes</span>
              )}
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Documentation
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Image Annotator (Full Screen) */}
      {annotatingAsset && (
        <ImageAnnotator
          asset={annotatingAsset}
          onSave={(annotations) => {
            const type = docs.screenshots.find(a => a.id === annotatingAsset.id)
              ? 'screenshots'
              : 'architectureDiagrams';
            handleSaveAnnotations(annotatingAsset.id, type, annotations);
          }}
          onClose={() => setAnnotatingAsset(null)}
        />
      )}
    </>
  );
};

// ============================================
// Tab Components
// ============================================

interface TabProps {
  docs: ProjectDocumentation;
  updateDocs: (updates: Partial<ProjectDocumentation>) => void;
}

const OverviewTab: React.FC<TabProps & { project: Project }> = ({ docs, updateDocs }) => {
  return (
    <div className="space-y-6">
      {/* Project Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-400">My Role</label>
          <input
            type="text"
            value={docs.myRole}
            onChange={e => updateDocs({ myRole: e.target.value })}
            placeholder="e.g., Lead Backend Engineer"
            className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-400">Duration</label>
          <input
            type="text"
            value={docs.duration || ''}
            onChange={e => updateDocs({ duration: e.target.value })}
            placeholder="e.g., 6 months"
            className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-400">Team Size</label>
          <input
            type="number"
            value={docs.teamSize || ''}
            onChange={e => updateDocs({ teamSize: parseInt(e.target.value) || undefined })}
            placeholder="e.g., 5"
            className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white"
          />
        </div>
      </div>

      {/* System Context */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-400">System Context</label>
        <textarea
          value={docs.systemContext}
          onChange={e => updateDocs({ systemContext: e.target.value })}
          placeholder="Describe how this project fits into the larger ecosystem, what it integrates with, its purpose..."
          rows={3}
          className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white resize-none"
        />
      </div>

      {/* Integrations */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-400">Integrations / External Services</label>
        <ArrayInputSimple
          values={docs.integrations}
          onChange={integrations => updateDocs({ integrations })}
          placeholder="Add integration (e.g., Stripe API, AWS S3)"
        />
      </div>

      {/* AI Generated Insights */}
      {(docs.aiSummary || docs.talkingPoints?.length || docs.interviewQuestions?.length) && (
        <div className="mt-8 p-4 bg-purple-900/20 border border-purple-800 rounded-lg">
          <h3 className="text-sm font-medium text-purple-400 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            AI-Generated Insights
          </h3>

          {docs.aiSummary && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-400 mb-1">Summary</h4>
              <p className="text-sm text-gray-300">{docs.aiSummary}</p>
            </div>
          )}

          {docs.talkingPoints && docs.talkingPoints.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-400 mb-1">Talking Points</h4>
              <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                {docs.talkingPoints.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>
          )}

          {docs.interviewQuestions && docs.interviewQuestions.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-400 mb-1">Likely Interview Questions</h4>
              <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                {docs.interviewQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface MediaTabProps {
  docs: ProjectDocumentation;
  onUploadScreenshots: (files: File[]) => Promise<{ assets: MediaAsset[]; errors: string[] }>;
  onUploadDiagrams: (files: File[]) => Promise<{ assets: MediaAsset[]; errors: string[] }>;
  onDeleteAsset: (asset: MediaAsset, type: 'screenshots' | 'architectureDiagrams') => void;
  onAnnotate: (asset: MediaAsset) => void;
}

const MediaTab: React.FC<MediaTabProps> = ({
  docs,
  onUploadScreenshots,
  onUploadDiagrams,
  onDeleteAsset,
  onAnnotate,
}) => {
  return (
    <div className="space-y-8">
      {/* Architecture Diagrams */}
      <div>
        <h3 className="text-sm font-medium text-white mb-3">Architecture Diagrams</h3>
        <ImageUploader
          onUpload={onUploadDiagrams}
          label="Upload Architecture Diagrams"
          hint="System design, data flow, component diagrams"
        />
        {docs.architectureDiagrams.length > 0 && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            {docs.architectureDiagrams.map(asset => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onDelete={() => onDeleteAsset(asset, 'architectureDiagrams')}
                onAnnotate={() => onAnnotate(asset)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Screenshots */}
      <div>
        <h3 className="text-sm font-medium text-white mb-3">Screenshots</h3>
        <ImageUploader
          onUpload={onUploadScreenshots}
          label="Upload Screenshots"
          hint="UI screenshots, demo images, results"
        />
        {docs.screenshots.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mt-4">
            {docs.screenshots.map(asset => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onDelete={() => onDeleteAsset(asset, 'screenshots')}
                onAnnotate={() => onAnnotate(asset)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const DocumentsTab: React.FC<TabProps> = ({ docs, updateDocs }) => {
  const handleFilesChange = (files: DocumentFile[]) => {
    updateDocs({ documentFiles: files });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-white mb-2">Project Documentation Files</h3>
        <p className="text-sm text-gray-400 mb-4">
          Upload markdown files, code samples, or text documentation generated by Claude or other AI tools.
          These files help you remember technical details and prepare for interviews.
        </p>
        <DocumentFileUploader
          files={docs.documentFiles || []}
          onChange={handleFilesChange}
        />
      </div>

      {/* Tips */}
      <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
        <h4 className="text-sm font-medium text-blue-400 mb-2">💡 Tips for Documentation</h4>
        <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
          <li>Upload Claude-generated documentation files (.md, .tsx) from your project</li>
          <li>Include API documentation, architecture decisions, or design docs</li>
          <li>Add code samples that demonstrate key implementations</li>
          <li>Store interview prep notes and talking points</li>
        </ul>
      </div>
    </div>
  );
};

const DecisionsTab: React.FC<TabProps> = ({ docs, updateDocs }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addDecision = () => {
    const newDecision: TechnicalDecision = {
      id: crypto.randomUUID(),
      decision: '',
      context: '',
      alternatives: [],
      rationale: '',
      outcome: '',
      tags: [],
    };
    updateDocs({ technicalDecisions: [...docs.technicalDecisions, newDecision] });
    setExpandedId(newDecision.id);
  };

  const updateDecision = (id: string, updates: Partial<TechnicalDecision>) => {
    updateDocs({
      technicalDecisions: docs.technicalDecisions.map(d =>
        d.id === id ? { ...d, ...updates } : d
      ),
    });
  };

  const deleteDecision = (id: string) => {
    updateDocs({
      technicalDecisions: docs.technicalDecisions.filter(d => d.id !== id),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-400">
          Document key technical decisions you made and why
        </p>
        <Button variant="outline" size="sm" onClick={addDecision}>
          <Plus className="w-4 h-4 mr-1" />
          Add Decision
        </Button>
      </div>

      {docs.technicalDecisions.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm border border-dashed border-gray-800 rounded-lg">
          No technical decisions documented yet
        </div>
      ) : (
        <div className="space-y-3">
          {docs.technicalDecisions.map(decision => (
            <div
              key={decision.id}
              className="bg-gray-950 border border-gray-800 rounded-lg overflow-hidden"
            >
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-900"
                onClick={() => setExpandedId(expandedId === decision.id ? null : decision.id)}
              >
                <div className="flex items-center gap-2">
                  {expandedId === decision.id ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="font-medium text-white">
                    {decision.decision || 'Untitled Decision'}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteDecision(decision.id);
                  }}
                  className="text-gray-500 hover:text-red-400 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {expandedId === decision.id && (
                <div className="p-4 border-t border-gray-800 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400">Decision</label>
                    <input
                      type="text"
                      value={decision.decision}
                      onChange={e => updateDecision(decision.id, { decision: e.target.value })}
                      placeholder="What did you decide?"
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400">Context</label>
                    <textarea
                      value={decision.context}
                      onChange={e => updateDecision(decision.id, { context: e.target.value })}
                      placeholder="What problem were you trying to solve?"
                      rows={2}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400">Alternatives Considered</label>
                    <ArrayInputSimple
                      values={decision.alternatives}
                      onChange={alternatives => updateDecision(decision.id, { alternatives })}
                      placeholder="Add alternative"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400">Rationale</label>
                    <textarea
                      value={decision.rationale}
                      onChange={e => updateDecision(decision.id, { rationale: e.target.value })}
                      placeholder="Why did you choose this over alternatives?"
                      rows={2}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400">Outcome</label>
                    <textarea
                      value={decision.outcome}
                      onChange={e => updateDecision(decision.id, { outcome: e.target.value })}
                      placeholder="What was the result?"
                      rows={2}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400">Tags</label>
                    <ArrayInputSimple
                      values={decision.tags}
                      onChange={tags => updateDecision(decision.id, { tags })}
                      placeholder="Add tag (e.g., performance, scalability)"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ChallengesTab: React.FC<TabProps> = ({ docs, updateDocs }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addChallenge = () => {
    const newChallenge: ProjectChallenge = {
      id: crypto.randomUUID(),
      challenge: '',
      approach: '',
      technicalDetails: '',
      lessonsLearned: '',
    };
    updateDocs({ challenges: [...docs.challenges, newChallenge] });
    setExpandedId(newChallenge.id);
  };

  const updateChallenge = (id: string, updates: Partial<ProjectChallenge>) => {
    updateDocs({
      challenges: docs.challenges.map(c =>
        c.id === id ? { ...c, ...updates } : c
      ),
    });
  };

  const deleteChallenge = (id: string) => {
    updateDocs({
      challenges: docs.challenges.filter(c => c.id !== id),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-400">
          Document challenges you faced and how you overcame them
        </p>
        <Button variant="outline" size="sm" onClick={addChallenge}>
          <Plus className="w-4 h-4 mr-1" />
          Add Challenge
        </Button>
      </div>

      {docs.challenges.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm border border-dashed border-gray-800 rounded-lg">
          No challenges documented yet
        </div>
      ) : (
        <div className="space-y-3">
          {docs.challenges.map(challenge => (
            <div
              key={challenge.id}
              className="bg-gray-950 border border-gray-800 rounded-lg overflow-hidden"
            >
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-900"
                onClick={() => setExpandedId(expandedId === challenge.id ? null : challenge.id)}
              >
                <div className="flex items-center gap-2">
                  {expandedId === challenge.id ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="font-medium text-white">
                    {challenge.challenge || 'Untitled Challenge'}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChallenge(challenge.id);
                  }}
                  className="text-gray-500 hover:text-red-400 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {expandedId === challenge.id && (
                <div className="p-4 border-t border-gray-800 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400">Challenge</label>
                    <input
                      type="text"
                      value={challenge.challenge}
                      onChange={e => updateChallenge(challenge.id, { challenge: e.target.value })}
                      placeholder="What was the problem?"
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400">Approach</label>
                    <textarea
                      value={challenge.approach}
                      onChange={e => updateChallenge(challenge.id, { approach: e.target.value })}
                      placeholder="How did you approach solving it?"
                      rows={2}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400">Technical Details</label>
                    <textarea
                      value={challenge.technicalDetails}
                      onChange={e => updateChallenge(challenge.id, { technicalDetails: e.target.value })}
                      placeholder="Deep dive into the technical solution..."
                      rows={3}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400">Lessons Learned</label>
                    <textarea
                      value={challenge.lessonsLearned}
                      onChange={e => updateChallenge(challenge.id, { lessonsLearned: e.target.value })}
                      placeholder="What did you learn from this?"
                      rows={2}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MetricsTab: React.FC<TabProps> = ({ docs, updateDocs }) => {
  const addMetric = () => {
    const newMetric: ProjectMetric = {
      id: crypto.randomUUID(),
      metric: '',
      after: '',
      context: '',
    };
    updateDocs({ metrics: [...docs.metrics, newMetric] });
  };

  const updateMetric = (id: string, updates: Partial<ProjectMetric>) => {
    updateDocs({
      metrics: docs.metrics.map(m =>
        m.id === id ? { ...m, ...updates } : m
      ),
    });
  };

  const deleteMetric = (id: string) => {
    updateDocs({
      metrics: docs.metrics.filter(m => m.id !== id),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-400">
          Add quantifiable metrics and outcomes
        </p>
        <Button variant="outline" size="sm" onClick={addMetric}>
          <Plus className="w-4 h-4 mr-1" />
          Add Metric
        </Button>
      </div>

      {docs.metrics.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm border border-dashed border-gray-800 rounded-lg">
          No metrics documented yet
        </div>
      ) : (
        <div className="space-y-3">
          {docs.metrics.map(metric => (
            <div
              key={metric.id}
              className="p-4 bg-gray-950 border border-gray-800 rounded-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 grid grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400">Metric</label>
                    <input
                      type="text"
                      value={metric.metric}
                      onChange={e => updateMetric(metric.id, { metric: e.target.value })}
                      placeholder="e.g., Response time"
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400">Before</label>
                    <input
                      type="text"
                      value={metric.before || ''}
                      onChange={e => updateMetric(metric.id, { before: e.target.value })}
                      placeholder="e.g., 2.5s"
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400">After</label>
                    <input
                      type="text"
                      value={metric.after}
                      onChange={e => updateMetric(metric.id, { after: e.target.value })}
                      placeholder="e.g., 200ms"
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400">Improvement</label>
                    <input
                      type="text"
                      value={metric.improvement || ''}
                      onChange={e => updateMetric(metric.id, { improvement: e.target.value })}
                      placeholder="e.g., 92% faster"
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-white"
                    />
                  </div>
                </div>
                <button
                  onClick={() => deleteMetric(metric.id)}
                  className="text-gray-500 hover:text-red-400 p-1 mt-5"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-3 space-y-1">
                <label className="text-xs font-medium text-gray-400">Context</label>
                <input
                  type="text"
                  value={metric.context}
                  onChange={e => updateMetric(metric.id, { context: e.target.value })}
                  placeholder="What does this metric represent?"
                  className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-white"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// Helper Components
// ============================================

interface AssetCardProps {
  asset: MediaAsset;
  onDelete: () => void;
  onAnnotate: () => void;
}

const AssetCard: React.FC<AssetCardProps> = ({ asset, onDelete, onAnnotate }) => {
  return (
    <div className="group relative bg-gray-950 border border-gray-800 rounded-lg overflow-hidden">
      <AnnotatedImageViewer
        asset={asset}
        className="aspect-video"
        onClick={onAnnotate}
      />
      <div className="p-2">
        <p className="text-xs text-gray-400 truncate">{asset.filename}</p>
      </div>
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onAnnotate}
          className="p-1.5 bg-gray-900/80 rounded hover:bg-blue-600 transition-colors"
          title="Add annotations"
        >
          <ExternalLink className="w-3 h-3 text-white" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 bg-gray-900/80 rounded hover:bg-red-600 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-3 h-3 text-white" />
        </button>
      </div>
    </div>
  );
};

interface ArrayInputSimpleProps {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}

const ArrayInputSimple: React.FC<ArrayInputSimpleProps> = ({
  values,
  onChange,
  placeholder,
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    const val = inputValue.trim();
    if (val && !values.includes(val)) {
      onChange([...values, val]);
      setInputValue('');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {values.map((val, idx) => (
          <span
            key={idx}
            className="bg-gray-800 border border-gray-700 rounded-full px-3 py-1 text-sm flex items-center gap-1 group"
          >
            {val}
            <button
              onClick={() => onChange(values.filter((_, i) => i !== idx))}
              className="hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder={placeholder}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white"
        />
        <button
          onClick={handleAdd}
          className="p-2 bg-gray-800 rounded border border-gray-700 hover:bg-gray-700"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
