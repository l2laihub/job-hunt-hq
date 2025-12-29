/**
 * localStorage to Supabase Migration Tool
 * One-time migration utility to transfer existing data to Supabase
 */
import { supabase } from '@/src/lib/supabase';
import { STORAGE_KEYS } from '@/src/lib/constants';
import { profilesService } from './profiles';
import { applicationsService } from './applications';
import { storiesService } from './stories';
import { companyResearchService } from './company-research';
import { technicalAnswersService } from './technical-answers';
import { analyzedJobsService } from './analyzed-jobs';
import { isValidUUID, ensureUUID } from '@/src/lib/utils';
import type { UserProfileWithMeta, JobApplication, Experience, CompanyResearch, TechnicalAnswer, AnalyzedJob } from '@/src/types';

// Type for ID mapping: old ID -> new UUID
type IdMapping = Map<string, string>;

/**
 * Build ID mapping for a collection of items
 * Creates a map from old IDs to new UUIDs for items that don't have valid UUIDs
 */
function buildIdMapping<T extends { id?: string }>(items: T[]): IdMapping {
  const mapping = new Map<string, string>();
  for (const item of items) {
    if (item.id) {
      if (!isValidUUID(item.id)) {
        // Generate a new UUID for this item
        mapping.set(item.id, ensureUUID(item.id));
      } else {
        // Keep the existing UUID
        mapping.set(item.id, item.id);
      }
    }
  }
  return mapping;
}

/**
 * Build profile ID mapping from profiles (for metadata.id)
 */
function buildProfileIdMapping(profiles: UserProfileWithMeta[]): IdMapping {
  const mapping = new Map<string, string>();
  for (const profile of profiles) {
    const oldId = profile.metadata?.id;
    if (oldId) {
      if (!isValidUUID(oldId)) {
        mapping.set(oldId, ensureUUID(oldId));
      } else {
        mapping.set(oldId, oldId);
      }
    }
  }
  return mapping;
}

/**
 * Apply profile ID mapping to a record's profileId field
 * If the profileId is not in the mapping and is not a valid UUID, generate a new UUID
 */
function mapProfileId(profileId: string | undefined, profileMapping: IdMapping): string | undefined {
  if (!profileId) return undefined;

  // First check if we have a mapping for this ID
  const mappedId = profileMapping.get(profileId);
  if (mappedId) return mappedId;

  // If no mapping exists but it's already a valid UUID, use it
  if (isValidUUID(profileId)) return profileId;

  // Otherwise, generate a new UUID for this orphaned reference
  // This handles cases where profile data was lost or never existed
  console.warn(`No mapping found for profileId "${profileId}", generating new UUID`);
  return ensureUUID(profileId);
}

/**
 * Convert profile with new UUID
 */
function convertProfile(profile: UserProfileWithMeta, profileMapping: IdMapping): UserProfileWithMeta {
  const oldId = profile.metadata?.id;
  const newId = oldId ? (profileMapping.get(oldId) || oldId) : oldId;

  return {
    ...profile,
    metadata: {
      ...profile.metadata,
      id: newId || profile.metadata.id,
    },
  };
}

/**
 * Convert application with new UUIDs
 */
function convertApplication(app: JobApplication, appMapping: IdMapping, profileMapping: IdMapping): JobApplication {
  const oldId = app.id;
  const newId = appMapping.get(oldId) || oldId;

  return {
    ...app,
    id: newId,
    profileId: mapProfileId(app.profileId, profileMapping),
  };
}

/**
 * Convert story with new UUIDs
 */
function convertStory(story: Experience, storyMapping: IdMapping, profileMapping: IdMapping): Experience {
  const oldId = story.id;
  const newId = storyMapping.get(oldId) || oldId;

  return {
    ...story,
    id: newId,
    profileId: mapProfileId(story.profileId, profileMapping),
  };
}

/**
 * Convert company research with new UUID
 */
function convertResearch(research: CompanyResearch, researchMapping: IdMapping): CompanyResearch {
  const oldId = research.id;
  const newId = researchMapping.get(oldId) || oldId;

  return {
    ...research,
    id: newId,
  };
}

/**
 * Convert technical answer with new UUIDs
 */
function convertAnswer(answer: TechnicalAnswer, answerMapping: IdMapping, profileMapping: IdMapping): TechnicalAnswer {
  const oldId = answer.id;
  const newId = answerMapping.get(oldId) || oldId;

  return {
    ...answer,
    id: newId,
    profileId: mapProfileId(answer.profileId, profileMapping),
  };
}

/**
 * Map an application ID with proper UUID conversion
 */
function mapApplicationId(applicationId: string | undefined, appMapping: IdMapping): string | undefined {
  if (!applicationId) return undefined;

  // First check if we have a mapping for this ID
  const mappedId = appMapping.get(applicationId);
  if (mappedId) return mappedId;

  // If no mapping exists but it's already a valid UUID, use it
  if (isValidUUID(applicationId)) return applicationId;

  // Otherwise, generate a new UUID for this orphaned reference
  console.warn(`No mapping found for applicationId "${applicationId}", generating new UUID`);
  return ensureUUID(applicationId);
}

