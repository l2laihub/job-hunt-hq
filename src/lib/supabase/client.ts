/**
 * Supabase Client Configuration
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// Support both naming conventions: publishable key (new) or anon key (legacy)
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    'Supabase credentials not found. Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your .env.local file.'
  );
}

// Create the client with explicit type annotation to ensure proper type inference
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'jhq:auth',
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// Type-safe table accessor that bypasses TypeScript inference issues
// This is a workaround for complex generic type inference problems in Supabase JS
type TableName = keyof Database['public']['Tables'];

/**
 * Type-safe wrapper for supabase.from() that works around TypeScript inference issues.
 * Usage: from('tablename').select('*')...
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function from<T extends TableName>(table: T): any {
  return supabase.from(table);
}

// Helper to check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseKey);
}

// Export types for convenience
export type { Database } from './types';
