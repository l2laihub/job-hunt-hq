/**
 * Unified Profile Data Hook
 * Automatically uses Supabase store when authenticated, falls back to localStorage store
 */
import { useAuth } from '@/src/lib/supabase';
import { useProfileStore, useActiveProfile as useLocalActiveProfile, useCurrentProfile as useLocalCurrentProfile } from '@/src/stores';
import { useSupabaseProfileStore, useSupabaseActiveProfile, useSupabaseCurrentProfile } from '@/src/stores/supabase';
import type { UserProfile, UserProfileWithMeta } from '@/src/types';

interface ProfileActions {
  updateProfile: (updates: Partial<UserProfile>) => void | Promise<void>;
  setProfile: (profile: UserProfile) => void | Promise<void>;
  createProfile: (name: string, copyFrom?: string) => string | Promise<string>;
  deleteProfile: (profileId: string) => void | Promise<void>;
  switchProfile: (profileId: string) => void;
  setDefaultProfile: (profileId: string) => void | Promise<void>;
  renameProfile: (profileId: string, name: string) => void | Promise<void>;
}

interface ProfileData {
  profile: UserProfile;
  activeProfile: UserProfileWithMeta | null;
  profiles: UserProfileWithMeta[];
  activeProfileId: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  actions: ProfileActions;
}

/**
 * Hook that provides profile data and actions, automatically switching between
 * localStorage and Supabase based on authentication status.
 */
export function useProfileData(): ProfileData {
  const { user, isConfigured } = useAuth();
  const isAuthenticated = Boolean(user && isConfigured);

  // Local store hooks
  const localProfile = useLocalCurrentProfile();
  const localActiveProfile = useLocalActiveProfile();
  const localProfiles = useProfileStore((s) => s.profiles);
  const localActiveProfileId = useProfileStore((s) => s.activeProfileId);
  const localUpdateProfile = useProfileStore((s) => s.updateProfile);
  const localSetProfile = useProfileStore((s) => s.setProfile);
  const localCreateProfile = useProfileStore((s) => s.createProfile);
  const localDeleteProfile = useProfileStore((s) => s.deleteProfile);
  const localSwitchProfile = useProfileStore((s) => s.switchProfile);
  const localSetDefaultProfile = useProfileStore((s) => s.setDefaultProfile);
  const localRenameProfile = useProfileStore((s) => s.renameProfile);

  // Supabase store hooks
  const supabaseProfile = useSupabaseCurrentProfile();
  const supabaseActiveProfile = useSupabaseActiveProfile();
  const supabaseProfiles = useSupabaseProfileStore((s) => s.profiles);
  const supabaseActiveProfileId = useSupabaseProfileStore((s) => s.activeProfileId);
  const supabaseIsLoading = useSupabaseProfileStore((s) => s.isLoading);
  const supabaseError = useSupabaseProfileStore((s) => s.error);
  const supabaseUpdateProfile = useSupabaseProfileStore((s) => s.updateProfile);
  const supabaseSetProfile = useSupabaseProfileStore((s) => s.setProfile);
  const supabaseCreateProfile = useSupabaseProfileStore((s) => s.createProfile);
  const supabaseDeleteProfile = useSupabaseProfileStore((s) => s.deleteProfile);
  const supabaseSwitchProfile = useSupabaseProfileStore((s) => s.switchProfile);
  const supabaseSetDefaultProfile = useSupabaseProfileStore((s) => s.setDefaultProfile);
  const supabaseRenameProfile = useSupabaseProfileStore((s) => s.renameProfile);

  if (isAuthenticated) {
    return {
      profile: supabaseProfile,
      activeProfile: supabaseActiveProfile,
      profiles: supabaseProfiles,
      activeProfileId: supabaseActiveProfileId,
      isLoading: supabaseIsLoading,
      error: supabaseError,
      isAuthenticated: true,
      actions: {
        updateProfile: supabaseUpdateProfile,
        setProfile: supabaseSetProfile,
        createProfile: supabaseCreateProfile,
        deleteProfile: supabaseDeleteProfile,
        switchProfile: supabaseSwitchProfile,
        setDefaultProfile: supabaseSetDefaultProfile,
        renameProfile: supabaseRenameProfile,
      },
    };
  }

  // Fallback to localStorage
  return {
    profile: localProfile,
    activeProfile: localActiveProfile,
    profiles: localProfiles,
    activeProfileId: localActiveProfileId,
    isLoading: false,
    error: null,
    isAuthenticated: false,
    actions: {
      updateProfile: localUpdateProfile,
      setProfile: localSetProfile,
      createProfile: localCreateProfile,
      deleteProfile: localDeleteProfile,
      switchProfile: localSwitchProfile,
      setDefaultProfile: localSetDefaultProfile,
      renameProfile: localRenameProfile,
    },
  };
}

export default useProfileData;
