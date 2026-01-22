import React, { useState, useRef, useEffect } from 'react';
import { toast } from '@/src/stores';
import { useProfileData } from '@/src/hooks/useProfileData';
import { processDocuments, categorizeSkills } from '@/src/services/gemini';
import { Button, Input, Textarea, Card, CardHeader, CardContent, Badge, Select, EditableText, EditableList } from '@/src/components/ui';
import { ProfileEmptyState } from '@/src/components/shared';
import { ProfileManagement, SkillGroupManager } from '@/src/components/profile';
import { cn } from '@/src/lib/utils';
import type { UserProfile, Achievement, Role, Project, SkillGroup } from '@/src/types';
import {
  User,
  Upload,
  Save,
  Plus,
  Trash2,
  Briefcase,
  Code,
  Heart,
  Target,
  DollarSign,
  Clock,
  Sparkles,
  FileText,
  ChevronDown,
  ChevronUp,
  Users,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  GripVertical,
  Cloud,
  CloudOff,
  Loader2,
  FolderKanban,
  Tags,
  Linkedin,
  Github,
  Globe,
  Link2,
  X,
} from 'lucide-react';
import { ProjectsSection } from '@/src/components/portfolio';
import { useAuth } from '@/src/lib/supabase';

/**
 * Parse a duration string and extract the end date for sorting
 */
function parseDurationEndDate(duration: string): Date {
  const now = new Date();
  const normalizedDuration = duration.toLowerCase();

  if (normalizedDuration.includes('present') || normalizedDuration.includes('current')) {
    return now;
  }

  const parts = duration.split(/\s*[-–]\s*/);
  const endPart = parts.length > 1 ? parts[1].trim() : parts[0].trim();

  const months: Record<string, number> = {
    january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
    april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
    august: 7, aug: 7, september: 8, sep: 8, sept: 8,
    october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11,
  };

  const monthYearMatch = endPart.match(/([a-zA-Z]+)\s+(\d{4})/);
  if (monthYearMatch) {
    const month = months[monthYearMatch[1].toLowerCase()];
    const year = parseInt(monthYearMatch[2], 10);
    if (month !== undefined && !isNaN(year)) {
      return new Date(year, month, 1);
    }
  }

  const yearMatch = endPart.match(/(\d{4})/);
  if (yearMatch) {
    return new Date(parseInt(yearMatch[1], 10), 11, 31);
  }

  return new Date(1970, 0, 1);
}

/**
 * Sort roles by end date (most recent first)
 */
function sortRolesByDate(roles: Role[]): Role[] {
  return [...roles].sort((a, b) => {
    const dateA = parseDurationEndDate(a.duration);
    const dateB = parseDurationEndDate(b.duration);
    return dateB.getTime() - dateA.getTime();
  });
}

/**
 * Normalize skills by splitting grouped skills into individual items
 * Handles patterns like "Category: skill1, skill2" or "skill1, skill2, skill3"
 */
function normalizeSkills(skills: string[]): string[] {
  const normalized: string[] = [];

  for (const skill of skills) {
    // Check if skill contains a category prefix (e.g., "AI/ML & Generative AI: skill1, skill2")
    const colonIndex = skill.indexOf(':');
    if (colonIndex > -1) {
      // Extract everything after the colon and split by comma
      const skillsPart = skill.substring(colonIndex + 1);
      const individualSkills = skillsPart.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 0);
      normalized.push(...individualSkills);
    } else if (skill.includes(',')) {
      // Split comma-separated skills
      const individualSkills = skill.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 0);
      normalized.push(...individualSkills);
    } else {
      // Single skill, add as-is
      const trimmed = skill.trim();
      if (trimmed.length > 0) {
        normalized.push(trimmed);
      }
    }
  }

  // Remove duplicates while preserving order
  return [...new Set(normalized)];
}

/**
 * Check if skills array has grouped skills that need normalization
 */
