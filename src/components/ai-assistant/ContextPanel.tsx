/**
 * Context Panel
 *
 * Displays the current context loaded for the AI assistant,
 * showing what data is available for personalized responses.
 */
import React from 'react';
import {
  Briefcase,
  Building2,
  Target,
  Book,
  User,
  FileText,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { AssistantContext } from '@/src/types/assistant';

interface ContextPanelProps {
  context: AssistantContext;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({ context }) => {
  // Get context indicators
  const indicators = [];

  if (context.profile) {
    // Show the profile metadata name (e.g., "Full Stack Focus") for clarity
    // The metadata.name identifies the profile, while profile.name is the user's actual name
    const profileLabel = context.profile.metadata?.name || context.profile.name;

    // Count profile completeness indicators
    const skillsCount = context.profile.technicalSkills?.length || 0;
    const rolesCount = context.profile.recentRoles?.length || 0;
    const achievementsCount = context.profile.keyAchievements?.length || 0;
    const yearsExp = context.profile.yearsExperience || 0;
    const hasDetailedData = skillsCount > 0 || rolesCount > 0 || achievementsCount > 0;
    const hasBasicData = yearsExp > 0 || context.profile.headline;

    // Build profile label with data indicators
    let label = profileLabel;
    if (hasDetailedData) {
      const dataItems = [];
      if (skillsCount > 0) dataItems.push(`${skillsCount} skills`);
      if (rolesCount > 0) dataItems.push(`${rolesCount} roles`);
      if (achievementsCount > 0) dataItems.push(`${achievementsCount} achievements`);
      label = `${profileLabel} (${dataItems.join(', ')})`;
    } else if (hasBasicData) {
      // Show basic info if no detailed data
      label = `${profileLabel} (${yearsExp}y exp)`;
    }

    indicators.push({
      icon: User,
      label,
      color: hasDetailedData ? 'text-blue-400' : hasBasicData ? 'text-blue-400/70' : 'text-gray-500',
    });
  }

  if (context.application) {
    indicators.push({
      icon: Briefcase,
      label: `${context.application.company} - ${context.application.role}`,
      color: 'text-purple-400',
    });
  }

  if (context.companyResearch) {
    indicators.push({
      icon: Building2,
      label: 'Company research',
      color: 'text-green-400',
    });
  }

  if (context.prepSession) {
    indicators.push({
      icon: Target,
      label: `${context.prepSession.interviewType} prep`,
      color: 'text-yellow-400',
    });
  }

  if (context.stories?.length) {
    indicators.push({
      icon: Book,
      label: `${context.stories.length} stories`,
      color: 'text-pink-400',
    });
  }

  if (context.analyzedJob) {
    indicators.push({
      icon: FileText,
      label: 'Job analysis',
      color: 'text-cyan-400',
    });
  }

  if (indicators.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-3 border-b border-gray-800 bg-gray-800/30">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-3 h-3 text-yellow-400" />
        <span className="text-xs font-medium text-gray-400">
          Context loaded
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {indicators.map((indicator, index) => (
          <div
            key={index}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1',
              'bg-gray-800 rounded-full',
              'text-xs'
            )}
          >
            <indicator.icon className={cn('w-3 h-3', indicator.color)} />
            <span className="text-gray-300 truncate max-w-[150px]">
              {indicator.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
