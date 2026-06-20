/**
 * ProjectsSection Component
 * Enhanced projects section for ProfileBuilder with documentation support
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  Plus,
  Trash2,
  FileText,
  Image,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Lightbulb,
  BarChart3,
  Edit2,
  Check,
  X,
  Files,
  Sparkles,
  Loader2,
  Copy,
} from 'lucide-react';
import {
  Project,
  ProjectDocumentation,
  UserProfileWithMeta,
  DEFAULT_PROJECT_DOCUMENTATION,
} from '@/src/types';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { toast } from '@/src/stores';
import { ProjectDocModal } from './ProjectDocModal';
import {
  buildMTACProjectCopy,
  buildMTACDocumentationCopy,
} from '@/src/services/project-import';
import {
  saveProjectDocumentation,
  getProjectDocumentation,
  getAllProjectDocumentation,
  copyProjectAssets,
} from '@/src/services/storage/project-assets';

interface ProjectsSectionProps {
  projects: Project[];
  onUpdateProjects: (projects: Project[]) => void;
  userId?: string; // Required for Supabase storage
  profileId?: string;
  otherProfiles?: UserProfileWithMeta[]; // Other profiles, for copying assets across profiles
  onGenerateAI?: (project: Project, docs: ProjectDocumentation) => Promise<{
    summary: string;
    talkingPoints: string[];
    interviewQuestions: string[];
  }>;
}

/**
 * Find a project with the same name in another profile that can serve as a
 * source of uploaded assets. Returns the first match (must have a stable id).
 */
function findAssetSourceProfile(
  otherProfiles: UserProfileWithMeta[] | undefined,
  projectName: string
): { profileName: string; sourceProjectId: string } | null {
  if (!otherProfiles) return null;
  const target = projectName.trim().toLowerCase();
  for (const prof of otherProfiles) {
    const match = prof.activeProjects?.find(
      (pr) => pr.id && pr.name.trim().toLowerCase() === target
    );
    if (match?.id) {
      return { profileName: prof.metadata.name, sourceProjectId: match.id };
    }
  }
  return null;
}