function hasGroupedSkills(skills: string[]): boolean {
  return skills.some(skill => skill.includes(':') || skill.includes(','));
}

const workStyleOptions = [
  { value: 'remote' as const, label: 'Remote' },
  { value: 'hybrid' as const, label: 'Hybrid' },
  { value: 'onsite' as const, label: 'On-site' },
];

export const ProfilePage: React.FC = () => {
  const { profile, activeProfile: activeProfileWithMeta, isLoading, isAuthenticated, actions, error } = useProfileData();
  const { updateProfile } = actions;
  const { user } = useAuth();

  // Compute profile completeness locally
  const isProfileComplete = () => {
    return (
      profile.name.trim() !== '' &&
      profile.name !== 'Senior Engineer' &&
      profile.headline.trim() !== '' &&
      profile.technicalSkills.length > 0 &&
      profile.yearsExperience > 0
    );
  };

  const [activeSection, setActiveSection] = useState<string | null>('basic');
  const [isImporting, setIsImporting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local state for editing
  const [editedProfile, setEditedProfile] = useState<UserProfile>(profile);

  // Reset edited profile when active profile changes
  useEffect(() => {
    setEditedProfile(profile);
    setHasChanges(false);
  }, [activeProfileWithMeta?.metadata.id]);

  const handleFieldChange = <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => {
    setEditedProfile((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleNestedChange = <K extends keyof UserProfile>(
    field: K,
    nestedField: string,
    value: unknown
  ) => {
    setEditedProfile((prev) => ({
      ...prev,
      [field]: {
        ...(prev[field] as object),
        [nestedField]: value,
      },
    }));
    setHasChanges(true);
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile(editedProfile);
      setHasChanges(false);
      toast.success('Profile saved', isAuthenticated ? 'Synced to cloud' : 'Saved locally');
    } catch (err) {
      toast.error('Save failed', err instanceof Error ? err.message : 'Please try again');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportResume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsImporting(true);
    try {
      // Convert FileList to array and pass all files - processDocuments handles text vs binary
      const fileArray = Array.from(files);
      const result = await processDocuments(fileArray);

      if (result) {
        // Merge with existing profile
        setEditedProfile((prev) => ({
          ...prev,
          ...result,
          // Preserve existing preferences if not in result
          preferences: {
            ...prev.preferences,
            ...result.preferences,
          },
          freelanceProfile: {
            ...prev.freelanceProfile,
            ...result.freelanceProfile,
          },
        }));
        setHasChanges(true);
        const fileCount = fileArray.length;
        toast.success(
          `${fileCount} document${fileCount > 1 ? 's' : ''} imported`,
          'Profile updated from your documents'
        );
      }
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Import failed', 'Could not parse your documents');
    } finally {
      setIsImporting(false);
      // Reset file input so the same files can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  // Skill input handlers
  const [skillInput, setSkillInput] = useState('');
  const addSkill = (type: 'technicalSkills' | 'softSkills') => {
    if (skillInput.trim() && !editedProfile[type].includes(skillInput.trim())) {
      handleFieldChange(type, [...editedProfile[type], skillInput.trim()]);
      setSkillInput('');
    }
  };
  const removeSkill = (type: 'technicalSkills' | 'softSkills', skill: string) => {
    handleFieldChange(
      type,
      editedProfile[type].filter((s) => s !== skill)
    );
  };

  // Skill group handlers
  const [isAutoCategorizing, setIsAutoCategorizing] = useState(false);

  const handleSkillGroupsChange = (groups: SkillGroup[]) => {
    handleFieldChange('skillGroups', groups);
  };

  const handleAutoCategorizeTechnical = async () => {
    if (editedProfile.technicalSkills.length === 0) {
      toast.error('No skills', 'Add some technical skills first');
      return;
    }

    setIsAutoCategorizing(true);
    try {
      const groups = await categorizeSkills(editedProfile.technicalSkills);
      handleFieldChange('skillGroups', groups);
      toast.success('Skills categorized', `Created ${groups.length} skill groups`);
    } catch (error) {
      console.error('Auto-categorize failed:', error);
      toast.error('Categorization failed', 'Could not auto-categorize skills');
    } finally {
      setIsAutoCategorizing(false);
    }
  };

  // Preference input handlers
  const [targetRoleInput, setTargetRoleInput] = useState('');
  const [dealBreakerInput, setDealBreakerInput] = useState('');
  const [uspInput, setUspInput] = useState('');
  const [projectTypeInput, setProjectTypeInput] = useState('');

  const addTargetRole = () => {
    if (targetRoleInput.trim() && !editedProfile.preferences.targetRoles.includes(targetRoleInput.trim())) {
      handleNestedChange('preferences', 'targetRoles', [...editedProfile.preferences.targetRoles, targetRoleInput.trim()]);
      setTargetRoleInput('');
    }
  };
  const removeTargetRole = (role: string) => {
    handleNestedChange('preferences', 'targetRoles', editedProfile.preferences.targetRoles.filter((r) => r !== role));
  };

  const addDealBreaker = () => {
    if (dealBreakerInput.trim() && !editedProfile.preferences.dealBreakers.includes(dealBreakerInput.trim())) {
      handleNestedChange('preferences', 'dealBreakers', [...editedProfile.preferences.dealBreakers, dealBreakerInput.trim()]);
      setDealBreakerInput('');
    }
  };
  const removeDealBreaker = (item: string) => {
    handleNestedChange('preferences', 'dealBreakers', editedProfile.preferences.dealBreakers.filter((d) => d !== item));
  };

  const addUSP = () => {
    if (uspInput.trim() && !editedProfile.freelanceProfile.uniqueSellingPoints.includes(uspInput.trim())) {
      handleNestedChange('freelanceProfile', 'uniqueSellingPoints', [...editedProfile.freelanceProfile.uniqueSellingPoints, uspInput.trim()]);
      setUspInput('');
    }
  };
  const removeUSP = (usp: string) => {
    handleNestedChange('freelanceProfile', 'uniqueSellingPoints', editedProfile.freelanceProfile.uniqueSellingPoints.filter((u) => u !== usp));
  };

  const addProjectType = () => {
    if (projectTypeInput.trim() && !editedProfile.freelanceProfile.preferredProjectTypes.includes(projectTypeInput.trim())) {
      handleNestedChange('freelanceProfile', 'preferredProjectTypes', [...editedProfile.freelanceProfile.preferredProjectTypes, projectTypeInput.trim()]);
      setProjectTypeInput('');
    }
  };
  const removeProjectType = (type: string) => {
    handleNestedChange('freelanceProfile', 'preferredProjectTypes', editedProfile.freelanceProfile.preferredProjectTypes.filter((t) => t !== type));
  };

  // Show loading state for authenticated users while data is being fetched
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <User className="w-6 h-6 text-blue-500" />
              My Profile
              {activeProfileWithMeta && (
                <span
                  className="text-sm font-normal px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${activeProfileWithMeta.metadata.color || '#3B82F6'}20`,
                    color: activeProfileWithMeta.metadata.color || '#3B82F6',
                  }}
                >
                  {activeProfileWithMeta.metadata.name}
                </span>
              )}
              {/* Sync status indicator */}
              {isAuthenticated ? (
                <span className="flex items-center gap-1 text-xs text-green-400" title="Synced to cloud">
                  <Cloud className="w-3 h-3" />
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-gray-500" title="Local storage only">
                  <CloudOff className="w-3 h-3" />
                </span>
              )}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Your profile powers AI analysis and interview prep
              {!isAuthenticated && ' (sign in to sync across devices)'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.md,.txt"
              multiple
              className="hidden"
              onChange={handleImportResume}
              disabled={isImporting}
              aria-label="Import resume and profile documents"
            />
            <Button
              variant="secondary"
              leftIcon={isImporting ? <Sparkles className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              disabled={isImporting}
              onClick={() => fileInputRef.current?.click()}
            >
              {isImporting ? 'Importing...' : 'Import Documents'}
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              leftIcon={isSaving ? <Sparkles className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Profile Management Section */}
        <ProfileSection
          title="Manage Profiles"
          icon={<Users className="w-4 h-4" />}
          isOpen={activeSection === 'profiles'}
          onToggle={() => toggleSection('profiles')}
        >
          <ProfileManagement />
        </ProfileSection>

        {/* Profile Completion */}
        {!isProfileComplete() && (
          <Card className="border-yellow-800 bg-yellow-900/10">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-yellow-900/50 flex items-center justify-center">
                <Target className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-yellow-300">Complete Your Profile</h4>
                <p className="text-sm text-yellow-400/70">
                  A complete profile helps AI provide better job fit analysis and interview coaching
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Basic Info */}
        <ProfileSection
          title="Basic Information"
          icon={<User className="w-4 h-4" />}
          isOpen={activeSection === 'basic'}
          onToggle={() => toggleSection('basic')}
        >
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Name"
                value={editedProfile.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="Your name"
              />
              <Input
                label="Professional Headline"
                value={editedProfile.headline}
                onChange={(e) => handleFieldChange('headline', e.target.value)}
                placeholder="e.g. Senior Software Engineer"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Email"
                type="email"
                value={editedProfile.email || ''}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                placeholder="your@email.com"
              />
              <Input
                label="Phone"
                type="tel"
                value={editedProfile.phone || ''}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            {/* Professional Links */}
            <Card className="bg-gray-800/30">
              <CardContent className="p-4">
                <h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-blue-400" />
                  Professional Links
                </h4>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-1">
                    <label className="text-sm text-gray-400 flex items-center gap-1.5">
                      <Linkedin className="w-3.5 h-3.5 text-blue-500" />
                      LinkedIn
                    </label>
                    <Input
                      type="url"
                      value={editedProfile.linkedinUrl || ''}
                      onChange={(e) => handleFieldChange('linkedinUrl', e.target.value)}
                      placeholder="https://linkedin.com/in/yourprofile"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gray-400 flex items-center gap-1.5">
                      <Github className="w-3.5 h-3.5" />
                      GitHub
                    </label>
                    <Input
                      type="url"
                      value={editedProfile.githubUrl || ''}
                      onChange={(e) => handleFieldChange('githubUrl', e.target.value)}
                      placeholder="https://github.com/yourusername"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-1">
                    <label className="text-sm text-gray-400 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-green-400" />
                      Portfolio
                    </label>
                    <Input
                      type="url"
                      value={editedProfile.portfolioUrl || ''}
                      onChange={(e) => handleFieldChange('portfolioUrl', e.target.value)}
                      placeholder="https://yourportfolio.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gray-400 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-purple-400" />
                      Personal Website
                    </label>
                    <Input
                      type="url"
                      value={editedProfile.websiteUrl || ''}
                      onChange={(e) => handleFieldChange('websiteUrl', e.target.value)}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                </div>

                {/* Other Links */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400">Other Links</label>
                  {(editedProfile.otherLinks || []).map((link, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input
                        value={link.label}
                        onChange={(e) => {
                          const newLinks = [...(editedProfile.otherLinks || [])];
                          newLinks[idx] = { ...newLinks[idx], label: e.target.value };
                          handleFieldChange('otherLinks', newLinks);
                        }}
                        placeholder="Label (e.g., Dribbble)"
                        className="w-1/3"
                      />
                      <Input
                        type="url"
                        value={link.url}
                        onChange={(e) => {
                          const newLinks = [...(editedProfile.otherLinks || [])];
                          newLinks[idx] = { ...newLinks[idx], url: e.target.value };
                          handleFieldChange('otherLinks', newLinks);
                        }}
                        placeholder="https://..."
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newLinks = (editedProfile.otherLinks || []).filter((_, i) => i !== idx);
                          handleFieldChange('otherLinks', newLinks);
                        }}
                        className="text-gray-500 hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newLinks = [...(editedProfile.otherLinks || []), { label: '', url: '' }];
                      handleFieldChange('otherLinks', newLinks);
                    }}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    Add another link
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Years of Experience"
                type="number"
                value={editedProfile.yearsExperience.toString()}
                onChange={(e) => handleFieldChange('yearsExperience', parseInt(e.target.value) || 0)}
              />
              <div className="space-y-1">
                <label className="text-sm text-gray-400">Preferred Work Style</label>
                <div className="flex flex-wrap gap-3 pt-1">
                  {workStyleOptions.map((option) => {
                    const isSelected = (editedProfile.preferences.workStyle || []).includes(option.value);
                    return (
                      <label
                        key={option.value}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors',
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                            : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            const current = editedProfile.preferences.workStyle || [];
                            const updated = isSelected
                              ? current.filter((v) => v !== option.value)
                              : [...current, option.value];
                            handleNestedChange('preferences', 'workStyle', updated);
                          }}
                          className="sr-only"
                        />
                        <span className="text-sm">{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <Textarea
              label="Current Situation"
              value={editedProfile.currentSituation}
              onChange={(e) => handleFieldChange('currentSituation', e.target.value)}
              placeholder="Briefly describe your current career situation and what you're looking for (for AI personalization)..."
              rows={3}
              hint="Used for AI recommendations, NOT shown on resume"
            />
            <Textarea
              label="Professional Summary"
              value={editedProfile.generatedSummary || ''}
              onChange={(e) => handleFieldChange('generatedSummary', e.target.value)}
              placeholder="A professional summary for your resume. This will appear at the top of your downloaded resume. Can be generated via Resume Builder."
              rows={4}
              hint="Shown on resume PDF - generate via Resume Builder or write your own"
            />
          </div>
        </ProfileSection>

        {/* Skills */}
        <ProfileSection
          title="Skills"
          icon={<Code className="w-4 h-4" />}
          isOpen={activeSection === 'skills'}
          onToggle={() => toggleSection('skills')}
        >
          <div className="space-y-6">
            {/* Fix Grouped Skills Warning */}
            {hasGroupedSkills(editedProfile.technicalSkills) && (
              <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-amber-400 font-medium">Grouped skills detected</p>
                    <p className="text-xs text-amber-400/70 mt-1">
                      Some skills are grouped together (e.g., "Category: skill1, skill2"). Click "Fix Skills" to split them into individual items for better resume formatting.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-500 text-white border-amber-500"
                    onClick={() => {
                      const normalizedTechnical = normalizeSkills(editedProfile.technicalSkills);
                      const normalizedSoft = normalizeSkills(editedProfile.softSkills);
                      handleFieldChange('technicalSkills', normalizedTechnical);
                      handleFieldChange('softSkills', normalizedSoft);
                      toast.success('Skills fixed', `Split into ${normalizedTechnical.length} technical and ${normalizedSoft.length} soft skills`);
                    }}
                  >
                    Fix Skills
                  </Button>
                </div>
              </div>
            )}

            {/* Technical Skills */}
            <div>
              <label className="text-sm text-gray-400 block mb-2">Technical Skills</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {editedProfile.technicalSkills.map((skill) => (
                  <Badge
                    key={skill}
                    variant="info"
                    className="cursor-pointer hover:bg-red-900/30"
                    onClick={() => removeSkill('technicalSkills', skill)}
                  >
                    {skill} ×
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  placeholder="Add a skill..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSkill('technicalSkills');
                    }
                  }}
                />
                <Button variant="ghost" onClick={() => addSkill('technicalSkills')}>
                  Add
                </Button>
              </div>
            </div>

            {/* Soft Skills */}
            <div>
              <label className="text-sm text-gray-400 block mb-2">Soft Skills</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {editedProfile.softSkills.map((skill) => (
                  <Badge
                    key={skill}
                    variant="default"
                    className="cursor-pointer hover:bg-red-900/30"
                    onClick={() => removeSkill('softSkills', skill)}
                  >
                    {skill} ×
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  placeholder="Add a soft skill..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSkill('softSkills');
                    }
                  }}
                />
                <Button variant="ghost" onClick={() => addSkill('softSkills')}>
                  Add
                </Button>
              </div>
            </div>
          </div>
        </ProfileSection>

        {/* Skill Groups */}
        <ProfileSection
          title="Organize Skills"
          icon={<Tags className="w-4 h-4" />}
          isOpen={activeSection === 'skillGroups'}
          onToggle={() => toggleSection('skillGroups')}
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Organize your technical skills into groups for a better resume layout. Drag skills between groups or use AI to auto-categorize.
            </p>
            <SkillGroupManager
              technicalSkills={editedProfile.technicalSkills}
              softSkills={editedProfile.softSkills}
              skillGroups={editedProfile.skillGroups || []}
              onSkillGroupsChange={handleSkillGroupsChange}
              onAutoCategorizeTechnical={handleAutoCategorizeTechnical}
              isAutoCategorizing={isAutoCategorizing}
            />
          </div>
        </ProfileSection>

        {/* Work History */}
        <ProfileSection
          title="Work History"
          icon={<Briefcase className="w-4 h-4" />}
          isOpen={activeSection === 'work'}
          onToggle={() => toggleSection('work')}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">
                Click any field to edit. Use arrows to reorder.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const sorted = sortRolesByDate(editedProfile.recentRoles);
                  handleFieldChange('recentRoles', sorted);
                  toast.success('Sorted', 'Work history sorted by date (most recent first)');
                }}
                className="text-xs text-blue-400 hover:text-blue-300"
                leftIcon={<ArrowUpDown className="w-3 h-3" />}
              >
                Sort by Date
              </Button>
            </div>
            {editedProfile.recentRoles.map((role, index) => (
              <Card key={index} className="bg-gray-800/30">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    {/* Reorder buttons */}
                    <div className="flex flex-col gap-1 mr-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-1 h-6 w-6"
                        disabled={index === 0}
                        onClick={() => {
                          const newRoles = [...editedProfile.recentRoles];
                          [newRoles[index - 1], newRoles[index]] = [newRoles[index], newRoles[index - 1]];
                          handleFieldChange('recentRoles', newRoles);
                        }}
                        title="Move up"
                      >
                        <ArrowUp className={cn('w-3 h-3', index === 0 ? 'text-gray-600' : 'text-gray-400')} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-1 h-6 w-6"
                        disabled={index === editedProfile.recentRoles.length - 1}
                        onClick={() => {
                          const newRoles = [...editedProfile.recentRoles];
                          [newRoles[index], newRoles[index + 1]] = [newRoles[index + 1], newRoles[index]];
                          handleFieldChange('recentRoles', newRoles);
                        }}
                        title="Move down"
                      >
                        <ArrowDown className={cn('w-3 h-3', index === editedProfile.recentRoles.length - 1 ? 'text-gray-600' : 'text-gray-400')} />
                      </Button>
                    </div>
                    <div className="flex-1 mr-4">
                      <EditableText
                        value={role.title}
                        onChange={(value) => {
                          const newRoles = [...editedProfile.recentRoles];
                          newRoles[index] = { ...newRoles[index], title: value };
                          handleFieldChange('recentRoles', newRoles);
                        }}
                        className="font-medium text-white"
                        placeholder="Job title..."
                      />
                      <div className="flex items-center gap-1 text-sm text-gray-400">
                        <EditableText
                          value={role.company}
                          onChange={(value) => {
                            const newRoles = [...editedProfile.recentRoles];
                            newRoles[index] = { ...newRoles[index], company: value };
                            handleFieldChange('recentRoles', newRoles);
                          }}
                          className="text-gray-400"
                          placeholder="Company name..."
                        />
                        <span className="text-gray-600">•</span>
                        <EditableText
                          value={role.duration}
                          onChange={(value) => {
                            const newRoles = [...editedProfile.recentRoles];
                            newRoles[index] = { ...newRoles[index], duration: value };
                            handleFieldChange('recentRoles', newRoles);
                          }}
                          className="text-gray-400"
                          placeholder="Duration (e.g., Jan 2020 - Present)..."
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newRoles = editedProfile.recentRoles.filter((_, i) => i !== index);
                        handleFieldChange('recentRoles', newRoles);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                  <div className="mt-2 ml-9">
                    <EditableList
                      items={role.highlights}
                      onChange={(highlights) => {
                        const newRoles = [...editedProfile.recentRoles];
                        newRoles[index] = { ...newRoles[index], highlights };
                        handleFieldChange('recentRoles', newRoles);
                      }}
                      bulletStyle="disc"
                      itemClassName="text-sm text-gray-300"
                      addLabel="+ Add highlight"
                      placeholder="Enter achievement or responsibility..."
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button
              variant="ghost"
              onClick={() => {
                const newRole: Role = {
                  company: 'New Company',
                  title: 'New Position',
                  duration: 'Start - End',
                  highlights: ['Add your achievements here'],
                };
                handleFieldChange('recentRoles', [...editedProfile.recentRoles, newRole]);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Role
            </Button>
          </div>
        </ProfileSection>

        {/* Projects */}
        <ProfileSection
          title="Projects & Portfolio"
          icon={<FolderKanban className="w-4 h-4" />}
          isOpen={activeSection === 'projects'}
          onToggle={() => toggleSection('projects')}
        >
          <ProjectsSection
            projects={editedProfile.projects || []}
            onUpdateProjects={(projects) => handleFieldChange('projects', projects)}
            userId={user?.id}
            profileId={activeProfileWithMeta?.metadata.id}
          />
        </ProfileSection>

        {/* Preferences */}
        <ProfileSection
          title="Job Preferences"
          icon={<Heart className="w-4 h-4" />}
          isOpen={activeSection === 'preferences'}
          onToggle={() => toggleSection('preferences')}
        >
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Minimum Salary"
                type="number"
                value={editedProfile.preferences.salaryRange.min.toString()}
                onChange={(e) =>
                  handleNestedChange('preferences', 'salaryRange', {
                    ...editedProfile.preferences.salaryRange,
                    min: parseInt(e.target.value) || 0,
                  })
                }
                leftIcon={<DollarSign className="w-4 h-4" />}
              />
              <Input
                label="Maximum Salary"
                type="number"
                value={editedProfile.preferences.salaryRange.max.toString()}
                onChange={(e) =>
                  handleNestedChange('preferences', 'salaryRange', {
                    ...editedProfile.preferences.salaryRange,
                    max: parseInt(e.target.value) || 0,
                  })
                }
                leftIcon={<DollarSign className="w-4 h-4" />}
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-2">Target Roles</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {editedProfile.preferences.targetRoles.map((role, i) => (
                  <Badge
                    key={i}
                    variant="info"
                    className="cursor-pointer hover:bg-red-900/30"
                    onClick={() => removeTargetRole(role)}
                  >
                    {role} ×
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={targetRoleInput}
                  onChange={(e) => setTargetRoleInput(e.target.value)}
                  placeholder="Add target role (e.g., Senior Software Engineer)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTargetRole();
                    }
                  }}
                />
                <Button variant="ghost" onClick={addTargetRole}>
                  Add
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-2">Deal Breakers</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {editedProfile.preferences.dealBreakers.map((item, i) => (
                  <Badge
                    key={i}
                    variant="danger"
                    className="cursor-pointer hover:bg-red-900/50"
                    onClick={() => removeDealBreaker(item)}
                  >
                    {item} ×
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={dealBreakerInput}
                  onChange={(e) => setDealBreakerInput(e.target.value)}
                  placeholder="Add deal breaker (e.g., No remote option)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addDealBreaker();
                    }
                  }}
                />
                <Button variant="ghost" onClick={addDealBreaker}>
                  Add
                </Button>
              </div>
            </div>
          </div>
        </ProfileSection>

        {/* Freelance Profile */}
        <ProfileSection
          title="Freelance Profile"
          icon={<Clock className="w-4 h-4" />}
          isOpen={activeSection === 'freelance'}
          onToggle={() => toggleSection('freelance')}
        >
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Min Hourly Rate"
                type="number"
                value={editedProfile.freelanceProfile.hourlyRate.min.toString()}
                onChange={(e) =>
                  handleNestedChange('freelanceProfile', 'hourlyRate', {
                    ...editedProfile.freelanceProfile.hourlyRate,
                    min: parseInt(e.target.value) || 0,
                  })
                }
                leftIcon={<DollarSign className="w-4 h-4" />}
              />
              <Input
                label="Max Hourly Rate"
                type="number"
                value={editedProfile.freelanceProfile.hourlyRate.max.toString()}
                onChange={(e) =>
                  handleNestedChange('freelanceProfile', 'hourlyRate', {
                    ...editedProfile.freelanceProfile.hourlyRate,
                    max: parseInt(e.target.value) || 0,
                  })
                }
                leftIcon={<DollarSign className="w-4 h-4" />}
              />
            </div>
            <Input
              label="Available Hours"
              value={editedProfile.freelanceProfile.availableHours}
              onChange={(e) => handleNestedChange('freelanceProfile', 'availableHours', e.target.value)}
              placeholder="e.g. 20 hrs/week"
            />
            <div>
              <label className="text-sm text-gray-400 block mb-2">Preferred Project Types</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {editedProfile.freelanceProfile.preferredProjectTypes.map((type, i) => (
                  <Badge
                    key={i}
                    variant="info"
                    className="cursor-pointer hover:bg-red-900/30"
                    onClick={() => removeProjectType(type)}
                  >
                    {type} ×
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={projectTypeInput}
                  onChange={(e) => setProjectTypeInput(e.target.value)}
                  placeholder="Add project type (e.g., API Development)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addProjectType();
                    }
                  }}
                />
                <Button variant="ghost" onClick={addProjectType}>
                  Add
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-2">Unique Selling Points</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {editedProfile.freelanceProfile.uniqueSellingPoints.map((usp, i) => (
                  <Badge
                    key={i}
                    variant="success"
                    className="cursor-pointer hover:bg-red-900/30"
                    onClick={() => removeUSP(usp)}
                  >
                    {usp} ×
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={uspInput}
                  onChange={(e) => setUspInput(e.target.value)}
                  placeholder="Add selling point (e.g., 10+ years enterprise experience)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addUSP();
                    }
                  }}
                />
                <Button variant="ghost" onClick={addUSP}>
                  Add
                </Button>
              </div>
            </div>
          </div>
        </ProfileSection>
      </div>
    </div>
  );
};

// Profile Section Component
interface ProfileSectionProps {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({
  title,
  icon,
  isOpen,
  onToggle,
  children,
}) => (
  <Card>
    <button
      onClick={onToggle}
      className="w-full p-4 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
    >
      <div className="flex items-center gap-2 font-semibold text-white">
        {icon}
        {title}
      </div>
      {isOpen ? (
        <ChevronUp className="w-5 h-5 text-gray-500" />
      ) : (
        <ChevronDown className="w-5 h-5 text-gray-500" />
      )}
    </button>
    {isOpen && (
      <CardContent className="p-4 pt-0 border-t border-gray-800">{children}</CardContent>
    )}
  </Card>
);

export default ProfilePage;