/**
 * Convert analyzed job with new UUIDs
 */
function convertAnalyzedJob(
  job: AnalyzedJob,
  jobMapping: IdMapping,
  profileMapping: IdMapping,
  appMapping: IdMapping
): AnalyzedJob {
  const oldId = job.id;
  const newId = jobMapping.get(oldId) || oldId;

  return {
    ...job,
    id: newId,
    profileId: mapProfileId(job.profileId, profileMapping),
    applicationId: mapApplicationId(job.applicationId, appMapping),
  };
}

interface MigrationResult {
  success: boolean;
  migrated: {
    profiles: number;
    applications: number;
    stories: number;
    companyResearch: number;
    technicalAnswers: number;
    analyzedJobs: number;
  };
  errors: string[];
}

/**
 * Parse localStorage data with Zustand persist format
 */
function parseZustandStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    // Zustand persist wraps data in { state: {...}, version: number }
    if (parsed.state) {
      return parsed.state as T;
    }
    return parsed as T;
  } catch (error) {
    console.error(`Failed to parse ${key}:`, error);
    return null;
  }
}

/**
 * Check if migration has already been completed
 */
export function isMigrationComplete(): boolean {
  return localStorage.getItem('jhq:migration:v1') !== null;
}

/**
 * Check if user has localStorage data to migrate
 * Only returns true if there is actual meaningful data (not just empty arrays from Zustand persist)
 */
export function hasLocalStorageData(): boolean {
  // If migration is already complete, don't prompt again
  if (isMigrationComplete()) {
    return false;
  }

  // Check for actual data content, not just existence of keys
  const summary = getLocalStorageSummary();
  const totalItems = Object.values(summary).reduce((a, b) => a + b, 0);

  // Only return true if there's at least one item to migrate
  return totalItems > 0;
}

/**
 * Get summary of localStorage data
 */
export function getLocalStorageSummary(): {
  profiles: number;
  applications: number;
  stories: number;
  companyResearch: number;
  technicalAnswers: number;
  analyzedJobs: number;
} {
  const profileData = parseZustandStorage<{ profiles?: UserProfileWithMeta[] }>(STORAGE_KEYS.PROFILE);
  const appData = parseZustandStorage<{ applications?: JobApplication[] }>(STORAGE_KEYS.APPLICATIONS);
  const storyData = parseZustandStorage<{ stories?: Experience[] }>(STORAGE_KEYS.STORIES);
  const researchData = parseZustandStorage<{ researches?: CompanyResearch[] }>(STORAGE_KEYS.COMPANY_RESEARCH);
  const answerData = parseZustandStorage<{ answers?: TechnicalAnswer[] }>(STORAGE_KEYS.TECHNICAL_ANSWERS);
  const jobData = parseZustandStorage<{ jobs?: AnalyzedJob[] }>(STORAGE_KEYS.ANALYZED_JOBS);

  return {
    profiles: profileData?.profiles?.length || 0,
    applications: appData?.applications?.length || 0,
    stories: storyData?.stories?.length || 0,
    companyResearch: researchData?.researches?.length || 0,
    technicalAnswers: answerData?.answers?.length || 0,
    analyzedJobs: jobData?.jobs?.length || 0,
  };
}

/**
 * Migrate all localStorage data to Supabase
 * Handles UUID conversion for old-format IDs and maintains foreign key relationships
 */
