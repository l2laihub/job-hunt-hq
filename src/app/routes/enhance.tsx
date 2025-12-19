import React, { useState, useMemo } from 'react';
import {
  useProfileStore,
  useCurrentProfile,
  useActiveProfileId,
  useAnalyzedJobsStore,
  useEnhancementsStore,
  toast,
} from '@/src/stores';
import { enhanceResume, processDocuments } from '@/src/services/gemini';
import { downloadResumePDF, previewResumeHTML } from '@/src/lib/resume-pdf';
import { Button, Card, CardHeader, CardContent, Badge, Abbr, EditableText, EditableList } from '@/src/components/ui';
import { cn, formatDate } from '@/src/lib/utils';
import { ENHANCEMENT_MODES, SUGGESTION_TYPES, IMPACT_LEVELS } from '@/src/lib/constants';
import type {
  EnhancementMode,
  ResumeEnhancement,
  ResumeAnalysis,
  EnhancementSuggestion,
  EnhancedProfile,
  UserProfile,
} from '@/src/types';
import {
  Sparkles,
  Target,
  Loader2,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  FileText,
  Briefcase,
  Code,
  Trophy,
  User,
  TrendingUp,
  Eye,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Lightbulb,
  Download,
  FileDown,
  History,
  Trash2,
  FileType,
  Palette,
  Clock,
  Upload,
  FileUp,
  UserPlus,
  ExternalLink,
} from 'lucide-react';

// Source of data for enhancement
type EnhanceSource = 'profile' | 'upload';
type UploadAction = 'enhance-only' | 'import-and-enhance';

// Resume download format types
type DownloadFormat = 'markdown' | 'text' | 'json' | 'pdf';
type PDFTemplate = 'professional' | 'modern' | 'minimal' | 'executive';

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
function sortRolesByDate<T extends { duration: string }>(roles: T[]): T[] {
  return [...roles].sort((a, b) => {
    const dateA = parseDurationEndDate(a.duration);
    const dateB = parseDurationEndDate(b.duration);
    return dateB.getTime() - dateA.getTime();
  });
}

// Generate resume content in different formats
const generateResumeContent = (
  enhanced: EnhancedProfile,
  profile: any,
  analysis: ResumeAnalysis | null,
  format: DownloadFormat,
  jobInfo?: { company?: string; role?: string }
): string => {
  const timestamp = new Date().toLocaleDateString();

  // Sort roles by date (most recent first) for all formats
  const sortedRoles = sortRolesByDate(enhanced.recentRoles);

  if (format === 'json') {
    return JSON.stringify(
      {
        generatedAt: timestamp,
        targetJob: jobInfo,
        profile: {
          name: profile.name,
          headline: enhanced.headline,
          summary: enhanced.summary,
          technicalSkills: enhanced.technicalSkills,
          softSkills: enhanced.softSkills,
          experience: sortedRoles.map((role) => ({
            company: role.company,
            title: role.title,
            duration: role.duration,
            highlights: role.enhancedHighlights,
          })),
          achievements: enhanced.keyAchievements,
        },
        scores: analysis
          ? {
              overall: analysis.overallScore,
              ats: analysis.atsScore,
            }
          : null,
      },
      null,
      2
    );
  }

  if (format === 'markdown') {
    let content = `# ${profile.name}\n\n`;
    content += `**${enhanced.headline}**\n\n`;
    if (profile.email || profile.phone) {
      content += `${[profile.email, profile.phone].filter(Boolean).join(' • ')}\n\n`;
    }

    if (enhanced.summary) {
      content += `## Summary\n\n${enhanced.summary}\n\n`;
    }

    if (jobInfo?.role && jobInfo?.company) {
      content += `> *Tailored for: ${jobInfo.role} at ${jobInfo.company}*\n\n`;
    }

    if (analysis) {
      content += `---\n\n`;
      content += `**Resume Scores:** Overall: ${analysis.overallScore}/100 | ATS: ${analysis.atsScore}/100\n\n`;
    }

    content += `## Technical Skills\n\n`;
    content += enhanced.technicalSkills.map((s) => `- ${s}`).join('\n');
    content += `\n\n`;

    if (enhanced.softSkills.length > 0) {
      content += `## Soft Skills\n\n`;
      content += enhanced.softSkills.map((s) => `- ${s}`).join('\n');
      content += `\n\n`;
    }

    content += `## Experience\n\n`;
    sortedRoles.forEach((role) => {
      content += `### ${role.title}\n`;
      content += `**${role.company}** | ${role.duration}\n\n`;
      role.enhancedHighlights.forEach((h) => {
        content += `- ${h}\n`;
      });
      content += `\n`;
    });

    if (enhanced.keyAchievements && enhanced.keyAchievements.length > 0) {
      content += `## Key Achievements\n\n`;
      enhanced.keyAchievements.forEach((a) => {
        content += `- **${a.description}**`;
        if (a.metrics) content += ` (${a.metrics})`;
        content += `\n`;
      });
    }

    return content;
  }

  // Plain text format
  let content = `${profile.name.toUpperCase()}\n`;
  content += `${'='.repeat(profile.name.length)}\n\n`;
  content += `${enhanced.headline}\n`;
  if (profile.email || profile.phone) {
    content += `${[profile.email, profile.phone].filter(Boolean).join(' | ')}\n`;
  }
  content += `\n`;

  if (enhanced.summary) {
    content += `SUMMARY\n${'-'.repeat(7)}\n${enhanced.summary}\n\n`;
  }

  if (jobInfo?.role && jobInfo?.company) {
    content += `[Tailored for: ${jobInfo.role} at ${jobInfo.company}]\n\n`;
  }

  if (analysis) {
    content += `Resume Scores: Overall: ${analysis.overallScore}/100 | ATS: ${analysis.atsScore}/100\n\n`;
  }

  content += `TECHNICAL SKILLS\n${'-'.repeat(16)}\n`;
  content += enhanced.technicalSkills.join(', ');
  content += `\n\n`;

  if (enhanced.softSkills.length > 0) {
    content += `SOFT SKILLS\n${'-'.repeat(11)}\n`;
    content += enhanced.softSkills.join(', ');
    content += `\n\n`;
  }

  content += `EXPERIENCE\n${'-'.repeat(10)}\n\n`;
  sortedRoles.forEach((role) => {
    content += `${role.title}\n`;
    content += `${role.company} | ${role.duration}\n`;
    role.enhancedHighlights.forEach((h) => {
      content += `  • ${h}\n`;
    });
    content += `\n`;
  });

  if (enhanced.keyAchievements && enhanced.keyAchievements.length > 0) {
    content += `KEY ACHIEVEMENTS\n${'-'.repeat(16)}\n`;
    enhanced.keyAchievements.forEach((a) => {
      content += `  • ${a.description}`;
      if (a.metrics) content += ` (${a.metrics})`;
      content += `\n`;
    });
  }

  return content;
};

