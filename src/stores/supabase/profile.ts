/**
 * Profile Store - Supabase Version
 * Manages user profiles with Supabase backend
 */
import { create } from 'zustand';
import { useMemo, useEffect } from 'react';
import type {
  UserProfile,
  UserProfileWithMeta,
  Achievement,
  Role,
  Project,
} from '@/src/types';
import { DEFAULT_PROFILE, createProfileMetadata, PROFILE_COLORS } from '@/src/types';
import { profilesService } from '@/src/services/database';

interface ProfileState {
  profiles: UserProfileWithMeta[];
  activeProfileId: string | null;
  isLoading: boolean;
  isDirty: boolean;
  error: string | null;

  // Data fetching
  fetchProfiles: () => Promise<void>;

  // Computed
  getActiveProfile: () => UserProfileWithMeta | null;
  getProfile: () => UserProfile;

  // Profile management
  createProfile: (name: string, copyFrom?: string) => Promise<string>;
  duplicateProfile: (profileId: string, newName: string) => Promise<string>;
  deleteProfile: (profileId: string) => Promise<void>;
  switchProfile: (profileId: string) => void;
  setDefaultProfile: (profileId: string) => Promise<void>;
  renameProfile: (profileId: string, name: string) => Promise<void>;
  setProfileColor: (profileId: string, color: string) => Promise<void>;
  setProfileDescription: (profileId: string, description: string) => Promise<void>;

  // Profile data updates
  setProfile: (profile: UserProfile) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  resetProfile: () => Promise<void>;

  // Field updates
  setName: (name: string) => Promise<void>;
  setHeadline: (headline: string) => Promise<void>;
  setYearsExperience: (years: number) => Promise<void>;
  setCurrentSituation: (situation: string) => Promise<void>;

  // Array operations
  addSkill: (skill: string, type: 'technical' | 'soft') => Promise<void>;
  removeSkill: (skill: string, type: 'technical' | 'soft') => Promise<void>;
  addRole: (role: Role) => Promise<void>;
  removeRole: (index: number) => Promise<void>;
  addAchievement: (achievement: Achievement) => Promise<void>;
  removeAchievement: (index: number) => Promise<void>;
  addProject: (project: Project) => Promise<void>;
  removeProject: (index: number) => Promise<void>;
  addGoal: (goal: string) => Promise<void>;
  removeGoal: (index: number) => Promise<void>;

  // Preferences
  updatePreferences: (updates: Partial<UserProfile['preferences']>) => Promise<void>;
  updateFreelanceProfile: (updates: Partial<UserProfile['freelanceProfile']>) => Promise<void>;

  // Export
  exportProfile: () => UserProfile;
  exportAllProfiles: () => UserProfileWithMeta[];

  // Real-time subscription
  subscribeToChanges: () => () => void;
}