export const ProjectsSection: React.FC<ProjectsSectionProps> = ({
  projects,
  onUpdateProjects,
  userId,
  profileId,
  otherProfiles,
  onGenerateAI,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [documentingProject, setDocumentingProject] = useState<Project | null>(null);
  const [projectDocs, setProjectDocs] = useState<Record<string, ProjectDocumentation>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isImportingMtac, setIsImportingMtac] = useState(false);
  const [copyingFilesId, setCopyingFilesId] = useState<string | null>(null);
  const [newProject, setNewProject] = useState<Partial<Project>>({
    name: '',
    description: '',
    techStack: [],
    status: 'active',
  });

  // Load documentation for all projects
  useEffect(() => {
    if (!userId) return;

    const loadDocs = async () => {
      try {
        const allDocs = await getAllProjectDocumentation(userId);
        const docsMap: Record<string, ProjectDocumentation> = {};
        allDocs.forEach(doc => {
          docsMap[doc.projectId] = doc.documentation;
        });
        setProjectDocs(docsMap);
      } catch (err) {
        console.error('Failed to load project documentation:', err);
      }
    };

    loadDocs();
  }, [userId]);

  const ensureProjectId = (project: Project): Project => {
    if (!project.id) {
      return { ...project, id: crypto.randomUUID() };
    }
    return project;
  };

  const handleAddProject = useCallback(() => {
    if (!newProject.name?.trim()) return;

    const project: Project = {
      id: crypto.randomUUID(),
      name: newProject.name.trim(),
      description: newProject.description || '',
      techStack: newProject.techStack || [],
      status: newProject.status || 'active',
    };

    onUpdateProjects([...projects, project]);
    setNewProject({ name: '', description: '', techStack: [], status: 'active' });
    setIsAddingNew(false);
  }, [newProject, projects, onUpdateProjects]);

  const handleImportMtac = useCallback(async () => {
    // Avoid creating a duplicate MTAC project in this profile
    const alreadyExists = projects.some(p =>
      p.name.toLowerCase().includes('mtac') ||
      p.name.toLowerCase().includes('intelligence copilot')
    );
    if (alreadyExists) {
      toast.error('Already added', 'This profile already has the MTAC Intelligence Copilot project.');
      return;
    }

    setIsImportingMtac(true);
    try {
      const project = buildMTACProjectCopy();
      const documentation = buildMTACDocumentationCopy();
      const projectId = project.id!;

      // Add the project entry (persisted with the profile on "Save Changes")
      onUpdateProjects([...projects, project]);

      // Persist the documentation to its own table so it shows up and is reusable.
      // Requires being signed in (documentation lives in Supabase, keyed by user + project).
      if (userId) {
        await saveProjectDocumentation(userId, projectId, project.name, documentation, profileId);
        setProjectDocs(prev => ({ ...prev, [projectId]: documentation }));
        setExpandedId(projectId);
        toast.success('MTAC project imported', 'Click "Save Changes" to finish saving the project.');
      } else {
        toast.success(
          'MTAC project added',
          'Sign in to import its documentation. Click "Save Changes" to keep the project.'
        );
      }
    } catch (err) {
      console.error('Failed to import MTAC project:', err);
      toast.error('Import failed', err instanceof Error ? err.message : 'Could not import the MTAC project.');
    } finally {
      setIsImportingMtac(false);
    }
  }, [projects, onUpdateProjects, userId, profileId]);

  const handleUpdateProject = useCallback((id: string, updates: Partial<Project>) => {
    onUpdateProjects(projects.map(p =>
      p.id === id || p.name === id ? { ...ensureProjectId(p), ...updates } : p
    ));
  }, [projects, onUpdateProjects]);

  const handleDeleteProject = useCallback((id: string) => {
    onUpdateProjects(projects.filter(p => p.id !== id && p.name !== id));
  }, [projects, onUpdateProjects]);

  const handleCopyFiles = useCallback(async (project: Project) => {
    if (!userId) {
      toast.error('Sign in required', 'Copying uploaded files needs you to be signed in.');
      return;
    }
    const source = findAssetSourceProfile(otherProfiles, project.name);
    if (!source) {
      toast.error('No source found', `No other profile has a project named "${project.name}".`);
      return;
    }

    // Ensure the target project has a stable id to key its documentation by.
    const withId = ensureProjectId(project);
    if (!project.id) {
      handleUpdateProject(project.name, { id: withId.id });
    }
    const targetProjectId = withId.id!;

    setCopyingFilesId(targetProjectId);
    try {
      const sourceDoc = await getProjectDocumentation(userId, source.sourceProjectId);
      const sourceImages =
        (sourceDoc?.screenshots?.length || 0) + (sourceDoc?.architectureDiagrams?.length || 0);
      const sourceFiles = sourceDoc?.documentFiles?.length || 0;

      if (!sourceDoc || (sourceImages === 0 && sourceFiles === 0)) {
        toast.error('Nothing to copy', `"${project.name}" in ${source.profileName} has no uploaded files.`);
        return;
      }

      const targetDoc =
        projectDocs[targetProjectId] ||
        (await getProjectDocumentation(userId, targetProjectId)) ||
        DEFAULT_PROJECT_DOCUMENTATION;

      const { documentation, copiedImages, copiedFiles } = await copyProjectAssets(
        userId,
        source.sourceProjectId,
        targetProjectId,
        sourceDoc,
        targetDoc
      );

      await saveProjectDocumentation(userId, targetProjectId, project.name, documentation, profileId);
      setProjectDocs(prev => ({ ...prev, [targetProjectId]: documentation }));
      handleUpdateProject(targetProjectId, { hasDocumentation: true });

      if (copiedImages === 0 && copiedFiles === 0) {
        toast.success('Already up to date', `No new files to copy from ${source.profileName}.`);
      } else {
        const parts: string[] = [];
        if (copiedImages) parts.push(`${copiedImages} image${copiedImages > 1 ? 's' : ''}`);
        if (copiedFiles) parts.push(`${copiedFiles} file${copiedFiles > 1 ? 's' : ''}`);
        toast.success('Files copied', `Copied ${parts.join(' and ')} from ${source.profileName}.`);
      }
    } catch (err) {
      console.error('Failed to copy project files:', err);
      toast.error('Copy failed', err instanceof Error ? err.message : 'Could not copy files.');
    } finally {
      setCopyingFilesId(null);
    }
  }, [userId, profileId, otherProfiles, projectDocs, handleUpdateProject]);

  const handleOpenDocumentation = useCallback((project: Project) => {
    const projectWithId = ensureProjectId(project);
    // Update the project with an ID if it didn't have one
    if (!project.id) {
      handleUpdateProject(project.name, { id: projectWithId.id });
    }
    setDocumentingProject(projectWithId);
  }, [handleUpdateProject]);

  const handleSaveDocumentation = useCallback(async (docs: ProjectDocumentation) => {
    if (!documentingProject || !userId) return;

    const projectId = documentingProject.id || documentingProject.name;

    await saveProjectDocumentation(
      userId,
      projectId,
      documentingProject.name,
      docs,
      profileId
    );

    setProjectDocs(prev => ({ ...prev, [projectId]: docs }));
    handleUpdateProject(projectId, { hasDocumentation: true });
  }, [documentingProject, userId, profileId, handleUpdateProject]);

  const getDocStats = (projectId: string) => {
    const docs = projectDocs[projectId];
    if (!docs) return null;

    return {
      images: docs.screenshots.length + docs.architectureDiagrams.length,
      documents: docs.documentFiles?.length || 0,
      decisions: docs.technicalDecisions.length,
      challenges: docs.challenges.length,
      metrics: docs.metrics.length,
    };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-400">
          Projects ({projects.length})
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportMtac}
            disabled={isImportingMtac || isAddingNew}
            title="Import the MTAC Intelligence Copilot project and its documentation into this profile"
          >
            {isImportingMtac ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-1" />
            )}
            {isImportingMtac ? 'Importing...' : 'Import MTAC Project'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingNew(true)}
            disabled={isAddingNew}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Project
          </Button>
        </div>
      </div>

      {/* Add New Project Form */}
      {isAddingNew && (
        <div className="p-4 bg-gray-950 border border-blue-800 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-white">New Project</h4>
            <button
              onClick={() => setIsAddingNew(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Name</label>
              <input
                type="text"
                value={newProject.name}
                onChange={e => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Project name"
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Status</label>
              <select
                value={newProject.status}
                onChange={e => setNewProject(prev => ({ ...prev, status: e.target.value as Project['status'] }))}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              >
                <option value="active">Active</option>
                <option value="launched">Launched</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400">Description</label>
            <textarea
              value={newProject.description}
              onChange={e => setNewProject(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description..."
              rows={2}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white resize-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400">Tech Stack (comma separated)</label>
            <input
              type="text"
              value={newProject.techStack?.join(', ')}
              onChange={e => setNewProject(prev => ({
                ...prev,
                techStack: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
              }))}
              placeholder="React, TypeScript, Node.js"
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsAddingNew(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAddProject}
              disabled={!newProject.name?.trim()}
            >
              <Check className="w-4 h-4 mr-1" />
              Add Project
            </Button>
          </div>
        </div>
      )}

      {/* Projects List */}
      {projects.length === 0 && !isAddingNew ? (
        <div className="text-center py-8 text-gray-500 text-sm border border-dashed border-gray-800 rounded-lg">
          <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No projects yet</p>
          <p className="text-xs mt-1">Add projects manually or build from resume</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => {
            const projectId = project.id || project.name;
            const isExpanded = expandedId === projectId;
            const stats = getDocStats(projectId);
            const assetSource = findAssetSourceProfile(otherProfiles, project.name);

            return (
              <div
                key={projectId}
                className="bg-gray-950 border border-gray-800 rounded-lg overflow-hidden"
              >
                {/* Project Header */}
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-900"
                  onClick={() => setExpandedId(isExpanded ? null : projectId)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <FolderOpen className="w-5 h-5 text-blue-400" />
                    ) : (
                      <Folder className="w-5 h-5 text-gray-400" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{project.name}</span>
                        <Badge
                          variant={
                            project.status === 'active' ? 'success' :
                            project.status === 'launched' ? 'primary' : 'default'
                          }
                        >
                          {project.status}
                        </Badge>
                      </div>
                      {project.traction && (
                        <span className="text-xs text-purple-400">{project.traction}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Documentation Stats */}
                    {stats && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {stats.images > 0 && (
                          <span className="flex items-center gap-1">
                            <Image className="w-3 h-3" />
                            {stats.images}
                          </span>
                        )}
                        {stats.documents > 0 && (
                          <span className="flex items-center gap-1">
                            <Files className="w-3 h-3" />
                            {stats.documents}
                          </span>
                        )}
                        {stats.decisions > 0 && (
                          <span className="flex items-center gap-1">
                            <Lightbulb className="w-3 h-3" />
                            {stats.decisions}
                          </span>
                        )}
                        {stats.metrics > 0 && (
                          <span className="flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" />
                            {stats.metrics}
                          </span>
                        )}
                      </div>
                    )}

                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-800">
                    {/* Description */}
                    <div className="p-3 border-b border-gray-800">
                      <p className="text-sm text-gray-400">{project.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {project.techStack.map(tech => (
                          <span
                            key={tech}
                            className="text-[10px] px-1.5 py-0.5 bg-gray-800 rounded text-gray-400"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-3 flex items-center justify-between bg-gray-900/50">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDocumentation(project);
                          }}
                          disabled={!userId}
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          {stats ? 'Edit Documentation' : 'Add Documentation'}
                        </Button>
                        {userId && assetSource && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyFiles(project);
                            }}
                            disabled={copyingFilesId === projectId}
                            title={`Copy uploaded screenshots & files from ${assetSource.profileName}'s "${project.name}"`}
                          >
                            {copyingFilesId === projectId ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Copy className="w-4 h-4 mr-1" />
                            )}
                            {copyingFilesId === projectId
                              ? 'Copying...'
                              : `Copy files from ${assetSource.profileName}`}
                          </Button>
                        )}
                        {!userId && (
                          <span className="text-xs text-yellow-500">
                            Sign in to add documentation
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProject(project);
                          }}
                          className="p-1.5 text-gray-500 hover:text-white rounded hover:bg-gray-800"
                          title="Edit project"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete "${project.name}"?`)) {
                              handleDeleteProject(projectId);
                            }
                          }}
                          className="p-1.5 text-gray-500 hover:text-red-400 rounded hover:bg-gray-800"
                          title="Delete project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Documentation Preview */}
                    {stats && (stats.images > 0 || stats.documents > 0 || stats.decisions > 0 || stats.challenges > 0) && (
                      <div className="p-3 border-t border-gray-800 bg-gray-900/30">
                        <h4 className="text-xs font-medium text-gray-400 mb-2">Documentation</h4>
                        <div className="grid grid-cols-5 gap-2 text-xs">
                          <div className="p-2 bg-gray-800 rounded text-center">
                            <div className="text-lg font-bold text-white">{stats.images}</div>
                            <div className="text-gray-500">Images</div>
                          </div>
                          <div className="p-2 bg-gray-800 rounded text-center">
                            <div className="text-lg font-bold text-white">{stats.documents}</div>
                            <div className="text-gray-500">Docs</div>
                          </div>
                          <div className="p-2 bg-gray-800 rounded text-center">
                            <div className="text-lg font-bold text-white">{stats.decisions}</div>
                            <div className="text-gray-500">Decisions</div>
                          </div>
                          <div className="p-2 bg-gray-800 rounded text-center">
                            <div className="text-lg font-bold text-white">{stats.challenges}</div>
                            <div className="text-gray-500">Challenges</div>
                          </div>
                          <div className="p-2 bg-gray-800 rounded text-center">
                            <div className="text-lg font-bold text-white">{stats.metrics}</div>
                            <div className="text-gray-500">Metrics</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onSave={(updates) => {
            handleUpdateProject(editingProject.id || editingProject.name, updates);
            setEditingProject(null);
          }}
          onClose={() => setEditingProject(null)}
        />
      )}

      {/* Documentation Modal */}
      {documentingProject && userId && (
        <ProjectDocModal
          project={documentingProject}
          documentation={projectDocs[documentingProject.id || documentingProject.name] || DEFAULT_PROJECT_DOCUMENTATION}
          isOpen={true}
          onClose={() => setDocumentingProject(null)}
          onSave={handleSaveDocumentation}
          userId={userId}
          onGenerateAI={onGenerateAI}
        />
      )}
    </div>
  );
};

// ============================================
// Edit Project Modal
// ============================================

interface EditProjectModalProps {
  project: Project;
  onSave: (updates: Partial<Project>) => void;
  onClose: () => void;
}

const EditProjectModal: React.FC<EditProjectModalProps> = ({
  project,
  onSave,
  onClose,
}) => {
  const [form, setForm] = useState({
    name: project.name,
    description: project.description,
    techStack: project.techStack.join(', '),
    status: project.status,
    traction: project.traction || '',
  });

  const handleSave = () => {
    onSave({
      name: form.name.trim(),
      description: form.description,
      techStack: form.techStack.split(',').map(s => s.trim()).filter(Boolean),
      status: form.status,
      traction: form.traction || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="font-semibold text-white">Edit Project</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-400">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(prev => ({ ...prev, status: e.target.value as Project['status'] }))}
                className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white"
              >
                <option value="active">Active</option>
                <option value="launched">Launched</option>
                <option value="paused">Paused</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400">Traction</label>
              <input
                type="text"
                value={form.traction}
                onChange={e => setForm(prev => ({ ...prev, traction: e.target.value }))}
                placeholder="e.g., 1k users"
                className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-400">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-400">Tech Stack (comma separated)</label>
            <input
              type="text"
              value={form.techStack}
              onChange={e => setForm(prev => ({ ...prev, techStack: e.target.value }))}
              className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-800">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProjectsSection;
