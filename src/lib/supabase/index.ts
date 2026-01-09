/**
 * Supabase Module Exports
 */
export { supabase, from, isSupabaseConfigured } from './client';
export { AuthProvider, useAuth, useRequireAuth } from './auth-context';
export type { Database, Tables, Insertable, Updatable } from './types';
export type {
  ProfileRow,
  ApplicationRow,
  StoryRow,
  CompanyResearchRow,
  TechnicalAnswerRow,
  PracticeSessionRow,
  AnalyzedJobRow,
  InterviewNoteRow,
} from './types';
