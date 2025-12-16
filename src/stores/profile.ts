import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserProfile, Achievement, Role, Project } from '@/src/types';
import { DEFAULT_PROFILE, STORAGE_KEYS } from '@/src/types';
import { STORAGE_KEYS as KEYS } from '@/src/lib/constants';

interface ProfileState {
  profile: UserProfile;
  isLoading: boolean;
  isDirty: boolean;

  // Actions
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
  exportProfile: () => UserProfile;

  // Dirty state management
  markClean: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: DEFAULT_PROFILE,
      isLoading: false,
      isDirty: false,

      setProfile: (profile) => {
        set({ profile, isDirty: false });
      },

      updateProfile: (updates) => {
        set((state) => ({
          profile: { ...state.profile, ...updates },
          isDirty: true,
        }));
      },

      resetProfile: () => {
        set({ profile: DEFAULT_PROFILE, isDirty: false });
      },

      setName: (name) => {
        set((state) => ({
          profile: { ...state.profile, name },
          isDirty: true,
        }));
      },

      setHeadline: (headline) => {
        set((state) => ({
          profile: { ...state.profile, headline },
          isDirty: true,
        }));
      },

      setYearsExperience: (yearsExperience) => {
        set((state) => ({
          profile: { ...state.profile, yearsExperience },
          isDirty: true,
        }));
      },

      setCurrentSituation: (currentSituation) => {
        set((state) => ({
          profile: { ...state.profile, currentSituation },
          isDirty: true,
        }));
      },

      addSkill: (skill, type) => {
        set((state) => {
          const key = type === 'technical' ? 'technicalSkills' : 'softSkills';
          const skills = state.profile[key];
          if (skills.includes(skill)) return state;
          return {
            profile: { ...state.profile, [key]: [...skills, skill] },
            isDirty: true,
          };
        });
      },

      removeSkill: (skill, type) => {
        set((state) => {
          const key = type === 'technical' ? 'technicalSkills' : 'softSkills';
          return {
            profile: {
              ...state.profile,
              [key]: state.profile[key].filter((s) => s !== skill),
            },
            isDirty: true,
          };
        });
      },

      addRole: (role) => {
        set((state) => ({
          profile: {
            ...state.profile,
            recentRoles: [role, ...state.profile.recentRoles],
          },
          isDirty: true,
        }));
      },

      removeRole: (index) => {
        set((state) => ({
          profile: {
            ...state.profile,
            recentRoles: state.profile.recentRoles.filter((_, i) => i !== index),
          },
          isDirty: true,
        }));
      },

      addAchievement: (achievement) => {
        set((state) => ({
          profile: {
            ...state.profile,
            keyAchievements: [...state.profile.keyAchievements, achievement],
          },
          isDirty: true,
        }));
      },

      removeAchievement: (index) => {
        set((state) => ({
          profile: {
            ...state.profile,
            keyAchievements: state.profile.keyAchievements.filter((_, i) => i !== index),
          },
          isDirty: true,
        }));
      },

      addProject: (project) => {
        set((state) => ({
          profile: {
            ...state.profile,
            activeProjects: [...state.profile.activeProjects, project],
          },
          isDirty: true,
        }));
      },

      removeProject: (index) => {
        set((state) => ({
          profile: {
            ...state.profile,
            activeProjects: state.profile.activeProjects.filter((_, i) => i !== index),
          },
          isDirty: true,
        }));
      },

      addGoal: (goal) => {
        set((state) => ({
          profile: {
            ...state.profile,
            goals: [...state.profile.goals, goal],
          },
          isDirty: true,
        }));
      },

      removeGoal: (index) => {
        set((state) => ({
          profile: {
            ...state.profile,
            goals: state.profile.goals.filter((_, i) => i !== index),
          },
          isDirty: true,
        }));
      },

      updatePreferences: (updates) => {
        set((state) => ({
          profile: {
            ...state.profile,
            preferences: { ...state.profile.preferences, ...updates },
          },
          isDirty: true,
        }));
      },

      updateFreelanceProfile: (updates) => {
        set((state) => ({
          profile: {
            ...state.profile,
            freelanceProfile: { ...state.profile.freelanceProfile, ...updates },
          },
          isDirty: true,
        }));
      },

      importProfile: (profile) => {
        set({ profile, isDirty: false });
      },

      exportProfile: () => {
        return get().profile;
      },

      markClean: () => {
        set({ isDirty: false });
      },
    }),
    {
      name: KEYS.PROFILE,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ profile: state.profile }),
    }
  )
);

// Migration helper for legacy data
export function migrateLegacyProfile(): void {
  const legacyData = localStorage.getItem(KEYS.LEGACY_PROFILE);
  if (legacyData && !localStorage.getItem(KEYS.PROFILE)) {
    try {
      const profile = JSON.parse(legacyData) as UserProfile;
      useProfileStore.getState().importProfile(profile);
      console.log('Migrated profile from legacy storage');
    } catch (error) {
      console.error('Failed to migrate legacy profile:', error);
    }
  }
}
