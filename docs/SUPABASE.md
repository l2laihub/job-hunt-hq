# Supabase Integration Guide

This document explains how Supabase is integrated into Job Hunt HQ for authentication and data persistence.

## Overview

Job Hunt HQ uses Supabase as its backend-as-a-service, providing:
- **Authentication**: Email/password and Google OAuth sign-in
- **PostgreSQL Database**: Persistent storage for all user data
- **Row Level Security (RLS)**: Automatic data isolation per user
- **Real-time Subscriptions**: Live updates when data changes

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        React App                             │
├─────────────────────────────────────────────────────────────┤
│  Zustand Stores          │  Database Services               │
│  (useApplicationsStore)  │  (applicationsService)           │
│  (useProfileStore)       │  (profilesService)               │
│  (useStoriesStore)       │  (storiesService)                │
│          ↓               │          ↓                       │
├─────────────────────────────────────────────────────────────┤
│              Supabase Client (src/lib/supabase)              │
│  - Authentication        │  - Database Queries              │
│  - Session Management    │  - Real-time Subscriptions       │
├─────────────────────────────────────────────────────────────┤
│                     Supabase Cloud                           │
│  - PostgreSQL Database   │  - Auth Service                  │
│  - Row Level Security    │  - Real-time Engine              │
└─────────────────────────────────────────────────────────────┘
```

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create an account
2. Click "New Project" and fill in the details
3. Wait for the database to be provisioned

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key-here
```

Find these values in your Supabase dashboard:
- **Project URL**: Settings → API → Project URL
- **Publishable Key**: Settings → API → Project API keys → `anon` `public` (also called publishable key)

> **Note**: The code also supports `VITE_SUPABASE_ANON_KEY` for backwards compatibility.

### 3. Run Database Migrations

The database schema is defined in `supabase/migrations/`. To apply it:

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
npx supabase login

# Link to your project
npx supabase link --project-ref your-project-id

# Push migrations
npx supabase db push
```

Alternatively, you can run the SQL directly in the Supabase SQL Editor:
1. Go to SQL Editor in your Supabase dashboard
2. Copy the contents of `supabase/migrations/001_initial_schema.sql`
3. Run the query

### 4. Configure Authentication (Optional)

For Google OAuth:
1. Go to Authentication → Providers in Supabase dashboard
2. Enable Google provider
3. Add your Google OAuth credentials
4. Add redirect URLs for your app domain

## Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profiles with professional info, skills, preferences |
| `applications` | Job applications with status, analysis, research |
| `stories` | STAR-formatted interview stories |
| `company_research` | Company research data |
| `technical_answers` | Technical interview Q&A bank |
| `practice_sessions` | Practice session recordings |
| `analyzed_jobs` | Analyzed job descriptions |

### Row Level Security

All tables have RLS enabled with policies that ensure users can only access their own data:

```sql
-- Example policy on profiles table
CREATE POLICY "Users can view own profiles"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profiles"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

## Code Structure

### Supabase Client

Located in `src/lib/supabase/`:

```
src/lib/supabase/
├── index.ts          # Main exports
├── client.ts         # Supabase client configuration
├── auth-context.tsx  # React auth context provider
└── types.ts          # Database TypeScript types
```

#### Client Configuration (`client.ts`)

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

export const supabase: SupabaseClient<Database> = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      storageKey: 'jhq:auth',
    },
  }
);

// Type-safe table accessor
export function from<T extends keyof Database['public']['Tables']>(table: T) {
  return supabase.from(table);
}
```

#### Auth Context (`auth-context.tsx`)

Provides authentication state throughout the app:

```typescript
const { user, session, loading, signIn, signUp, signOut } = useAuth();
```

### Database Services

Located in `src/services/database/`:

```
src/services/database/
├── index.ts              # Service exports
├── types.ts              # Type converters
├── profiles.ts           # Profile CRUD operations
├── applications.ts       # Application CRUD operations
├── stories.ts            # Stories CRUD operations
├── company-research.ts   # Company research operations
├── technical-answers.ts  # Technical answers operations
└── analyzed-jobs.ts      # Analyzed jobs operations
```

#### Example Service Usage

```typescript
import { applicationsService } from '@/src/services/database';

// List all applications
const apps = await applicationsService.list();

// Create an application
const newApp = await applicationsService.create({
  company: 'Acme Inc',
  role: 'Senior Engineer',
  type: 'fulltime',
  status: 'wishlist',
});

