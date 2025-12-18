import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useMemo, useEffect } from 'react';
import type {
  UserProfile,
  UserProfileWithMeta,
  ProfileMetadata,
  Achievement,
  Role,
  Project,
} from '@/src/types';
import {
  DEFAULT_PROFILE,
  createProfileMetadata,
  createDefaultProfileWithMeta,
  PROFILE_COLORS,
} from '@/src/types';
import { STORAGE_KEYS } from '@/src/lib/constants';
import { createSyncedStorage, setupStoreSync } from '@/src/lib/storage-sync';

interface ProfileState {
  // Multi-profile state
  profiles: UserProfileWithMeta[];
  activeProfileId: string | null;

  // Loading state
  isLoading: boolean;
  isDirty: boolean;

  // Computed - current active profile
  getActiveProfile: () => UserProfileWithMeta | null;
  getProfile: () => UserProfile; // For backward compatibility

  // Profile management actions
  createProfile: (name: string, copyFrom?: string) => string;
  duplicateProfile: (profileId: string, newName: string) => string;
  deleteProfile: (profileId: string) => void;
  switchProfile: (profileId: string) => void;
  setDefaultProfile: (profileId: string) => void;
  renameProfile: (profileId: string, name: string) => void;
  setProfileColor: (profileId: string, color: string) => void;
  setProfileDescription: (profileId: string, description: string) => void;