export const useSupabaseProfileStore = create<ProfileState>()((set, get) => ({
  profiles: [],
  activeProfileId: null,
  isLoading: false,
  isDirty: false,
  error: null,

  fetchProfiles: async () => {
    set({ isLoading: true, error: null });
    try {
      const profiles = await profilesService.list();
      const defaultProfile = profiles.find((p) => p.metadata.isDefault);
      set({
        profiles,
        activeProfileId: defaultProfile?.metadata.id || profiles[0]?.metadata.id || null,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch profiles',
        isLoading: false,
      });
    }
  },

  getActiveProfile: () => {
    const { profiles, activeProfileId } = get();
    if (!activeProfileId) return profiles[0] || null;
    return profiles.find((p) => p.metadata.id === activeProfileId) || profiles[0] || null;
  },

  getProfile: () => {
    const activeProfile = get().getActiveProfile();
    if (!activeProfile) return DEFAULT_PROFILE;
    const { metadata: _metadata, ...profile } = activeProfile;
    return profile;
  },

  createProfile: async (name, copyFrom) => {
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
        newProfile = {
          ...DEFAULT_PROFILE,
          metadata: {
            ...createProfileMetadata(name, profiles.length === 0),
            color: PROFILE_COLORS[colorIndex],
          },
        };
      }
    } else {
      newProfile = {
        ...DEFAULT_PROFILE,
        metadata: {
          ...createProfileMetadata(name, profiles.length === 0),
          color: PROFILE_COLORS[colorIndex],
        },
      };
    }

    try {
      const created = await profilesService.create(newProfile);
      set((state) => ({
        profiles: [...state.profiles, created],
        activeProfileId: state.activeProfileId || created.metadata.id,
      }));
      return created.metadata.id;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create profile' });
      throw error;
    }
  },

  duplicateProfile: async (profileId, newName) => {
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

    try {
      const created = await profilesService.create(newProfile);
      set((state) => ({
        profiles: [...state.profiles, created],
      }));
      return created.metadata.id;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to duplicate profile' });
      throw error;
    }
  },

  deleteProfile: async (profileId) => {
    const { profiles, activeProfileId } = get();
    if (profiles.length <= 1) return;

    try {
      await profilesService.delete(profileId);

      const newProfiles = profiles.filter((p) => p.metadata.id !== profileId);
      let newActiveId = activeProfileId;

      if (activeProfileId === profileId) {
        const defaultProfile = newProfiles.find((p) => p.metadata.isDefault);
        newActiveId = defaultProfile?.metadata.id || newProfiles[0]?.metadata.id || null;
      }

      set({
        profiles: newProfiles,
        activeProfileId: newActiveId,
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete profile' });
      throw error;
    }
  },

  switchProfile: (profileId) => {
    const { profiles } = get();
    if (profiles.some((p) => p.metadata.id === profileId)) {
      set({ activeProfileId: profileId });
    }
  },

  setDefaultProfile: async (profileId) => {
    try {
      await profilesService.setDefault(profileId);
      set((state) => ({
        profiles: state.profiles.map((p) => ({
          ...p,
          metadata: {
            ...p.metadata,
            isDefault: p.metadata.id === profileId,
          },
        })),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to set default profile' });
      throw error;
    }
  },

  renameProfile: async (profileId, name) => {
    try {
      // Update in database and get the confirmed result
      const updated = await profilesService.update(profileId, {
        metadata: { name } as any,
      });
      // Use the returned profile from the database to ensure consistency
      set((state) => ({
        profiles: state.profiles.map((p) =>
          p.metadata.id === profileId ? updated : p
        ),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to rename profile' });
      throw error;
    }
  },

  setProfileColor: async (profileId, color) => {
    try {
      const updated = await profilesService.update(profileId, {
        metadata: { color } as any,
      });
      set((state) => ({
        profiles: state.profiles.map((p) =>
          p.metadata.id === profileId ? updated : p
        ),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update profile color' });
      throw error;
    }
  },

  setProfileDescription: async (profileId, description) => {
    try {
      const updated = await profilesService.update(profileId, {
        metadata: { description } as any,
      });
      set((state) => ({
        profiles: state.profiles.map((p) =>
          p.metadata.id === profileId ? updated : p
        ),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update profile description' });
      throw error;
    }
  },

  setProfile: async (profile) => {
    const activeProfile = get().getActiveProfile();
    if (!activeProfile) return;

    try {
      const updated = await profilesService.update(activeProfile.metadata.id, profile as UserProfileWithMeta);
      set((state) => ({
        profiles: state.profiles.map((p) =>
          p.metadata.id === activeProfile.metadata.id ? updated : p
        ),
        isDirty: false,
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update profile' });
      throw error;
    }
  },

  updateProfile: async (updates) => {
    const activeProfile = get().getActiveProfile();
    if (!activeProfile) return;

    try {
      const updated = await profilesService.update(activeProfile.metadata.id, updates as Partial<UserProfileWithMeta>);
      set((state) => ({
        profiles: state.profiles.map((p) =>
          p.metadata.id === activeProfile.metadata.id ? updated : p
        ),
        isDirty: true,
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update profile' });
      throw error;
    }
  },

  resetProfile: async () => {
    const activeProfile = get().getActiveProfile();
    if (!activeProfile) return;

    try {
      const updated = await profilesService.update(activeProfile.metadata.id, {
        ...DEFAULT_PROFILE,
        metadata: activeProfile.metadata,
      });
      set((state) => ({
        profiles: state.profiles.map((p) =>
          p.metadata.id === activeProfile.metadata.id ? updated : p
        ),
        isDirty: false,
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to reset profile' });
      throw error;
    }
  },

  // Simplified field update helpers
  setName: async (name) => get().updateProfile({ name }),
  setHeadline: async (headline) => get().updateProfile({ headline }),
  setYearsExperience: async (yearsExperience) => get().updateProfile({ yearsExperience }),
  setCurrentSituation: async (currentSituation) => get().updateProfile({ currentSituation }),

  addSkill: async (skill, type) => {
    const activeProfile = get().getActiveProfile();
    if (!activeProfile) return;

    const key = type === 'technical' ? 'technicalSkills' : 'softSkills';
    if (activeProfile[key].includes(skill)) return;

    await get().updateProfile({
      [key]: [...activeProfile[key], skill],
    });
  },

  removeSkill: async (skill, type) => {
    const activeProfile = get().getActiveProfile();
    if (!activeProfile) return;

    const key = type === 'technical' ? 'technicalSkills' : 'softSkills';
    await get().updateProfile({
      [key]: activeProfile[key].filter((s) => s !== skill),
    });
  },

  addRole: async (role) => {
    const activeProfile = get().getActiveProfile();
    if (!activeProfile) return;

    await get().updateProfile({
      recentRoles: [role, ...activeProfile.recentRoles],
    });
  },

  removeRole: async (index) => {
    const activeProfile = get().getActiveProfile();
    if (!activeProfile) return;

    await get().updateProfile({
      recentRoles: activeProfile.recentRoles.filter((_, i) => i !== index),
    });
  },

  addAchievement: async (achievement) => {
    const activeProfile = get().getActiveProfile();
    if (!activeProfile) return;

    await get().updateProfile({
      keyAchievements: [...activeProfile.keyAchievements, achievement],
    });
  },

  removeAchievement: async (index) => {
    const activeProfile = get().getActiveProfile();
    if (!activeProfile) return;

    await get().updateProfile({
      keyAchievements: activeProfile.keyAchievements.filter((_, i) => i !== index),
    });
  },

  addProject: async (project) => {
    const activeProfile = get().getActiveProfile();
    if (!activeProfile) return;

    await get().updateProfile({
      activeProjects: [...activeProfile.activeProjects, project],
    });
  },

  removeProject: async (index) => {
    const activeProfile = get().getActiveProfile();
    if (!activeProfile) return;

    await get().updateProfile({
      activeProjects: activeProfile.activeProjects.filter((_, i) => i !== index),
    });
  },

  addGoal: async (goal) => {
    const activeProfile = get().getActiveProfile();
    if (!activeProfile) return;

    await get().updateProfile({
      goals: [...activeProfile.goals, goal],
    });
  },

  removeGoal: async (index) => {
    const activeProfile = get().getActiveProfile();
    if (!activeProfile) return;

    await get().updateProfile({
      goals: activeProfile.goals.filter((_, i) => i !== index),
    });
  },

  updatePreferences: async (updates) => {
    const activeProfile = get().getActiveProfile();
    if (!activeProfile) return;

    await get().updateProfile({
      preferences: { ...activeProfile.preferences, ...updates },
    });
  },

  updateFreelanceProfile: async (updates) => {
    const activeProfile = get().getActiveProfile();
    if (!activeProfile) return;

    await get().updateProfile({
      freelanceProfile: { ...activeProfile.freelanceProfile, ...updates },
    });
  },

  exportProfile: () => {
    return get().getProfile();
  },

  exportAllProfiles: () => {
    return get().profiles;
  },

  subscribeToChanges: () => {
    return profilesService.subscribe((profiles) => {
      const { activeProfileId } = get();
      const defaultProfile = profiles.find((p) => p.metadata.isDefault);
      set({
        profiles,
        activeProfileId: activeProfileId || defaultProfile?.metadata.id || profiles[0]?.metadata.id || null,
      });
    });
  },
}));

// Selector hooks
export const useSupabaseAllProfiles = () => useSupabaseProfileStore((state) => state.profiles);
export const useSupabaseActiveProfileId = () => useSupabaseProfileStore((state) => state.activeProfileId);

export function useSupabaseActiveProfile(): UserProfileWithMeta | null {
  const profiles = useSupabaseProfileStore((state) => state.profiles);
  const activeProfileId = useSupabaseProfileStore((state) => state.activeProfileId);

  return useMemo(() => {
    if (!activeProfileId) return profiles[0] || null;
    return profiles.find((p) => p.metadata.id === activeProfileId) || profiles[0] || null;
  }, [profiles, activeProfileId]);
}

export function useSupabaseCurrentProfile(): UserProfile {
  const profiles = useSupabaseProfileStore((state) => state.profiles);
  const activeProfileId = useSupabaseProfileStore((state) => state.activeProfileId);

  return useMemo(() => {
    const activeProfile =
      profiles.find((p) => p.metadata.id === activeProfileId) || profiles[0];
    if (!activeProfile) return DEFAULT_PROFILE;
    const { metadata: _metadata, ...profile } = activeProfile;
    return profile;
  }, [profiles, activeProfileId]);
}