// Trigger file download
const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Score display component
const ScoreDisplay: React.FC<{ score: number; label: string; size?: 'sm' | 'lg' }> = ({
  score,
  label,
  size = 'sm',
}) => {
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-green-400';
    if (s >= 60) return 'text-yellow-400';
    if (s >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBg = (s: number) => {
    if (s >= 80) return 'bg-green-900/30';
    if (s >= 60) return 'bg-yellow-900/30';
    if (s >= 40) return 'bg-orange-900/30';
    return 'bg-red-900/30';
  };

  // Render label with Abbr for known abbreviations
  const renderLabel = () => {
    if (label.includes('ATS')) {
      const parts = label.split('ATS');
      return (
        <>
          {parts[0]}<Abbr variant="subtle">ATS</Abbr>{parts[1]}
        </>
      );
    }
    return label;
  };

  return (
    <div className={cn('flex flex-col items-center', size === 'lg' ? 'gap-2' : 'gap-1')}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-bold',
          getScoreBg(score),
          getScoreColor(score),
          size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-12 h-12 text-sm'
        )}
      >
        {score}
      </div>
      <span className={cn('text-gray-400', size === 'lg' ? 'text-sm' : 'text-xs')}>{renderLabel()}</span>
    </div>
  );
};

// Suggestion card component
const SuggestionCard: React.FC<{
  suggestion: EnhancementSuggestion;
  onApply: () => void;
  onDismiss: () => void;
}> = ({ suggestion, onApply, onDismiss }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const typeConfig = SUGGESTION_TYPES.find((t) => t.value === suggestion.type);
  const impactConfig = IMPACT_LEVELS.find((i) => i.value === suggestion.impact);

  const getSectionIcon = () => {
    switch (suggestion.section) {
      case 'headline':
        return <User className="w-4 h-4" />;
      case 'experience':
        return <Briefcase className="w-4 h-4" />;
      case 'skills':
        return <Code className="w-4 h-4" />;
      case 'achievements':
        return <Trophy className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <Card className={cn('transition-all', suggestion.applied && 'opacity-50')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-gray-400">{getSectionIcon()}</span>
              <Badge className={cn(typeConfig?.bgColor, typeConfig?.color, 'text-xs')}>
                {typeConfig?.label}
              </Badge>
              <Badge className={cn(impactConfig?.bgColor, impactConfig?.color, 'text-xs')}>
                {impactConfig?.label}
              </Badge>
              {suggestion.keywords && suggestion.keywords.length > 0 && (
                <Badge className="bg-cyan-900/30 text-cyan-400 text-xs">
                  +{suggestion.keywords.length} keywords
                </Badge>
              )}
            </div>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-sm text-gray-300 hover:text-white mb-2"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <span className="font-medium">{suggestion.reason}</span>
            </button>

            {isExpanded && (
              <div className="space-y-3 mt-3">
                <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-3">
                  <div className="text-xs text-red-400 mb-1">Original</div>
                  <p className="text-sm text-gray-300">{suggestion.original}</p>
                </div>
                <div className="flex justify-center">
                  <ArrowRight className="w-4 h-4 text-gray-500" />
                </div>
                <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-3">
                  <div className="text-xs text-green-400 mb-1">Suggested</div>
                  <p className="text-sm text-gray-300">{suggestion.suggested}</p>
                </div>
                {suggestion.keywords && suggestion.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {suggestion.keywords.map((kw, i) => (
                      <Badge key={i} className="bg-cyan-900/30 text-cyan-400 text-xs">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {!suggestion.applied && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss}
                className="text-gray-400 hover:text-red-400"
              >
                <X className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                onClick={onApply}
                className="bg-green-600 hover:bg-green-500 text-white"
              >
                <Check className="w-4 h-4" />
              </Button>
            </div>
          )}

          {suggestion.applied && (
            <Badge className="bg-green-900/30 text-green-400">Applied</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Analysis overview component
const AnalysisOverview: React.FC<{ analysis: ResumeAnalysis }> = ({ analysis }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold">Analysis Results</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? 'Hide Details' : 'Show Details'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center gap-8">
          <ScoreDisplay score={analysis.overallScore} label="Overall" size="lg" />
          <ScoreDisplay score={analysis.atsScore} label="ATS Score" size="lg" />
        </div>

        <p className="text-sm text-gray-300 text-center">{analysis.summary}</p>

        {showDetails && (
          <div className="space-y-4 pt-4 border-t border-gray-800">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-green-400 mb-2 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Strengths
                </h4>
                <ul className="space-y-1">
                  {analysis.strengthAreas.map((s, i) => (
                    <li key={i} className="text-sm text-gray-400">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium text-yellow-400 mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Areas to Improve
                </h4>
                <ul className="space-y-1">
                  {analysis.improvementAreas.map((s, i) => (
                    <li key={i} className="text-sm text-gray-400">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {analysis.skillsAnalysis && (
              <div className="pt-4 border-t border-gray-800">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Skills Analysis</h4>
                <div className="grid grid-cols-2 gap-4">
                  {analysis.skillsAnalysis.strongMatch.length > 0 && (
                    <div>
                      <div className="text-xs text-green-400 mb-1">Strong Match</div>
                      <div className="flex flex-wrap gap-1">
                        {analysis.skillsAnalysis.strongMatch.slice(0, 8).map((s, i) => (
                          <Badge key={i} className="bg-green-900/30 text-green-400 text-xs">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {analysis.skillsAnalysis.missing.length > 0 && (
                    <div>
                      <div className="text-xs text-red-400 mb-1">Missing</div>
                      <div className="flex flex-wrap gap-1">
                        {analysis.skillsAnalysis.missing.slice(0, 8).map((s, i) => (
                          <Badge key={i} className="bg-red-900/30 text-red-400 text-xs">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {analysis.experienceRelevance.length > 0 && (
              <div className="pt-4 border-t border-gray-800">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Experience Relevance</h4>
                <div className="space-y-2">
                  {analysis.experienceRelevance.map((exp, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-gray-800/50 rounded-lg p-2"
                    >
                      <div>
                        <div className="text-sm text-gray-300">{exp.title}</div>
                        <div className="text-xs text-gray-500">{exp.company}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-400">
                          {exp.matchedKeywords.length} keywords
                        </div>
                        <ScoreDisplay score={exp.relevanceScore} label="" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Enhanced preview component with inline editing
interface EnhancedPreviewProps {
  enhanced: EnhancedProfile;
  original: any;
  onUpdate: (updates: Partial<EnhancedProfile>) => void;
}

const EnhancedPreview: React.FC<EnhancedPreviewProps> = ({
  enhanced,
  original,
  onUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<'headline' | 'experience' | 'skills' | 'achievements'>('headline');
  const [isEditing, setIsEditing] = useState(false);

  // Sort roles for display
  const sortedRoles = sortRolesByDate(enhanced.recentRoles);

  const handleHeadlineChange = (headline: string) => {
    onUpdate({ headline });
  };

  const handleSummaryChange = (summary: string) => {
    onUpdate({ summary: summary || undefined });
  };

  // Create a mapping from sorted index to original index for stable editing
  const sortedToOriginalIndex = useMemo(() => {
    return sortedRoles.map((sortedRole) =>
      enhanced.recentRoles.findIndex(
        (r) => r.originalIndex === sortedRole.originalIndex
      )
    );
  }, [sortedRoles, enhanced.recentRoles]);

  const handleRoleBulletsChange = (sortedIndex: number, bullets: string[]) => {
    const actualIndex = sortedToOriginalIndex[sortedIndex];
    if (actualIndex < 0) return;

    const updatedRoles = [...enhanced.recentRoles];
    updatedRoles[actualIndex] = {
      ...updatedRoles[actualIndex],
      enhancedHighlights: bullets,
    };
    onUpdate({ recentRoles: updatedRoles });
  };

  const handleRoleFieldChange = (sortedIndex: number, field: 'title' | 'company' | 'duration', value: string) => {
    const actualIndex = sortedToOriginalIndex[sortedIndex];
    if (actualIndex < 0) return;

    const updatedRoles = [...enhanced.recentRoles];
    updatedRoles[actualIndex] = {
      ...updatedRoles[actualIndex],
      [field]: value,
    };
    onUpdate({ recentRoles: updatedRoles });
  };

  const handleTechnicalSkillsChange = (skills: string[]) => {
    onUpdate({ technicalSkills: skills });
  };

  const handleSoftSkillsChange = (skills: string[]) => {
    onUpdate({ softSkills: skills });
  };

  const handleAchievementChange = (index: number, field: 'description' | 'metrics', value: string) => {
    if (!enhanced.keyAchievements) return;
    const updatedAchievements = [...enhanced.keyAchievements];
    updatedAchievements[index] = {
      ...updatedAchievements[index],
      [field]: value || undefined,
    };
    onUpdate({ keyAchievements: updatedAchievements });
  };

  const handleAddAchievement = () => {
    const newAchievement = {
      description: '',
      metrics: undefined,
      skills: [],
      storyType: 'impact' as const,
    };
    onUpdate({
      keyAchievements: [...(enhanced.keyAchievements || []), newAchievement]
    });
  };

  const handleRemoveAchievement = (index: number) => {
    if (!enhanced.keyAchievements) return;
    const updatedAchievements = enhanced.keyAchievements.filter((_, i) => i !== index);
    onUpdate({ keyAchievements: updatedAchievements });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold">Enhanced Preview</h3>
            <Badge className="bg-blue-900/30 text-blue-400 text-xs">
              Click any text to edit
            </Badge>
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          {(['headline', 'experience', 'skills', 'achievements'] as const).map((tab) => (
            <Button
              key={tab}
              size="sm"
              variant={activeTab === tab ? 'default' : 'ghost'}
              onClick={() => setActiveTab(tab)}
              className="capitalize"
            >
              {tab === 'achievements' ? (
                <span className="flex items-center gap-1">
                  <Trophy className="w-3 h-3" />
                  {tab}
                </span>
              ) : tab}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeTab === 'headline' && (
          <div className="space-y-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">Original</div>
              <p className="text-gray-400">{original.headline}</p>
            </div>
            <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-4">
              <div className="text-xs text-green-400 mb-1 flex items-center gap-2">
                Enhanced
                <span className="text-gray-500 text-[10px]">(click to edit)</span>
              </div>
              <EditableText
                value={enhanced.headline}
                onChange={handleHeadlineChange}
                className="text-gray-200 font-medium"
                placeholder="Enter headline..."
              />
            </div>
            <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4">
              <div className="text-xs text-blue-400 mb-1 flex items-center gap-2">
                Generated Summary
                <span className="text-gray-500 text-[10px]">(click to edit)</span>
              </div>
              <EditableText
                value={enhanced.summary || ''}
                onChange={handleSummaryChange}
                className="text-sm text-gray-300"
                placeholder="Add a professional summary..."
                multiline
                rows={4}
              />
            </div>
          </div>
        )}

        {activeTab === 'experience' && (
          <div className="space-y-4">
            <div className="text-xs text-gray-500 mb-2">
              Click any field to edit. Changes will be reflected in downloads.
            </div>
            {sortedRoles.map((role, i) => (
              <div key={`${role.company}-${role.title}-${i}`} className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 mr-4">
                    <EditableText
                      value={role.title}
                      onChange={(value) => handleRoleFieldChange(i, 'title', value)}
                      className="font-medium text-gray-200"
                      placeholder="Job title..."
                    />
                    <EditableText
                      value={role.company}
                      onChange={(value) => handleRoleFieldChange(i, 'company', value)}
                      className="text-sm text-gray-400"
                      placeholder="Company name..."
                    />
                    <EditableText
                      value={role.duration}
                      onChange={(value) => handleRoleFieldChange(i, 'duration', value)}
                      className="text-xs text-gray-500"
                      placeholder="Duration (e.g., Jan 2020 - Present)..."
                    />
                  </div>
                  {role.relevanceScore && (
                    <ScoreDisplay score={role.relevanceScore} label="Relevance" />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-gray-500">Enhanced Bullets:</div>
                  <EditableList
                    items={role.enhancedHighlights}
                    onChange={(bullets) => handleRoleBulletsChange(i, bullets)}
                    bulletStyle="disc"
                    itemClassName="text-sm text-gray-300"
                    addLabel="+ Add bullet point"
                    placeholder="Enter achievement or responsibility..."
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="space-y-4">
            <div className="text-xs text-gray-500 mb-2">
              Click skills to edit. Green badges indicate new skills added by AI.
            </div>
            <div>
              <div className="text-sm font-medium text-gray-300 mb-2">Technical Skills</div>
              <div className="flex flex-wrap gap-2 mb-2">
                {enhanced.technicalSkills.map((skill, i) => (
                  <Badge
                    key={i}
                    className={cn(
                      'text-xs cursor-pointer hover:opacity-80 transition-opacity',
                      original.technicalSkills.includes(skill)
                        ? 'bg-gray-700 text-gray-300'
                        : 'bg-green-900/30 text-green-400'
                    )}
                    onClick={() => {
                      const newSkills = enhanced.technicalSkills.filter((_, idx) => idx !== i);
                      handleTechnicalSkillsChange(newSkills);
                    }}
                    title="Click to remove"
                  >
                    {skill}
                    {!original.technicalSkills.includes(skill) && ' (new)'}
                    <X className="w-3 h-3 ml-1 inline" />
                  </Badge>
                ))}
              </div>
              <AddSkillInput
                onAdd={(skill) => handleTechnicalSkillsChange([...enhanced.technicalSkills, skill])}
                placeholder="Add technical skill..."
              />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-300 mb-2">Soft Skills</div>
              <div className="flex flex-wrap gap-2 mb-2">
                {enhanced.softSkills.map((skill, i) => (
                  <Badge
                    key={i}
                    className="bg-gray-700 text-gray-300 text-xs cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      const newSkills = enhanced.softSkills.filter((_, idx) => idx !== i);
                      handleSoftSkillsChange(newSkills);
                    }}
                    title="Click to remove"
                  >
                    {skill}
                    <X className="w-3 h-3 ml-1 inline" />
                  </Badge>
                ))}
              </div>
              <AddSkillInput
                onAdd={(skill) => handleSoftSkillsChange([...enhanced.softSkills, skill])}
                placeholder="Add soft skill..."
              />
            </div>
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="space-y-4">
            <div className="text-xs text-gray-500 mb-2">
              Edit your key achievements. These highlight your most impactful accomplishments.
            </div>
            {(!enhanced.keyAchievements || enhanced.keyAchievements.length === 0) ? (
              <div className="text-center py-8 text-gray-500">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No key achievements yet</p>
                <p className="text-sm mb-4">Add achievements to showcase your impact</p>
                <Button
                  size="sm"
                  onClick={handleAddAchievement}
                  className="bg-purple-600 hover:bg-purple-500"
                >
                  + Add Achievement
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {enhanced.keyAchievements.map((achievement, index) => (
                  <div
                    key={index}
                    className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-3">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Achievement Description</div>
                          <EditableText
                            value={achievement.description}
                            onChange={(value) => handleAchievementChange(index, 'description', value)}
                            className="text-gray-200"
                            placeholder="Describe your achievement..."
                            multiline
                            rows={2}
                          />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Metrics (optional)</div>
                          <EditableText
                            value={achievement.metrics || ''}
                            onChange={(value) => handleAchievementChange(index, 'metrics', value)}
                            className="text-sm text-purple-400"
                            placeholder="e.g., 50% increase, $1M savings..."
                          />
                        </div>
                        {achievement.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {achievement.skills.map((skill, i) => (
                              <Badge key={i} className="bg-gray-700 text-gray-300 text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveAchievement(index)}
                        className="text-gray-500 hover:text-red-400 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleAddAchievement}
                  className="text-blue-400 hover:text-blue-300"
                >
                  + Add Achievement
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Helper component for adding skills
const AddSkillInput: React.FC<{ onAdd: (skill: string) => void; placeholder: string }> = ({
  onAdd,
  placeholder,
}) => {
  const [value, setValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (value.trim()) {
      onAdd(value.trim());
      setValue('');
      setIsAdding(false);
    }
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
      >
        + Add skill
      </button>
    );
  }

  return (
    <div className="flex gap-2 items-center">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleAdd();
          if (e.key === 'Escape') setIsAdding(false);
        }}
        placeholder={placeholder}
        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
        autoFocus
      />
      <Button size="sm" onClick={handleAdd} className="px-2 py-1">
        <Check className="w-3 h-3" />
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)} className="px-2 py-1">
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
};

// History item component
const HistoryItem: React.FC<{
  enhancement: ResumeEnhancement;
  onSelect: () => void;
  onDelete: () => void;
  isSelected: boolean;
}> = ({ enhancement, onSelect, onDelete, isSelected }) => {
  return (
    <div
      className={cn(
        'p-3 rounded-lg border cursor-pointer transition-all',
        isSelected
          ? 'border-purple-500 bg-purple-900/20'
          : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge
              className={cn(
                'text-xs',
                enhancement.mode === 'professional'
                  ? 'bg-purple-900/30 text-purple-400'
                  : 'bg-blue-900/30 text-blue-400'
              )}
            >
              {enhancement.mode === 'professional' ? 'Professional' : 'Tailored'}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              {formatDate(enhancement.createdAt)}
            </div>
          </div>
          {enhancement.companyName && enhancement.jobTitle && (
            <p className="text-sm text-gray-300 truncate">
              {enhancement.jobTitle} @ {enhancement.companyName}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-500">
              Overall: <span className="text-green-400">{enhancement.analysis.overallScore}</span>
            </span>
            <span className="text-xs text-gray-500">
              <Abbr variant="subtle">ATS</Abbr>: <span className="text-blue-400">{enhancement.analysis.atsScore}</span>
            </span>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-gray-500 hover:text-red-400 shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

// Main component
export const EnhancePage: React.FC = () => {
  const profile = useCurrentProfile();
  const activeProfileId = useActiveProfileId();
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const allAnalyzedJobs = useAnalyzedJobsStore((s) => s.jobs);
  // Filter analyzed jobs by active profile
  const analyzedJobs = useMemo(() => {
    if (!activeProfileId) return allAnalyzedJobs;
    return allAnalyzedJobs.filter((j) => !j.profileId || j.profileId === activeProfileId);
  }, [allAnalyzedJobs, activeProfileId]);
  const enhancements = useEnhancementsStore((s) => s.enhancements);
  const addEnhancement = useEnhancementsStore((s) => s.addEnhancement);
  const deleteEnhancement = useEnhancementsStore((s) => s.deleteEnhancement);

  const [mode, setMode] = useState<EnhancementMode>('professional');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [pdfTemplate, setPdfTemplate] = useState<PDFTemplate>('executive');
  const [includeScoresInPDF, setIncludeScoresInPDF] = useState(false);

  // Upload state
  const [enhanceSource, setEnhanceSource] = useState<EnhanceSource>('profile');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedProfile, setUploadedProfile] = useState<UserProfile | null>(null);
  const [uploadAction, setUploadAction] = useState<UploadAction>('enhance-only');
  const [isParsingUpload, setIsParsingUpload] = useState(false);

  const [enhancement, setEnhancement] = useState<{
    analysis: ResumeAnalysis;
    suggestions: EnhancementSuggestion[];
    enhancedProfile: EnhancedProfile;
  } | null>(null);

  const selectedJob = useMemo(
    () => analyzedJobs.find((j) => j.id === selectedJobId),
    [analyzedJobs, selectedJobId]
  );

  const isProfileReady =
    profile.name !== 'Senior Engineer' &&
    profile.headline.trim() !== '' &&
    profile.technicalSkills.length > 0;

  const isUploadReady = uploadedProfile !== null;

  // Determine which profile to use for enhancement
  const activeProfile = enhanceSource === 'upload' && uploadedProfile ? uploadedProfile : profile;

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setIsParsingUpload(true);
    setUploadedProfile(null);

    try {
      const parsedProfile = await processDocuments([file]);
      setUploadedProfile(parsedProfile);
      toast.success('Resume parsed', `Extracted profile for ${parsedProfile.name}`);
    } catch (error) {
      console.error('Failed to parse resume:', error);
      toast.error('Parse failed', error instanceof Error ? error.message : 'Could not parse the uploaded file');
      setUploadedFile(null);
    } finally {
      setIsParsingUpload(false);
    }
  };

  const handleClearUpload = () => {
    setUploadedFile(null);
    setUploadedProfile(null);
    setEnhanceSource('profile');
  };

  const handleImportToProfile = () => {
    if (!uploadedProfile) return;

    // Import all fields from uploaded profile to current profile
    updateProfile({
      name: uploadedProfile.name,
      headline: uploadedProfile.headline,
      yearsExperience: uploadedProfile.yearsExperience,
      technicalSkills: uploadedProfile.technicalSkills,
      softSkills: uploadedProfile.softSkills,
      industries: uploadedProfile.industries,
      keyAchievements: uploadedProfile.keyAchievements,
      recentRoles: uploadedProfile.recentRoles,
      currentSituation: uploadedProfile.currentSituation,
      goals: uploadedProfile.goals,
      constraints: uploadedProfile.constraints,
      activeProjects: uploadedProfile.activeProjects,
      preferences: uploadedProfile.preferences,
      freelanceProfile: uploadedProfile.freelanceProfile,
    });

    toast.success('Profile updated', 'Resume data has been imported to your profile');
    setEnhanceSource('profile');
    handleClearUpload();
  };

  const handleAnalyze = async () => {
    const sourceProfile = enhanceSource === 'upload' ? uploadedProfile : profile;

    if (enhanceSource === 'profile' && !isProfileReady) {
      toast.error('Profile incomplete', 'Please fill out your profile first');
      return;
    }

    if (enhanceSource === 'upload' && !isUploadReady) {
      toast.error('No resume uploaded', 'Please upload a resume first');
      return;
    }

    if (mode === 'job-tailored' && !selectedJob) {
      toast.error('No job selected', 'Please select an analyzed job for tailored enhancement');
      return;
    }

    setIsAnalyzing(true);
    try {
      const profileToEnhance = sourceProfile!;
      const result = await enhanceResume({
        profile: profileToEnhance,
        mode,
        jobDescription: selectedJob?.jobDescription,
        analysis: selectedJob?.analysis,
        company: selectedJob?.company,
        role: selectedJob?.role,
      });

      setEnhancement(result);

      // Save to history
      addEnhancement({
        mode,
        analysis: result.analysis,
        suggestions: result.suggestions,
        enhancedProfile: result.enhancedProfile,
        jobId: selectedJob?.id,
        jobTitle: selectedJob?.role,
        companyName: selectedJob?.company,
      });

      // If user chose to import and enhance, apply to profile after enhancement
      if (enhanceSource === 'upload' && uploadAction === 'import-and-enhance') {
        handleImportToProfile();
      }

      toast.success('Analysis complete', 'Review the suggestions below');
    } catch (error) {
      console.error('Enhancement failed:', error);
      toast.error('Enhancement failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLoadFromHistory = (historyItem: ResumeEnhancement) => {
    setEnhancement({
      analysis: historyItem.analysis,
      suggestions: historyItem.suggestions,
      enhancedProfile: historyItem.enhancedProfile,
    });
    setSelectedHistoryId(historyItem.id);
    setShowHistory(false);
    toast.success('Loaded from history', 'Previous enhancement loaded');
  };

  const handleDeleteFromHistory = (id: string) => {
    deleteEnhancement(id);
    if (selectedHistoryId === id) {
      setSelectedHistoryId(null);
    }
    toast.success('Deleted', 'Enhancement removed from history');
  };

  const handleApplySuggestion = (suggestionId: string) => {
    if (!enhancement) return;

    setEnhancement((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        suggestions: prev.suggestions.map((s) =>
          s.id === suggestionId ? { ...s, applied: true } : s
        ),
      };
    });
  };

  const handleDismissSuggestion = (suggestionId: string) => {
    if (!enhancement) return;

    setEnhancement((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        suggestions: prev.suggestions.filter((s) => s.id !== suggestionId),
      };
    });
  };

  // Handler for inline editing of enhanced profile
  const handleUpdateEnhancedProfile = (updates: Partial<EnhancedProfile>) => {
    if (!enhancement) return;

    setEnhancement((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        enhancedProfile: {
          ...prev.enhancedProfile,
          ...updates,
        },
      };
    });
  };

  const handleApplyToProfile = () => {
    if (!enhancement) return;

    updateProfile({ headline: enhancement.enhancedProfile.headline });

    if (enhancement.enhancedProfile.technicalSkills.length > 0) {
      updateProfile({ technicalSkills: enhancement.enhancedProfile.technicalSkills });
    }
    if (enhancement.enhancedProfile.softSkills.length > 0) {
      updateProfile({ softSkills: enhancement.enhancedProfile.softSkills });
    }

    if (enhancement.enhancedProfile.recentRoles.length > 0) {
      const updatedRoles = enhancement.enhancedProfile.recentRoles.map((er) => ({
        company: er.company,
        title: er.title,
        duration: er.duration,
        highlights: er.enhancedHighlights,
      }));
      updateProfile({ recentRoles: updatedRoles });
    }

    toast.success('Profile updated', 'Enhanced content applied to your profile');
  };

  const handleDownload = (format: DownloadFormat) => {
    if (!enhancement) return;

    const jobInfo = selectedJob
      ? { company: selectedJob.company, role: selectedJob.role }
      : undefined;

    if (format === 'pdf') {
      downloadResumePDF({
        enhanced: enhancement.enhancedProfile,
        profile,
        analysis: enhancement.analysis,
        jobInfo,
        template: pdfTemplate,
        includeScores: includeScoresInPDF,
      });
      setShowDownloadMenu(false);
      toast.success('PDF Generated', 'In print dialog, uncheck "Headers and footers" for clean output');
      return;
    }

    const content = generateResumeContent(
      enhancement.enhancedProfile,
      profile,
      enhancement.analysis,
      format,
      jobInfo
    );

    const extensions: Record<string, string> = {
      markdown: 'md',
      text: 'txt',
      json: 'json',
    };

    const mimeTypes: Record<string, string> = {
      markdown: 'text/markdown',
      text: 'text/plain',
      json: 'application/json',
    };

    // Build descriptive filename: name_company_role_date.ext
    const sanitize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const datePart = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const namePart = sanitize(profile.name || 'resume');

    let baseFilename: string;
    if (selectedJob?.company && selectedJob?.role) {
      baseFilename = `${namePart}_${sanitize(selectedJob.company)}_${sanitize(selectedJob.role)}_${datePart}`;
    } else if (selectedJob?.company) {
      baseFilename = `${namePart}_${sanitize(selectedJob.company)}_${datePart}`;
    } else {
      baseFilename = `${namePart}_resume_${datePart}`;
    }

    const filename = `${baseFilename}.${extensions[format]}`;
    downloadFile(content, filename, mimeTypes[format]);
    setShowDownloadMenu(false);
    toast.success('Resume downloaded', `Saved as ${filename}`);
  };

  const handlePreviewPDF = () => {
    if (!enhancement) return;

    const jobInfo = selectedJob
      ? { company: selectedJob.company, role: selectedJob.role }
      : undefined;

    previewResumeHTML({
      enhanced: enhancement.enhancedProfile,
      profile,
      analysis: enhancement.analysis,
      jobInfo,
      template: pdfTemplate,
      includeScores: includeScoresInPDF,
    });
  };

  const appliedCount = enhancement?.suggestions.filter((s) => s.applied).length || 0;
  const totalSuggestions = enhancement?.suggestions.length || 0;

  const highImpactSuggestions =
    enhancement?.suggestions.filter((s) => s.impact === 'high' && !s.applied) || [];
  const mediumImpactSuggestions =
    enhancement?.suggestions.filter((s) => s.impact === 'medium' && !s.applied) || [];
  const lowImpactSuggestions =
    enhancement?.suggestions.filter((s) => s.impact === 'low' && !s.applied) || [];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-400" />
              Resume Enhancement
            </h1>
            <p className="text-gray-400 mt-1">
              AI-powered suggestions to improve your resume for better results
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* History Button */}
            <Button
              variant="ghost"
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                'relative',
                showHistory && 'bg-gray-800'
              )}
            >
              <History className="w-4 h-4 mr-2" />
              History
              {enhancements.length > 0 && (
                <Badge className="ml-2 bg-purple-600 text-white text-xs">
                  {enhancements.length}
                </Badge>
              )}
            </Button>

            {/* Download Button */}
            {enhancement && (
              <div className="relative">
                <Button
                  onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                  className="bg-blue-600 hover:bg-blue-500"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>

                {showDownloadMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowDownloadMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                      <div className="p-3 border-b border-gray-700">
                        <p className="text-sm font-medium text-gray-200">Download Resume</p>
                        <p className="text-xs text-gray-500">Choose format and options</p>
                      </div>

                      {/* PDF Options */}
                      <div className="p-3 border-b border-gray-700 space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <Palette className="w-4 h-4" />
                          <span>PDF Template</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {([
                            { id: 'executive', label: 'Executive', desc: 'Premium layout' },
                            { id: 'professional', label: 'Professional', desc: 'Clean & classic' },
                            { id: 'modern', label: 'Modern', desc: 'Contemporary' },
                            { id: 'minimal', label: 'Minimal', desc: 'Simple & clean' },
                          ] as const).map((t) => (
                            <button
                              key={t.id}
                              onClick={() => setPdfTemplate(t.id)}
                              className={cn(
                                'px-3 py-2 text-xs rounded-md text-left transition-colors',
                                pdfTemplate === t.id
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              )}
                            >
                              <div className="font-medium">{t.label}</div>
                              <div className={cn(
                                'text-[10px]',
                                pdfTemplate === t.id ? 'text-purple-200' : 'text-gray-500'
                              )}>{t.desc}</div>
                            </button>
                          ))}
                        </div>
                        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includeScoresInPDF}
                            onChange={(e) => setIncludeScoresInPDF(e.target.checked)}
                            className="rounded border-gray-600 bg-gray-700 text-purple-500"
                          />
                          Include scores in PDF
                        </label>
                      </div>

                      {/* Download Options */}
                      <div className="p-2">
                        <button
                          onClick={() => handleDownload('pdf')}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm text-gray-200 hover:bg-gray-700 rounded-md transition-colors"
                        >
                          <FileType className="w-5 h-5 text-red-400" />
                          <div className="flex-1">
                            <div className="font-medium">PDF Document</div>
                            <div className="text-xs text-gray-500">Uncheck "Headers and footers" in print dialog</div>
                          </div>
                        </button>
                        <button
                          onClick={handlePreviewPDF}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm text-gray-200 hover:bg-gray-700 rounded-md transition-colors"
                        >
                          <Eye className="w-5 h-5 text-purple-400" />
                          <div className="flex-1">
                            <div className="font-medium">Preview PDF</div>
                            <div className="text-xs text-gray-500">See how it looks before downloading</div>
                          </div>
                        </button>

                        <div className="border-t border-gray-700 my-2" />

                        <button
                          onClick={() => handleDownload('markdown')}
                          className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 rounded-md transition-colors"
                        >
                          <FileDown className="w-4 h-4 text-blue-400" />
                          <div>
                            <div className="font-medium">Markdown (.md)</div>
                            <div className="text-xs text-gray-500">Rich formatting, GitHub-ready</div>
                          </div>
                        </button>
                        <button
                          onClick={() => handleDownload('text')}
                          className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 rounded-md transition-colors"
                        >
                          <FileText className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="font-medium">Plain Text (.txt)</div>
                            <div className="text-xs text-gray-500">ATS-friendly, copy-paste ready</div>
                          </div>
                        </button>
                        <button
                          onClick={() => handleDownload('json')}
                          className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 rounded-md transition-colors"
                        >
                          <Code className="w-4 h-4 text-green-400" />
                          <div>
                            <div className="font-medium">JSON (.json)</div>
                            <div className="text-xs text-gray-500">Structured data, re-import later</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* History Panel */}
        {showHistory && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-purple-400" />
                  <h3 className="font-semibold">Enhancement History</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHistory(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {enhancements.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No enhancement history yet</p>
                  <p className="text-sm">Your enhanced resumes will appear here</p>
                </div>
              ) : (
                <div className="grid gap-3 max-h-64 overflow-y-auto">
                  {enhancements.map((item) => (
                    <HistoryItem
                      key={item.id}
                      enhancement={item}
                      onSelect={() => handleLoadFromHistory(item)}
                      onDelete={() => handleDeleteFromHistory(item.id)}
                      isSelected={selectedHistoryId === item.id}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Source Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileUp className="w-5 h-5 text-cyan-400" />
              <h3 className="font-semibold">Resume Source</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Source Toggle */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setEnhanceSource('profile')}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all text-left',
                  enhanceSource === 'profile'
                    ? 'border-cyan-500 bg-cyan-900/20'
                    : 'border-gray-700 hover:border-gray-600'
                )}
              >
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-cyan-400" />
                  <div>
                    <div className="font-medium text-white">Use My Profile</div>
                    <div className="text-sm text-gray-400">
                      Enhance from your saved profile data
                    </div>
                  </div>
                </div>
                {isProfileReady && (
                  <div className="mt-2 text-xs text-green-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Profile ready: {profile.name}
                  </div>
                )}
              </button>

              <button
                onClick={() => setEnhanceSource('upload')}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all text-left',
                  enhanceSource === 'upload'
                    ? 'border-cyan-500 bg-cyan-900/20'
                    : 'border-gray-700 hover:border-gray-600'
                )}
              >
                <div className="flex items-center gap-3">
                  <Upload className="w-5 h-5 text-cyan-400" />
                  <div>
                    <div className="font-medium text-white">Upload Resume</div>
                    <div className="text-sm text-gray-400">
                      Upload a resume file to enhance
                    </div>
                  </div>
                </div>
                {uploadedProfile && (
                  <div className="mt-2 text-xs text-green-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Parsed: {uploadedProfile.name}
                  </div>
                )}
              </button>
            </div>

            {/* Upload Section */}
            {enhanceSource === 'upload' && (
              <div className="pt-4 border-t border-gray-800 space-y-4">
                {!uploadedFile ? (
                  <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-gray-600 transition-colors">
                    <Upload className="w-10 h-10 mx-auto mb-3 text-gray-500" />
                    <p className="text-gray-300 mb-2">
                      Drag and drop your resume, or click to browse
                    </p>
                    <p className="text-xs text-gray-500 mb-4">
                      Supports PDF, DOCX, TXT, and Markdown files
                    </p>
                    <label className="inline-flex items-center justify-center font-medium rounded-lg border transition-colors px-4 py-2 text-sm gap-2 bg-transparent hover:bg-gray-800 text-gray-300 border-gray-600 cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt,.md"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <FileUp className="w-4 h-4" />
                      Choose File
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* File Info */}
                    <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-400" />
                        <div>
                          <p className="text-sm text-gray-200">{uploadedFile.name}</p>
                          <p className="text-xs text-gray-500">
                            {(uploadedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isParsingUpload && (
                          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleClearUpload}
                          className="text-gray-400 hover:text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Parsed Profile Preview */}
                    {uploadedProfile && (
                      <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <span className="text-green-400 font-medium">Resume Parsed Successfully</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500">Name:</span>{' '}
                            <span className="text-gray-200">{uploadedProfile.name}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Experience:</span>{' '}
                            <span className="text-gray-200">{uploadedProfile.yearsExperience} years</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Skills:</span>{' '}
                            <span className="text-gray-200">{uploadedProfile.technicalSkills.length} found</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Roles:</span>{' '}
                            <span className="text-gray-200">{uploadedProfile.recentRoles.length} found</span>
                          </div>
                        </div>

                        {/* Upload Action Selection */}
                        <div className="pt-3 border-t border-green-800/30 space-y-3">
                          <p className="text-sm text-gray-300">After enhancement:</p>
                          <div className="flex flex-col gap-2">
                            <label
                              className={cn(
                                'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                                uploadAction === 'enhance-only'
                                  ? 'bg-gray-800 border border-gray-600'
                                  : 'bg-gray-800/50 border border-gray-700 hover:border-gray-600'
                              )}
                            >
                              <input
                                type="radio"
                                name="uploadAction"
                                value="enhance-only"
                                checked={uploadAction === 'enhance-only'}
                                onChange={() => setUploadAction('enhance-only')}
                                className="text-cyan-500"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <ExternalLink className="w-4 h-4 text-blue-400" />
                                  <span className="text-sm font-medium text-gray-200">Export Only</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  Enhance for download only, profile stays unchanged
                                </p>
                              </div>
                            </label>

                            <label
                              className={cn(
                                'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                                uploadAction === 'import-and-enhance'
                                  ? 'bg-gray-800 border border-gray-600'
                                  : 'bg-gray-800/50 border border-gray-700 hover:border-gray-600'
                              )}
                            >
                              <input
                                type="radio"
                                name="uploadAction"
                                value="import-and-enhance"
                                checked={uploadAction === 'import-and-enhance'}
                                onChange={() => setUploadAction('import-and-enhance')}
                                className="text-cyan-500"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <UserPlus className="w-4 h-4 text-green-400" />
                                  <span className="text-sm font-medium text-gray-200">Import & Enhance</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  Save to profile first, then enhance
                                </p>
                              </div>
                            </label>
                          </div>

                          {/* Quick import button */}
                          <div className="flex justify-end pt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleImportToProfile}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              <UserPlus className="w-4 h-4 mr-1" />
                              Import to Profile Now
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mode Selection */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ENHANCEMENT_MODES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value as EnhancementMode)}
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all text-left',
                    mode === m.value
                      ? 'border-purple-500 bg-purple-900/20'
                      : 'border-gray-700 hover:border-gray-600'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {m.value === 'professional' ? (
                      <Sparkles className="w-5 h-5 text-purple-400" />
                    ) : (
                      <Target className="w-5 h-5 text-blue-400" />
                    )}
                    <div>
                      <div className="font-medium text-white">{m.label}</div>
                      <div className="text-sm text-gray-400">{m.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {mode === 'job-tailored' && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select an analyzed job to tailor for:
                </label>
                {analyzedJobs.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No analyzed jobs yet. Go to JD Analyzer to analyze a job first.
                  </p>
                ) : (
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-200"
                  >
                    <option value="">Select a job...</option>
                    {analyzedJobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.role || 'Unknown Role'} at {job.company || 'Unknown Company'} (
                        {job.analysis.fitScore}/10)
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-center">
              <Button
                onClick={handleAnalyze}
                disabled={
                  isAnalyzing ||
                  (enhanceSource === 'profile' && !isProfileReady) ||
                  (enhanceSource === 'upload' && !isUploadReady)
                }
                className="px-8"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {enhancement ? 'Re-analyze' : 'Analyze & Enhance'}
                  </>
                )}
              </Button>
            </div>

            {enhanceSource === 'profile' && !isProfileReady && (
              <p className="text-center text-sm text-yellow-400 mt-4">
                Please complete your profile before analyzing
              </p>
            )}
            {enhanceSource === 'upload' && !isUploadReady && (
              <p className="text-center text-sm text-yellow-400 mt-4">
                Please upload and parse a resume before analyzing
              </p>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {enhancement && (
          <>
            {/* Analysis Overview */}
            <AnalysisOverview analysis={enhancement.analysis} />

            {/* Suggestions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-400" />
                    <h3 className="font-semibold">Suggestions</h3>
                    <Badge className="bg-gray-700 text-gray-300">
                      {appliedCount}/{totalSuggestions} applied
                    </Badge>
                  </div>
                  <Button onClick={handleApplyToProfile} className="bg-green-600 hover:bg-green-500">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Apply All to Profile
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {highImpactSuggestions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      High Impact ({highImpactSuggestions.length})
                    </h4>
                    <div className="space-y-3">
                      {highImpactSuggestions.map((s) => (
                        <SuggestionCard
                          key={s.id}
                          suggestion={s}
                          onApply={() => handleApplySuggestion(s.id)}
                          onDismiss={() => handleDismissSuggestion(s.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {mediumImpactSuggestions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-yellow-400 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Medium Impact ({mediumImpactSuggestions.length})
                    </h4>
                    <div className="space-y-3">
                      {mediumImpactSuggestions.map((s) => (
                        <SuggestionCard
                          key={s.id}
                          suggestion={s}
                          onApply={() => handleApplySuggestion(s.id)}
                          onDismiss={() => handleDismissSuggestion(s.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {lowImpactSuggestions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-3">
                      Low Impact ({lowImpactSuggestions.length})
                    </h4>
                    <div className="space-y-3">
                      {lowImpactSuggestions.map((s) => (
                        <SuggestionCard
                          key={s.id}
                          suggestion={s}
                          onApply={() => handleApplySuggestion(s.id)}
                          onDismiss={() => handleDismissSuggestion(s.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {totalSuggestions === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                    <p>Great job! Your resume looks solid.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Enhanced Preview */}
            <EnhancedPreview
              enhanced={enhancement.enhancedProfile}
              original={activeProfile}
              onUpdate={handleUpdateEnhancedProfile}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default EnhancePage;