export async function migrateLocalStorageToSupabase(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    migrated: {
      profiles: 0,
      applications: 0,
      stories: 0,
      companyResearch: 0,
      technicalAnswers: 0,
      analyzedJobs: 0,
    },
    errors: [],
  };

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    result.success = false;
    result.errors.push('User not authenticated');
    return result;
  }

  // First, load all data and build ID mappings
  const profileData = parseZustandStorage<{ profiles?: UserProfileWithMeta[]; activeProfileId?: string }>(STORAGE_KEYS.PROFILE);
  const appData = parseZustandStorage<{ applications?: JobApplication[] }>(STORAGE_KEYS.APPLICATIONS);
  const storyData = parseZustandStorage<{ stories?: Experience[] }>(STORAGE_KEYS.STORIES);
  const researchData = parseZustandStorage<{ researches?: CompanyResearch[] }>(STORAGE_KEYS.COMPANY_RESEARCH);
  const answerData = parseZustandStorage<{ answers?: TechnicalAnswer[] }>(STORAGE_KEYS.TECHNICAL_ANSWERS);
  const jobData = parseZustandStorage<{ jobs?: AnalyzedJob[] }>(STORAGE_KEYS.ANALYZED_JOBS);

  // Build ID mappings for all entity types
  const profileMapping = buildProfileIdMapping(profileData?.profiles || []);
  const appMapping = buildIdMapping(appData?.applications || []);
  const storyMapping = buildIdMapping(storyData?.stories || []);
  const researchMapping = buildIdMapping(researchData?.researches || []);
  const answerMapping = buildIdMapping(answerData?.answers || []);
  const jobMapping = buildIdMapping(jobData?.jobs || []);

  console.log('ID Mappings built:', {
    profiles: profileMapping.size,
    applications: appMapping.size,
    stories: storyMapping.size,
    research: researchMapping.size,
    answers: answerMapping.size,
    jobs: jobMapping.size,
  });

  // Migrate profiles first (since other entities reference them)
  try {
    if (profileData?.profiles?.length) {
      const convertedProfiles = profileData.profiles.map((p) => convertProfile(p, profileMapping));
      await profilesService.upsertMany(convertedProfiles);
      result.migrated.profiles = convertedProfiles.length;
      console.log(`Migrated ${result.migrated.profiles} profiles`);
    }
  } catch (error) {
    result.errors.push(`Profiles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('Profile migration error:', error);
  }

  // Migrate applications (references profiles)
  try {
    if (appData?.applications?.length) {
      const convertedApps = appData.applications.map((a) => convertApplication(a, appMapping, profileMapping));
      await applicationsService.upsertMany(convertedApps);
      result.migrated.applications = convertedApps.length;
      console.log(`Migrated ${result.migrated.applications} applications`);
    }
  } catch (error) {
    result.errors.push(`Applications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('Applications migration error:', error);
  }

  // Migrate stories (references profiles)
  try {
    if (storyData?.stories?.length) {
      const convertedStories = storyData.stories.map((s) => convertStory(s, storyMapping, profileMapping));
      await storiesService.upsertMany(convertedStories);
      result.migrated.stories = convertedStories.length;
      console.log(`Migrated ${result.migrated.stories} stories`);
    }
  } catch (error) {
    result.errors.push(`Stories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('Stories migration error:', error);
  }

  // Migrate company research (no profile reference)
  try {
    if (researchData?.researches?.length) {
      const convertedResearch = researchData.researches.map((r) => convertResearch(r, researchMapping));
      await companyResearchService.upsertMany(convertedResearch);
      result.migrated.companyResearch = convertedResearch.length;
      console.log(`Migrated ${result.migrated.companyResearch} company researches`);
    }
  } catch (error) {
    result.errors.push(`Company Research: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('Company research migration error:', error);
  }

  // Migrate technical answers (references profiles)
  try {
    if (answerData?.answers?.length) {
      const convertedAnswers = answerData.answers.map((a) => convertAnswer(a, answerMapping, profileMapping));
      await technicalAnswersService.upsertMany(convertedAnswers);
      result.migrated.technicalAnswers = convertedAnswers.length;
      console.log(`Migrated ${result.migrated.technicalAnswers} technical answers`);
    }
  } catch (error) {
    result.errors.push(`Technical Answers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('Technical answers migration error:', error);
  }

  // Migrate analyzed jobs (references profiles and applications)
  try {
    if (jobData?.jobs?.length) {
      const convertedJobs = jobData.jobs.map((j) => convertAnalyzedJob(j, jobMapping, profileMapping, appMapping));
      await analyzedJobsService.upsertMany(convertedJobs);
      result.migrated.analyzedJobs = convertedJobs.length;
      console.log(`Migrated ${result.migrated.analyzedJobs} analyzed jobs`);
    }
  } catch (error) {
    result.errors.push(`Analyzed Jobs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('Analyzed jobs migration error:', error);
  }

  result.success = result.errors.length === 0;
  return result;
}

/**
 * Clear localStorage after successful migration
 */
export function clearMigratedLocalStorage(): void {
  const keysToRemove = [
    STORAGE_KEYS.PROFILE,
    STORAGE_KEYS.APPLICATIONS,
    STORAGE_KEYS.STORIES,
    STORAGE_KEYS.COMPANY_RESEARCH,
    STORAGE_KEYS.TECHNICAL_ANSWERS,
    STORAGE_KEYS.ANALYZED_JOBS,
    STORAGE_KEYS.LEGACY_PROFILE,
    STORAGE_KEYS.LEGACY_APPLICATIONS,
    STORAGE_KEYS.LEGACY_STORIES,
  ];

  keysToRemove.forEach((key) => {
    localStorage.removeItem(key);
  });

  // Mark migration as complete
  localStorage.setItem('jhq:migration:v1', new Date().toISOString());
  console.log('Cleared migrated localStorage data');
}

/**
 * Full migration flow with UI feedback
 */
export async function runFullMigration(
  onProgress?: (message: string) => void
): Promise<MigrationResult> {
  onProgress?.('Checking for data to migrate...');

  if (!hasLocalStorageData()) {
    return {
      success: true,
      migrated: {
        profiles: 0,
        applications: 0,
        stories: 0,
        companyResearch: 0,
        technicalAnswers: 0,
        analyzedJobs: 0,
      },
      errors: [],
    };
  }

  const summary = getLocalStorageSummary();
  const totalItems = Object.values(summary).reduce((a, b) => a + b, 0);
  onProgress?.(`Found ${totalItems} items to migrate...`);

  onProgress?.('Starting migration...');
  const result = await migrateLocalStorageToSupabase();

  if (result.success) {
    onProgress?.('Migration successful! Cleaning up...');
    clearMigratedLocalStorage();
    onProgress?.('Migration complete!');
  } else {
    onProgress?.(`Migration completed with ${result.errors.length} errors`);
  }

  return result;
}
