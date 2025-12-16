// Import stores and migration functions
import { useApplicationStore, migrateLegacyApplications } from './applications';
import { useProfileStore, migrateLegacyProfile } from './profile';
import { useStoriesStore, migrateLegacyStories } from './stories';
import { useUIStore, toast } from './ui';
import type { ModalType, Toast } from './ui';

// Re-export everything
export { useApplicationStore, migrateLegacyApplications } from './applications';
export { useProfileStore, migrateLegacyProfile } from './profile';
export { useStoriesStore, migrateLegacyStories } from './stories';
export { useUIStore, toast, type ModalType, type Toast } from './ui';

// Initialize all stores and run migrations
export function initializeStores(): void {
  // Run migrations for legacy data
  migrateLegacyApplications();
  migrateLegacyProfile();
  migrateLegacyStories();
}