// Update an application
await applicationsService.update(id, { status: 'applied' });

// Delete an application
await applicationsService.delete(id);

// Subscribe to changes
const unsubscribe = applicationsService.subscribe((apps) => {
  console.log('Applications updated:', apps);
});
```

### Zustand Stores

Stores in `src/stores/` wrap the database services with state management:

```typescript
import { useApplicationsStore } from '@/src/stores';

function MyComponent() {
  const { applications, loading, fetchApplications, addApplication } = useApplicationsStore();

  useEffect(() => {
    fetchApplications();
  }, []);

  // Use applications...
}
```

## Data Migration

For users with existing localStorage data, a migration tool is available:

### Automatic Migration

When a user signs in for the first time, they're prompted to migrate their existing data:

1. Sign in with email or Google
2. If localStorage data exists, the migration modal appears
3. Click "Migrate Data" to transfer data to Supabase
4. Data is preserved in localStorage as backup until confirmed

### Manual Migration

```typescript
import { migrateFromLocalStorage } from '@/src/services/database/migration';

// Check if migration is needed
const hasLocalData = migrateFromLocalStorage.hasLocalData();

// Perform migration
if (hasLocalData) {
  const result = await migrateFromLocalStorage.migrate();
  console.log(`Migrated: ${result.profiles} profiles, ${result.applications} applications`);
}

// Clear localStorage after successful migration
migrateFromLocalStorage.clearLocalData();
```

## Type Safety

### Database Types

Types are defined in `src/lib/supabase/types.ts`:

```typescript
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      // ... other tables
    };
  };
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Insertable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type Updatable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
```

### Type Converters

Convert between database rows and app types:

```typescript
// In src/services/database/types.ts
export function profileRowToUserProfileWithMeta(row: ProfileRow): UserProfileWithMeta {
  return {
    id: row.id,
    name: row.name,
    // ... map other fields
  };
}

export function userProfileWithMetaToRow(profile: UserProfileWithMeta, userId: string) {
  return {
    id: profile.id,
    user_id: userId,
    name: profile.name,
    // ... map other fields
  };
}
```

## Authentication Flow

### Sign Up

```typescript
const { signUp } = useAuth();

await signUp(email, password);
// User receives confirmation email
// After confirmation, user can sign in
```

### Sign In

```typescript
const { signIn } = useAuth();

// Email/password
await signIn(email, password);

// Google OAuth
await signInWithGoogle();
```

### Sign Out

```typescript
const { signOut } = useAuth();

await signOut();
// User is redirected to login page
```

### Protected Routes

Use `useRequireAuth` to protect routes:

```typescript
function ProtectedPage() {
  const { user, loading } = useRequireAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return null; // Redirects to login

  return <Dashboard />;
}
```

## Real-time Subscriptions

Subscribe to database changes:

```typescript
// In a service
subscribe(callback: (data: Data[]) => void) {
  const channel = supabase
    .channel('my-channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'my_table' },
      async () => {
        const data = await this.list();
        callback(data);
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// In a component
useEffect(() => {
  const unsubscribe = myService.subscribe(setData);
  return unsubscribe;
}, []);
```

## Troubleshooting

### Common Issues

**1. "Not authenticated" errors**
- Ensure the user is signed in
- Check that the session hasn't expired
- Verify the auth context provider wraps your app

**2. "Permission denied" errors**
- Check RLS policies are correctly set up
- Verify the user_id matches auth.uid()
- Ensure the table has appropriate policies

**3. Type errors with Supabase queries**
- Use the `from()` helper instead of `supabase.from()`
- Ensure database types are up to date
- Run `npx supabase gen types typescript` to regenerate types

**4. Data not syncing**
- Check real-time is enabled for the table
- Verify subscription channel is properly set up
- Check browser console for WebSocket errors

### Regenerating Types

If the database schema changes:

```bash
npx supabase gen types typescript --project-id your-project-id > src/lib/supabase/types.ts
```

## Security Best Practices

1. **Never expose service role key** - Only use the anon key in client-side code
2. **Always use RLS** - Every table should have row-level security enabled
3. **Validate on backend** - Don't rely solely on client-side validation
4. **Use prepared statements** - Supabase client handles this automatically
5. **Audit access patterns** - Review RLS policies regularly

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