  // Legacy single-profile actions (operate on active profile)
  setProfile: (profile: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  resetProfile: () => void;

  // Specific field updates
  setName: (name: string) => void;
  setHeadline: (headline: string) => void;
  setYearsExperience: (years: number) => void;
  setCurrentSituation: (situation: string) => void;

  // Array field operations
  addSkill: (skill: string, type: 'technical' | 'soft') => void;
  removeSkill: (skill: string, type: 'technical' | 'soft') => void;
  addRole: (role: Role) => void;
  removeRole: (index: number) => void;
  addAchievement: (achievement: Achievement) => void;
  removeAchievement: (index: number) => void;
  addProject: (project: Project) => void;
  removeProject: (index: number) => void;
  addGoal: (goal: string) => void;
  removeGoal: (index: number) => void;

  // Preferences
  updatePreferences: (updates: Partial<UserProfile['preferences']>) => void;
  updateFreelanceProfile: (updates: Partial<UserProfile['freelanceProfile']>) => void;

  // Import/Export
  importProfile: (profile: UserProfile) => void;
  importProfileWithMeta: (profile: UserProfileWithMeta) => void;
  importProfiles: (profiles: UserProfileWithMeta[]) => void;
  exportProfile: () => UserProfile;
  exportAllProfiles: () => UserProfileWithMeta[];

  // Dirty state management
  markClean: () => void;
}

// Helper to update a specific profile in the array
function updateProfileInArray(
  profiles: UserProfileWithMeta[],
  profileId: string,
  updater: (profile: UserProfileWithMeta) => UserProfileWithMeta
): UserProfileWithMeta[] {
  return profiles.map((p) => (p.metadata.id === profileId ? updater(p) : p));
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfileId: null,
      isLoading: false,
      isDirty: false,

      // Get active profile
      getActiveProfile: () => {
        const { profiles, activeProfileId } = get();
        if (!activeProfileId) return profiles[0] || null;
        return profiles.find((p) => p.metadata.id === activeProfileId) || profiles[0] || null;
      },

      // For backward compatibility - returns the profile data without metadata
      getProfile: () => {
        const activeProfile = get().getActiveProfile();
        if (!activeProfile) return DEFAULT_PROFILE;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { metadata, ...profile } = activeProfile;
        return profile;
      },

      // Create a new profile
      createProfile: (name, copyFrom) => {
        const { profiles } = get();
        const colorIndex = profiles.length % PROFILE_COLORS.length;

        let newProfile: UserProfileWithMeta;

        if (copyFrom) {
          const sourceProfile = profiles.find((p) => p.metadata.id === copyFrom);
          if (sourceProfile) {
            newProfile = {
              ...sourceProfile,
              metadata: {
                ...createProfileMetadata(name, profiles.length === 0),
                color: PROFILE_COLORS[colorIndex],
              },
            };
          } else {
            newProfile = createDefaultProfileWithMeta(name, profiles.length === 0);
            newProfile.metadata.color = PROFILE_COLORS[colorIndex];
          }
        } else {
          newProfile = createDefaultProfileWithMeta(name, profiles.length === 0);
          newProfile.metadata.color = PROFILE_COLORS[colorIndex];
        }

        set((state) => ({
          profiles: [...state.profiles, newProfile],
          activeProfileId: state.activeProfileId || newProfile.metadata.id,
        }));

        return newProfile.metadata.id;
      },

      // Duplicate an existing profile
      duplicateProfile: (profileId, newName) => {
        const { profiles } = get();
        const sourceProfile = profiles.find((p) => p.metadata.id === profileId);
        if (!sourceProfile) return '';

        const colorIndex = profiles.length % PROFILE_COLORS.length;
        const newProfile: UserProfileWithMeta = {
          ...sourceProfile,
          metadata: {
            ...createProfileMetadata(newName, false),
            color: PROFILE_COLORS[colorIndex],
            description: `Duplicated from ${sourceProfile.metadata.name}`,
          },
        };

        set((state) => ({
          profiles: [...state.profiles, newProfile],
        }));

        return newProfile.metadata.id;
      },

      // Delete a profile
      deleteProfile: (profileId) => {
        const { profiles, activeProfileId } = get();
        if (profiles.length <= 1) return; // Can't delete last profile

        const newProfiles = profiles.filter((p) => p.metadata.id !== profileId);

        // If deleting active profile, switch to another one
        let newActiveId = activeProfileId;
        if (activeProfileId === profileId) {
          const defaultProfile = newProfiles.find((p) => p.metadata.isDefault);
          newActiveId = defaultProfile?.metadata.id || newProfiles[0]?.metadata.id || null;
        }

        // If we deleted the default, make the first one default
        if (profiles.find((p) => p.metadata.id === profileId)?.metadata.isDefault) {
          if (newProfiles.length > 0) {
            newProfiles[0].metadata.isDefault = true;
          }
        }

        set({
          profiles: newProfiles,
          activeProfileId: newActiveId,
        });
      },

      // Switch to a different profile
      switchProfile: (profileId) => {
        const { profiles } = get();
        if (profiles.some((p) => p.metadata.id === profileId)) {
          set({ activeProfileId: profileId });
        }
      },

      // Set a profile as default
      setDefaultProfile: (profileId) => {
        set((state) => ({
          profiles: state.profiles.map((p) => ({
            ...p,
            metadata: {
              ...p.metadata,
              isDefault: p.metadata.id === profileId,
            },
          })),
        }));
      },

      // Rename a profile
      renameProfile: (profileId, name) => {
        set((state) => ({
          profiles: updateProfileInArray(state.profiles, profileId, (p) => ({
            ...p,
            metadata: { ...p.metadata, name, updatedAt: new Date().toISOString() },
          })),
          isDirty: true,
        }));
      },

      // Set profile color
      setProfileColor: (profileId, color) => {
        set((state) => ({
          profiles: updateProfileInArray(state.profiles, profileId, (p) => ({
            ...p,
            metadata: { ...p.metadata, color, updatedAt: new Date().toISOString() },
          })),
        }));
      },

      // Set profile description
      setProfileDescription: (profileId, description) => {
        set((state) => ({
          profiles: updateProfileInArray(state.profiles, profileId, (p) => ({
            ...p,
            metadata: { ...p.metadata, description, updatedAt: new Date().toISOString() },
          })),
        }));
      },

      // Legacy: Set entire profile on active profile
      setProfile: (profile) => {
        const activeProfile = get().getActiveProfile();
        if (!activeProfile) {
          // Create first profile if none exists
          const newProfile: UserProfileWithMeta = {
            ...profile,
            metadata: createProfileMetadata('My Profile', true),
          };
          newProfile.metadata.color = PROFILE_COLORS[0];
          set({
            profiles: [newProfile],
            activeProfileId: newProfile.metadata.id,
            isDirty: false,
          });
        } else {
          set((state) => ({
            profiles: updateProfileInArray(state.profiles, activeProfile.metadata.id, (p) => ({
              ...p,
              ...profile,
              metadata: { ...p.metadata, updatedAt: new Date().toISOString() },
            })),
            isDirty: false,
          }));
        }
      },

      // Legacy: Update active profile
      updateProfile: (updates) => {
        const activeProfile = get().getActiveProfile();
        if (!activeProfile) return;

        set((state) => ({
          profiles: updateProfileInArray(state.profiles, activeProfile.metadata.id, (p) => ({
            ...p,
            ...updates,
            metadata: { ...p.metadata, updatedAt: new Date().toISOString() },
          })),
          isDirty: true,
        }));
      },

      // Reset active profile to defaults
      resetProfile: () => {
        const activeProfile = get().getActiveProfile();
        if (!activeProfile) return;

        set((state) => ({
          profiles: updateProfileInArray(state.profiles, activeProfile.metadata.id, (p) => ({
            ...DEFAULT_PROFILE,
            metadata: { ...p.metadata, updatedAt: new Date().toISOString() },
          })),
          isDirty: false,
        }));
      },

      // Field update helpers - all operate on active profile
      setName: (name) => {
        const activeProfile = get().getActiveProfile();
        if (!activeProfile) return;
        set((state) => ({
          profiles: updateProfileInArray(state.profiles, activeProfile.metadata.id, (p) => ({
            ...p,
            name,
            metadata: { ...p.metadata, updatedAt: new Date().toISOString() },
          })),
          isDirty: true,
        }));
      },

      setHeadline: (headline) => {
        const activeProfile = get().getActiveProfile();
        if (!activeProfile) return;
        set((state) => ({
          profiles: updateProfileInArray(state.profiles, activeProfile.metadata.id, (p) => ({
            ...p,
            headline,
            metadata: { ...p.metadata, updatedAt: new Date().toISOString() },
          })),
          isDirty: true,
        }));
      },

      setYearsExperience: (yearsExperience) => {
        const activeProfile = get().getActiveProfile();
        if (!activeProfile) return;
        set((state) => ({
          profiles: updateProfileInArray(state.profiles, activeProfile.metadata.id, (p) => ({
            ...p,
            yearsExperience,
            metadata: { ...p.metadata, updatedAt: new Date().toISOString() },
          })),
          isDirty: true,
        }));
      },

      setCurrentSituation: (currentSituation) => {
        const activeProfile = get().getActiveProfile();
        if (!activeProfile) return;
        set((state) => ({
          profiles: updateProfileInArray(state.profiles, activeProfile.metadata.id, (p) => ({
            ...p,
            currentSituation,
            metadata: { ...p.metadata, updatedAt: new Date().toISOString() },
          })),
          isDirty: true,
        }));
      },

      addSkill: (skill, type) => {
        const activeProfile = get().getActiveProfile();
        if (!activeProfile) return;
        const key = type === 'technical' ? 'technicalSkills' : 'softSkills';
        if (activeProfile[key].includes(skill)) return;

        set((state) => ({
          profiles: updateProfileInArray(state.profiles, activeProfile.metadata.id, (p) => ({
            ...p,
            [key]: [...p[key], skill],
            metadata: { ...p.metadata, updatedAt: new Date().toISOString() },
          })),
          isDirty: true,
        }));
      },

      removeSkill: (skill, type) => {
        const activeProfile = get().getActiveProfile();
        if (!activeProfile) return;
        const key = type === 'technical' ? 'technicalSkills' : 'softSkills';

        set((state) => ({
          profiles: updateProfileInArray(state.profiles, activeProfile.metadata.id, (p) => ({
            ...p,
            [key]: p[key].filter((s) => s !== skill),
            metadata: { ...p.metadata, updatedAt: new Date().toISOString() },
          })),
          isDirty: true,
        }));
      },

      addRole: (role) => {
        const activeProfile = get().getActiveProfile();
        if (!activeProfile) return;

        set((state) => ({
          profiles: updateProfileInArray(state.profiles, activeProfile.metadata.id, (p) => ({
            ...p,
            recentRoles: [role, ...p.recentRoles],
            metadata: { ...p.metadata, updatedAt: new Date().toISOString() },
          })),
          isDirty: true,
        }));
      },

      removeRole: (index) => {
        const activeProfile = get().getActiveProfile();
        if (!activeProfile) return;

        set((state) => ({
          profiles: updateProfileInArray(state.profiles, activeProfile.metadata.id, (p) => ({
            ...p,
            recentRoles: p.recentRoles.filter((_, i) => i !== index),
            metadata: { ...p.metadata, updatedAt: new Date().toISOString() },
          })),
          isDirty: true,
        }));
      },

      addAchievement: (achievement) => {
        const activeProfile = get().getActiveProfile();
        if (!activeProfile) return;

        set((state) => ({
          profiles: updateProfileInArray(state.profiles, activeProfile.metadata.id, (p) => ({
            ...p,
            keyAchievements: [...p.keyAchievements, achievement],
            metadata: { ...p.metadata, updatedAt: new Date().toISOString() },
          })),
          isDirty: true,
        }));
      },

      removeAchievement: (index) => {
        const activeProfile = get().getActiveProfile();
        if (!activeProfile) return;

        set((state) => ({
          profiles: updateProfileInArray(state.profiles, activeProfile.metadata.id, (p) => ({
            ...p,
            keyAchievements: p.keyAchievements.filter((_, i) => i !== index),
            metadata: { ...p.metadata, updatedAt: new Date().toISOString() },
          })),
          isDirty: true,
        }));
      },

      addProject: (project) => {
        const activeProfile = get().getActiveProfile();
        if (!activeProfile) return;

        set((state) => ({
          profiles: updateProfileInArray(state.profiles, activeProfile.metadata.id, (p) => ({
            ...p,
            activeProjects: [...p.activeProjects, project],
            metadata: { ...p.metadata, updatedAt: new Date().toISOString() },
          })),
          isDirty: true,
        }));
      },

      removeProject: (index) => {
        const activeProfile = get().getActiveProfile();
        if (!activeProfile) return;

        set((state) => ({
          profiles: updateProfileInArray(state.profiles, activeProfile.metadata.id, (p) => ({
            ...p,
            activeProjects: p.activeProjects.filter((_, i) => i !== index),
            metadata: { ...p.metadata, updatedAt: new Date().toISOString() },
          })),
          isDirty: true,
        }));
      },

      addGoal: (goal) => {
        const activeProfile = get().getActiveProfile();
        if (!activeProfile) return;

        set((state) => ({
          profiles: updateProfileInArray(state.profiles, activeProfile.metadata.id, (p) => ({
            ...p,
            goals: [...p.goals, goal],
            metadata: { ...p.metadata, updatedAt: new Date().toISOString() },
          })),
          isDirty: true,
        }));
      },

      removeGoal: (index) => {
        const activeProfile = get().getActiveProfile();
        if (!activeProfile) return;

        set((state) => ({
          profiles: updateProfileInArray(state.profiles, activeProfile.metadata.id, (p) => ({
            ...p,
            goals: p.goals.filter((_, i) => i !== index),
            metadata: { ...p.metadata, updatedAt: new Date().toISOString() },
          })),
          isDirty: true,
        }));
      },

      updatePreferences: (updates) => {
        const activeProfile = get().getActiveProfile();
        if (!activeProfile) return;

        set((state) => ({
          profiles: updateProfileInArray(state.profiles, activeProfile.metadata.id, (p) => ({
            ...p,
            preferences: { ...p.preferences, ...updates },
            metadata: { ...p.metadata, updatedAt: new Date().toISOString() },
          })),
          isDirty: true,
        }));
      },

      updateFreelanceProfile: (updates) => {
        const activeProfile = get().getActiveProfile();
        if (!activeProfile) return;

        set((state) => ({
          profiles: updateProfileInArray(state.profiles, activeProfile.metadata.id, (p) => ({
            ...p,
            freelanceProfile: { ...p.freelanceProfile, ...updates },
            metadata: { ...p.metadata, updatedAt: new Date().toISOString() },
          })),
          isDirty: true,
        }));
      },

      // Import a single profile (legacy - adds to active)
      importProfile: (profile) => {
        const activeProfile = get().getActiveProfile();
        if (!activeProfile) {
          // Create first profile
          const newProfile: UserProfileWithMeta = {
            ...profile,
            metadata: createProfileMetadata('Imported Profile', true),
          };
          newProfile.metadata.color = PROFILE_COLORS[0];
          set({
            profiles: [newProfile],
            activeProfileId: newProfile.metadata.id,
            isDirty: false,
          });
        } else {
          // Update active profile
          set((state) => ({
            profiles: updateProfileInArray(state.profiles, activeProfile.metadata.id, (p) => ({
              ...p,
              ...profile,
              metadata: { ...p.metadata, updatedAt: new Date().toISOString() },
            })),
            isDirty: false,
          }));
        }
      },

      // Import a profile with metadata (adds as new profile)
      importProfileWithMeta: (profile) => {
        const { profiles } = get();
        const existingIds = new Set(profiles.map((p) => p.metadata.id));

        // If profile with same ID exists, update it; otherwise add
        if (existingIds.has(profile.metadata.id)) {
          set((state) => ({
            profiles: updateProfileInArray(state.profiles, profile.metadata.id, () => ({
              ...profile,
              metadata: { ...profile.metadata, updatedAt: new Date().toISOString() },
            })),
          }));
        } else {
          set((state) => ({
            profiles: [...state.profiles, profile],
            activeProfileId: state.activeProfileId || profile.metadata.id,
          }));
        }
      },

      // Import multiple profiles
      importProfiles: (importedProfiles) => {
        const { profiles } = get();
        const existingIds = new Set(profiles.map((p) => p.metadata.id));

        const newProfiles = importedProfiles.filter((p) => !existingIds.has(p.metadata.id));
        const updatedProfiles = profiles.map((existing) => {
          const imported = importedProfiles.find((p) => p.metadata.id === existing.metadata.id);
          return imported || existing;
        });

        const allProfiles = [...updatedProfiles, ...newProfiles];

        // Ensure at least one is default
        if (!allProfiles.some((p) => p.metadata.isDefault) && allProfiles.length > 0) {
          allProfiles[0].metadata.isDefault = true;
        }

        set((state) => ({
          profiles: allProfiles,
          activeProfileId: state.activeProfileId || allProfiles[0]?.metadata.id || null,
        }));
      },

      // Export current profile (without metadata)
      exportProfile: () => {
        const activeProfile = get().getActiveProfile();
        if (!activeProfile) return DEFAULT_PROFILE;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { metadata, ...profile } = activeProfile;
        return profile;
      },

      // Export all profiles with metadata
      exportAllProfiles: () => {
        return get().profiles;
      },

      markClean: () => {
        set({ isDirty: false });
      },
    }),
    {
      name: STORAGE_KEYS.PROFILE,
      storage: createJSONStorage(() => createSyncedStorage()),
      partialize: (state) => ({
        profiles: state.profiles,
        activeProfileId: state.activeProfileId,
      }),
    }
  )
);

