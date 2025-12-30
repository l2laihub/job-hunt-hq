import React, { useState, useMemo } from 'react';
import { Button, Card, CardHeader, CardContent, Badge } from '@/src/components/ui';
import { cn } from '@/src/lib/utils';
import type { SkillGroup } from '@/src/types';
import {
  X,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Pencil,
  Check,
  Trash2,
  Sparkles,
  FolderPlus,
  Tags,
} from 'lucide-react';

interface SkillGroupManagerProps {
  technicalSkills: string[];
  softSkills: string[];
  skillGroups: SkillGroup[];
  onSkillGroupsChange: (groups: SkillGroup[]) => void;
  onAutoCategorizeTechnical?: () => Promise<void>;
  isAutoCategorizing?: boolean;
}

// Helper to get uncategorized skills
function getUncategorizedSkills(
  allSkills: string[],
  groups: SkillGroup[]
): string[] {
  const categorizedSkills = new Set(groups.flatMap((g) => g.skills));
  return allSkills.filter((skill) => !categorizedSkills.has(skill));
}

// Helper to generate a unique ID
function generateId(): string {
  return crypto.randomUUID();
}

export const SkillGroupManager: React.FC<SkillGroupManagerProps> = ({
  technicalSkills,
  softSkills,
  skillGroups,
  onSkillGroupsChange,
  onAutoCategorizeTechnical,
  isAutoCategorizing = false,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [draggedSkill, setDraggedSkill] = useState<{ skill: string; fromGroupId: string | null } | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);

  // Calculate uncategorized technical skills
  const uncategorizedTechnical = useMemo(
    () => getUncategorizedSkills(technicalSkills, skillGroups),
    [technicalSkills, skillGroups]
  );

  // Toggle group expansion
  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  // Start editing group name
  const startEditing = (group: SkillGroup) => {
    setEditingGroupId(group.id);
    setEditingName(group.name);
  };

  // Save group name
  const saveGroupName = () => {
    if (!editingGroupId || !editingName.trim()) return;

    onSkillGroupsChange(
      skillGroups.map((g) =>
        g.id === editingGroupId ? { ...g, name: editingName.trim() } : g
      )
    );
    setEditingGroupId(null);
    setEditingName('');
  };

  // Add new group
  const addNewGroup = () => {
    if (!newGroupName.trim()) return;

    const newGroup: SkillGroup = {
      id: generateId(),
      name: newGroupName.trim(),
      skills: [],
      order: skillGroups.length,
      isCustom: true,
    };

    onSkillGroupsChange([...skillGroups, newGroup]);
    setNewGroupName('');
    setIsAddingGroup(false);
    setExpandedGroups((prev) => new Set([...prev, newGroup.id]));
  };

  // Delete group (moves skills back to uncategorized)
  const deleteGroup = (groupId: string) => {
    onSkillGroupsChange(skillGroups.filter((g) => g.id !== groupId));
  };

  // Move group up/down
  const moveGroup = (groupId: string, direction: 'up' | 'down') => {
    const index = skillGroups.findIndex((g) => g.id === groupId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= skillGroups.length) return;

    const newGroups = [...skillGroups];
    [newGroups[index], newGroups[newIndex]] = [newGroups[newIndex], newGroups[index]];

    // Update order values
    newGroups.forEach((g, i) => {
      g.order = i;
    });

    onSkillGroupsChange(newGroups);
  };

  // Remove skill from group
  const removeSkillFromGroup = (groupId: string, skill: string) => {
    onSkillGroupsChange(
      skillGroups.map((g) =>
        g.id === groupId
          ? { ...g, skills: g.skills.filter((s) => s !== skill) }
          : g
      )
    );
  };

  // Add skill to group
  const addSkillToGroup = (groupId: string, skill: string) => {
    // First remove from any existing group
    const updatedGroups = skillGroups.map((g) => ({
      ...g,
      skills: g.skills.filter((s) => s !== skill),
    }));

    // Then add to target group
    onSkillGroupsChange(
      updatedGroups.map((g) =>
        g.id === groupId ? { ...g, skills: [...g.skills, skill] } : g
      )
    );
  };

  // Drag handlers
  const handleDragStart = (skill: string, fromGroupId: string | null) => {
    setDraggedSkill({ skill, fromGroupId });
  };

  const handleDragOver = (e: React.DragEvent, groupId: string | null) => {
    e.preventDefault();
    setDragOverGroupId(groupId);
  };

  const handleDragLeave = () => {
    setDragOverGroupId(null);
  };

  const handleDrop = (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault();
    if (!draggedSkill) return;

    if (draggedSkill.fromGroupId !== targetGroupId) {
      addSkillToGroup(targetGroupId, draggedSkill.skill);
    }

    setDraggedSkill(null);
    setDragOverGroupId(null);
  };

  const handleDropToUncategorized = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedSkill || !draggedSkill.fromGroupId) return;

    removeSkillFromGroup(draggedSkill.fromGroupId, draggedSkill.skill);
    setDraggedSkill(null);
    setDragOverGroupId(null);
  };

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tags className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-gray-200">Skill Groups</h3>
          <Badge variant="default" size="sm">
            {skillGroups.length} groups
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {onAutoCategorizeTechnical && uncategorizedTechnical.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onAutoCategorizeTechnical}
              disabled={isAutoCategorizing}
              className="text-purple-400 hover:text-purple-300"
            >
              <Sparkles className="w-4 h-4 mr-1" />
              {isAutoCategorizing ? 'Categorizing...' : 'Auto-Categorize'}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsAddingGroup(true)}
            className="text-cyan-400 hover:text-cyan-300"
          >
            <FolderPlus className="w-4 h-4 mr-1" />
            Add Group
          </Button>
        </div>
      </div>

      {/* Add new group form */}
      {isAddingGroup && (
        <Card className="border-cyan-800/50 bg-cyan-900/10">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addNewGroup();
                  if (e.key === 'Escape') {
                    setIsAddingGroup(false);
                    setNewGroupName('');
                  }
                }}
                placeholder="Enter group name..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-cyan-500"
                autoFocus
              />
              <Button size="sm" onClick={addNewGroup} disabled={!newGroupName.trim()}>
                <Check className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAddingGroup(false);
                  setNewGroupName('');
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uncategorized skills */}
      {uncategorizedTechnical.length > 0 && (
        <Card
          className={cn(
            'border-dashed',
            dragOverGroupId === 'uncategorized' && 'border-yellow-500 bg-yellow-900/10'
          )}
          onDragOver={(e) => handleDragOver(e, 'uncategorized')}
          onDragLeave={handleDragLeave}
          onDrop={handleDropToUncategorized}
        >
          <CardHeader className="py-2 px-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-yellow-400">
                  Uncategorized Skills
                </span>
                <Badge variant="warning" size="sm">
                  {uncategorizedTechnical.length}
                </Badge>
              </div>
              <span className="text-xs text-gray-500">
                Drag skills to groups below
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="flex flex-wrap gap-2">
              {uncategorizedTechnical.map((skill) => (
                <Badge
                  key={skill}
                  variant="warning"
                  className="cursor-grab active:cursor-grabbing"
                  draggable
                  onDragStart={() => handleDragStart(skill, null)}
                >
                  <GripVertical className="w-3 h-3 mr-1 opacity-50" />
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skill groups */}
      <div className="space-y-2">
        {skillGroups
          .sort((a, b) => a.order - b.order)
          .map((group, index) => (
            <Card
              key={group.id}
              className={cn(
                'transition-all',
                dragOverGroupId === group.id && 'border-cyan-500 bg-cyan-900/10'
              )}
              onDragOver={(e) => handleDragOver(e, group.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, group.id)}
            >
              <CardHeader className="py-2 px-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Expand/collapse button */}
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {expandedGroups.has(group.id) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronUp className="w-4 h-4" />
                      )}
                    </button>

                    {/* Group name (editable) */}
                    {editingGroupId === group.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveGroupName();
                            if (e.key === 'Escape') {
                              setEditingGroupId(null);
                              setEditingName('');
                            }
                          }}
                          className="bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-sm text-gray-200 focus:outline-none focus:border-cyan-500"
                          autoFocus
                        />
                        <Button size="sm" variant="ghost" onClick={saveGroupName}>
                          <Check className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing(group)}
                        className="text-sm font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        {group.name}
                        <Pencil className="w-3 h-3 opacity-50" />
                      </button>
                    )}

                    <Badge variant="default" size="sm">
                      {group.skills.length} skills
                    </Badge>
                    {group.isCustom && (
                      <Badge variant="info" size="sm">
                        Custom
                      </Badge>
                    )}
                  </div>

                  {/* Group actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => moveGroup(group.id, 'up')}
                      disabled={index === 0}
                      className="p-1 h-auto"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => moveGroup(group.id, 'down')}
                      disabled={index === skillGroups.length - 1}
                      className="p-1 h-auto"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteGroup(group.id)}
                      className="p-1 h-auto text-gray-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Skills in group */}
              {expandedGroups.has(group.id) && (
                <CardContent className="p-3 pt-0">
                  {group.skills.length === 0 ? (
                    <div className="text-sm text-gray-500 italic py-2">
                      Drag skills here to add them to this group
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {group.skills.map((skill) => (
                        <Badge
                          key={skill}
                          variant="primary"
                          className="cursor-grab active:cursor-grabbing"
                          draggable
                          onDragStart={() => handleDragStart(skill, group.id)}
                          removable
                          onRemove={() => removeSkillFromGroup(group.id, skill)}
                        >
                          <GripVertical className="w-3 h-3 mr-1 opacity-50" />
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
      </div>

      {/* Empty state */}
      {skillGroups.length === 0 && uncategorizedTechnical.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <Tags className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400">No skills to organize yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Add technical skills to your profile first
            </p>
          </CardContent>
        </Card>
      )}

      {/* Soft skills section (display only, not grouped) */}
      {softSkills.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="py-2 px-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-300">
                Professional Skills
              </span>
              <Badge variant="default" size="sm">
                {softSkills.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="flex flex-wrap gap-2">
              {softSkills.map((skill) => (
                <Badge key={skill} variant="default">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SkillGroupManager;
