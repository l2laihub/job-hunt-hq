import React from 'react';
import { CheckCircle, XCircle, ShieldAlert, Star } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { CategorizedSkills, SkillMatchItem } from '@/src/types';

interface SkillsComparisonCardProps {
  categorizedSkills?: CategorizedSkills;
  matchedSkills: string[];
  missingSkills: string[];
}

const SkillBadge: React.FC<{ skill: SkillMatchItem }> = ({ skill }) => {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors',
        skill.isMatched
          ? 'bg-green-900/20 border-green-800 text-green-300'
          : 'bg-red-900/20 border-red-800 text-red-300'
      )}
    >
      {skill.isMatched ? (
        <CheckCircle className="w-4 h-4 flex-shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 flex-shrink-0" />
      )}
      <span className="flex-1">{skill.skill}</span>
      {skill.importance === 'critical' && (
        <span className="text-xs px-1.5 py-0.5 bg-red-500/20 rounded text-red-200">
          Critical
        </span>
      )}
    </div>
  );
};

const NiceToHaveBadge: React.FC<{ skill: SkillMatchItem }> = ({ skill }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded text-xs border',
        skill.isMatched
          ? 'bg-blue-900/20 border-blue-800 text-blue-300'
          : 'bg-gray-800 border-gray-700 text-gray-400'
      )}
    >
      {skill.isMatched && <CheckCircle className="w-3 h-3" />}
      {skill.skill}
    </span>
  );
};

export const SkillsComparisonCard: React.FC<SkillsComparisonCardProps> = ({
  categorizedSkills,
  matchedSkills,
  missingSkills,
}) => {
  // Use categorizedSkills if available, otherwise fall back to legacy format
  const hasCategorizedSkills = categorizedSkills &&
    (categorizedSkills.mustHave.length > 0 || categorizedSkills.niceToHave.length > 0);

  const mustHave = hasCategorizedSkills ? categorizedSkills.mustHave : [];
  const niceToHave = hasCategorizedSkills ? categorizedSkills.niceToHave : [];

  // Calculate coverage stats
  const mustHaveMatched = mustHave.filter(s => s.isMatched).length;
  const niceToHaveMatched = niceToHave.filter(s => s.isMatched).length;
  const totalMatched = hasCategorizedSkills
    ? mustHaveMatched + niceToHaveMatched
    : matchedSkills.length;
  const totalSkills = hasCategorizedSkills
    ? mustHave.length + niceToHave.length
    : matchedSkills.length + missingSkills.length;
  const coveragePercent = totalSkills > 0 ? Math.round((totalMatched / totalSkills) * 100) : 0;

  // Fallback render for legacy data
  if (!hasCategorizedSkills) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            Skills Match
            <span className="ml-auto text-xs text-gray-400">
              {matchedSkills.length}/{totalSkills} matched
            </span>
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Matched Skills */}
            <div>
              <h4 className="text-xs font-medium text-green-400 mb-2">You Have</h4>
              <div className="flex flex-wrap gap-1.5">
                {matchedSkills.map((skill, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-900/20 border border-green-800 rounded text-green-300"
                  >
                    <CheckCircle className="w-3 h-3" />
                    {skill}
                  </span>
                ))}
                {matchedSkills.length === 0 && (
                  <span className="text-xs text-gray-500 italic">None identified</span>
                )}
              </div>
            </div>

            {/* Missing Skills */}
            <div>
              <h4 className="text-xs font-medium text-red-400 mb-2">Missing</h4>
              <div className="flex flex-wrap gap-1.5">
                {missingSkills.map((skill, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-900/20 border border-red-800 rounded text-red-300"
                  >
                    <XCircle className="w-3 h-3" />
                    {skill}
                  </span>
                ))}
                {missingSkills.length === 0 && (
                  <span className="text-xs text-gray-500 italic">None - great match!</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Must-Have Skills Section */}
      {mustHave.length > 0 && (
        <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
          <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            Must-Have Skills
            <span className="ml-auto text-xs text-gray-400">
              {mustHaveMatched}/{mustHave.length} matched
            </span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {mustHave.map((skill, i) => (
              <SkillBadge key={i} skill={skill} />
            ))}
          </div>
        </div>
      )}

      {/* Nice-to-Have Skills Section */}
      {niceToHave.length > 0 && (
        <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
          <h3 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
            <Star className="w-4 h-4" />
            Nice-to-Have Skills
            <span className="ml-auto text-xs text-gray-400">
              {niceToHaveMatched}/{niceToHave.length} matched
            </span>
          </h3>

          <div className="flex flex-wrap gap-2">
            {niceToHave.map((skill, i) => (
              <NiceToHaveBadge key={i} skill={skill} />
            ))}
          </div>
        </div>
      )}

      {/* Visual Summary Bar */}
      <div className="p-3 bg-gray-900/50 rounded-lg">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
          <span>Skills Coverage</span>
          <span className="font-medium text-white">{coveragePercent}%</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-500',
              coveragePercent >= 80
                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                : coveragePercent >= 50
                  ? 'bg-gradient-to-r from-yellow-500 to-amber-500'
                  : 'bg-gradient-to-r from-red-500 to-rose-500'
            )}
            style={{ width: `${coveragePercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