// Set up cross-tab sync for profile store
let profileSyncUnsubscribe: (() => void) | null = null;

export function initProfileSync(): void {
  if (profileSyncUnsubscribe) return; // Already initialized

  profileSyncUnsubscribe = setupStoreSync<ProfileState>(
    STORAGE_KEYS.PROFILE,
    (updates) => useProfileStore.setState(updates),
    () => ['profiles', 'activeProfileId']
  );
}

export function destroyProfileSync(): void {
  if (profileSyncUnsubscribe) {
    profileSyncUnsubscribe();
    profileSyncUnsubscribe = null;
  }
}

// Helper function to get active profile (not a hook - use for computations)
export function getActiveProfileFromState(profiles: UserProfileWithMeta[], activeProfileId: string | null): UserProfileWithMeta | null {
  if (!activeProfileId) return profiles[0] || null;
  return profiles.find((p) => p.metadata.id === activeProfileId) || profiles[0] || null;
}

// Helper function to get profile without metadata (not a hook)
export function getProfileWithoutMeta(activeProfile: UserProfileWithMeta | null): UserProfile {
  if (!activeProfile) return DEFAULT_PROFILE;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { metadata, ...profile } = activeProfile;
  return profile;
}

// Simple primitive selectors - these are stable
export const useAllProfiles = () => useProfileStore((state) => state.profiles);
export const useActiveProfileId = () => useProfileStore((state) => state.activeProfileId);

