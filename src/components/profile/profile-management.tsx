import React, { useState } from 'react';
import { cn } from '@/src/lib/utils';
import { useProfileData } from '@/src/hooks';
import { useProfileStore, toast } from '@/src/stores';
import { useSupabaseProfileStore } from '@/src/stores/supabase';
import { PROFILE_COLORS } from '@/src/types';
import { Button, Input, Card, CardContent } from '@/src/components/ui';
import {
  User,
  Plus,
  Trash2,
  Copy,
  Star,
  Edit2,
  Check,
  X,
  Palette,
} from 'lucide-react';

export const ProfileManagement: React.FC = () => {
  const { profiles, activeProfile, isAuthenticated, actions } = useProfileData();

  // Get additional methods that aren't in the unified hook
  const localDuplicateProfile = useProfileStore((s) => s.duplicateProfile);
  const localSetProfileColor = useProfileStore((s) => s.setProfileColor);
  const localSetProfileDescription = useProfileStore((s) => s.setProfileDescription);

  const supabaseDuplicateProfile = useSupabaseProfileStore((s) => s.duplicateProfile);
  const supabaseSetProfileColor = useSupabaseProfileStore((s) => s.setProfileColor);
  const supabaseSetProfileDescription = useSupabaseProfileStore((s) => s.setProfileDescription);

  // Use the appropriate store based on auth status
  const duplicateProfile = isAuthenticated ? supabaseDuplicateProfile : localDuplicateProfile;
  const setProfileColor = isAuthenticated ? supabaseSetProfileColor : localSetProfileColor;
  const setProfileDescription = isAuthenticated ? supabaseSetProfileDescription : localSetProfileDescription;

  const {
    createProfile,
    deleteProfile,
    switchProfile,
    setDefaultProfile,
    renameProfile,
  } = actions;

  const [isCreating, setIsCreating] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);

  const handleCreate = async () => {
    if (newProfileName.trim()) {
      try {
        const newId = await createProfile(newProfileName.trim());
        switchProfile(newId);
        setNewProfileName('');
        setIsCreating(false);
        toast.success('Profile created', `"${newProfileName}" has been created`);
      } catch (error) {
        toast.error('Failed to create profile', error instanceof Error ? error.message : 'Unknown error');
      }
    }
  };

  const handleDuplicate = async (profileId: string, profileName: string) => {
    try {
      const newId = await duplicateProfile(profileId, `${profileName} (Copy)`);
      if (newId) {
        toast.success('Profile duplicated', `Created copy of "${profileName}"`);
      }
    } catch (error) {
      toast.error('Failed to duplicate profile', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleDelete = async (profileId: string, profileName: string) => {
    if (profiles.length <= 1) {
      toast.error('Cannot delete', 'You must have at least one profile');
      return;
    }
    if (confirm(`Are you sure you want to delete "${profileName}"? This cannot be undone.`)) {
      try {
        await deleteProfile(profileId);
        toast.success('Profile deleted', `"${profileName}" has been removed`);
      } catch (error) {
        toast.error('Failed to delete profile', error instanceof Error ? error.message : 'Unknown error');
      }
    }
  };

  const handleStartEdit = (profile: typeof profiles[0]) => {
    setEditingId(profile.metadata.id);
    setEditName(profile.metadata.name);
    setEditDescription(profile.metadata.description || '');
  };

  const handleSaveEdit = async (profileId: string) => {
    if (editName.trim()) {
      try {
        await renameProfile(profileId, editName.trim());
        if (editDescription !== undefined) {
          await setProfileDescription(profileId, editDescription);
        }
        setEditingId(null);
        toast.success('Profile updated', 'Changes have been saved');
      } catch (error) {
        toast.error('Failed to update profile', error instanceof Error ? error.message : 'Unknown error');
      }
    }
  };

  const handleSetColor = async (profileId: string, color: string) => {
    try {
      await setProfileColor(profileId, color);
      setShowColorPicker(null);
    } catch (error) {
      toast.error('Failed to update color', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleSetDefault = async (profileId: string, profileName: string) => {
    try {
      await setDefaultProfile(profileId);
      toast.success('Default profile set', `"${profileName}" is now the default`);
    } catch (error) {
      toast.error('Failed to set default', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <Card>
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-white">Manage Profiles</h3>
          </div>
          <span className="text-xs text-gray-500">{profiles.length} profile{profiles.length !== 1 ? 's' : ''}</span>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          Create different profiles for different job search strategies
        </p>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Profile List */}
        {profiles.map((profile) => (
          <div
            key={profile.metadata.id}
            className={cn(
              'relative p-3 rounded-lg border transition-colors',
              profile.metadata.id === activeProfile?.metadata.id
                ? 'border-blue-500/50 bg-blue-900/10'
                : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'
            )}
          >
            {editingId === profile.metadata.id ? (
              // Edit Mode
              <div className="space-y-3">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Profile name"
                  autoFocus
                />
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description (optional)"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleSaveEdit(profile.metadata.id)}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              // View Mode
              <>
                <div className="flex items-start gap-3">
                  {/* Color Indicator */}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setShowColorPicker(
                          showColorPicker === profile.metadata.id ? null : profile.metadata.id
                        )
                      }
                      className="w-3 h-3 rounded-full mt-1.5 cursor-pointer hover:ring-2 hover:ring-white/30 transition-all"
                      style={{ backgroundColor: profile.metadata.color || '#3B82F6' }}
                    />
                    {/* Color Picker Dropdown */}
                    {showColorPicker === profile.metadata.id && (
                      <div className="absolute top-full left-0 mt-2 p-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 flex gap-1 flex-wrap w-24">
                        {PROFILE_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => handleSetColor(profile.metadata.id, color)}
                            className={cn(
                              'w-5 h-5 rounded-full cursor-pointer hover:scale-110 transition-transform',
                              profile.metadata.color === color && 'ring-2 ring-white ring-offset-1 ring-offset-gray-800'
                            )}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Profile Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white truncate">
                        {profile.metadata.name}
                      </span>
                      {profile.metadata.isDefault && (
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                      )}
                      {profile.metadata.id === activeProfile?.metadata.id && (
                        <span className="text-xs px-1.5 py-0.5 bg-blue-600/30 text-blue-400 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    {profile.metadata.description && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {profile.metadata.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {profile.headline || 'No headline set'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {profile.metadata.id !== activeProfile?.metadata.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => switchProfile(profile.metadata.id)}
                        className="text-xs"
                      >
                        Switch
                      </Button>
                    )}
                    <button
                      onClick={() => handleStartEdit(profile)}
                      className="p-1.5 text-gray-500 hover:text-white rounded transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDuplicate(profile.metadata.id, profile.metadata.name)}
                      className="p-1.5 text-gray-500 hover:text-white rounded transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {!profile.metadata.isDefault && (
                      <button
                        onClick={() => handleSetDefault(profile.metadata.id, profile.metadata.name)}
                        className="p-1.5 text-gray-500 hover:text-amber-500 rounded transition-colors"
                        title="Set as default"
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {profiles.length > 1 && (
                      <button
                        onClick={() => handleDelete(profile.metadata.id, profile.metadata.name)}
                        className="p-1.5 text-gray-500 hover:text-red-400 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        ))}

        {/* Create New Profile */}
        {isCreating ? (
          <div className="p-3 rounded-lg border border-gray-700 bg-gray-900/50 space-y-3">
            <Input
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              placeholder="Profile name (e.g. Frontend Focus, Freelance)"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') {
                  setIsCreating(false);
                  setNewProfileName('');
                }
              }}
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsCreating(false);
                  setNewProfileName('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreate}
                disabled={!newProfileName.trim()}
              >
                Create Profile
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            onClick={() => setIsCreating(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="w-full justify-center border border-dashed border-gray-700 hover:border-gray-600"
          >
            Create New Profile
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfileManagement;