// Computed selectors using useMemo internally to avoid infinite loops
// These return stable references by comparing profiles array reference and activeProfileId

export function useActiveProfile(): UserProfileWithMeta | null {
  const profiles = useProfileStore((state) => state.profiles);
  const activeProfileId = useProfileStore((state) => state.activeProfileId);

  return useMemo(() => {
    return getActiveProfileFromState(profiles, activeProfileId);
  }, [profiles, activeProfileId]);
}

export function useCurrentProfile(): UserProfile {
  const profiles = useProfileStore((state) => state.profiles);
  const activeProfileId = useProfileStore((state) => state.activeProfileId);

  return useMemo(() => {
    const activeProfile = getActiveProfileFromState(profiles, activeProfileId);
    return getProfileWithoutMeta(activeProfile);
  }, [profiles, activeProfileId]);
}

// Migration helper for legacy data
export function migrateLegacyProfile(): void {
  const store = useProfileStore.getState();

  // If we already have profiles, skip migration
  if (store.profiles.length > 0) {
    return;
  }

  // Check for v2 format (old single profile)
  const v2Data = localStorage.getItem(STORAGE_KEYS.PROFILE);
  if (v2Data) {
    try {
      const parsed = JSON.parse(v2Data);
      // Check if it's the old format (has 'profile' key but no 'profiles' array)
      if (parsed.state?.profile && !parsed.state?.profiles) {
        const oldProfile = parsed.state.profile as UserProfile;
        const migratedProfile: UserProfileWithMeta = {
          ...oldProfile,
          metadata: createProfileMetadata('My Profile', true),
        };
        migratedProfile.metadata.color = PROFILE_COLORS[0];

        store.importProfileWithMeta(migratedProfile);
        console.log('Migrated profile from v2 format to multi-profile');
        return;
      }
    } catch (error) {
      console.error('Failed to parse v2 profile data:', error);
    }
  }

  // Check for legacy format
  const legacyData = localStorage.getItem(STORAGE_KEYS.LEGACY_PROFILE);
  if (legacyData) {
    try {
      const profile = JSON.parse(legacyData) as UserProfile;
      const migratedProfile: UserProfileWithMeta = {
        ...profile,
        metadata: createProfileMetadata('My Profile', true),
      };
      migratedProfile.metadata.color = PROFILE_COLORS[0];

      store.importProfileWithMeta(migratedProfile);
      console.log('Migrated profile from legacy storage to multi-profile');
      return;
    } catch (error) {
      console.error('Failed to migrate legacy profile:', error);
    }
  }

  // No existing data - create a default profile
  if (store.profiles.length === 0) {
    store.createProfile('My Profile');
    store.setDefaultProfile(store.profiles[0]?.metadata.id || '');
    console.log('Created default profile');
  }
}
