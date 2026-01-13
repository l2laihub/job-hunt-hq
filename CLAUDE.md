# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Job Hunt HQ is a job search management application powered by Google's Gemini AI. It helps users track applications, analyze job descriptions, research companies, manage STAR-formatted interview stories, and practice interviews.

## Development Commands

```bash
npm run dev      # Start development server at http://localhost:3000
npm run build    # Production build
npm run preview  # Preview production build
```

### Supabase CLI

```bash
npx supabase login
npx supabase link --project-ref <project-id>
npx supabase db push                              # Apply migrations
npx supabase gen types typescript --project-id <id> > src/lib/supabase/types.ts  # Regenerate types
```

## Architecture

### State Management (Dual-Path Pattern)

The app uses a dual-path state management pattern:

1. **localStorage Stores** (`src/stores/*.ts`) - Client-side persistence using Zustand with `persist` middleware
2. **Supabase Stores** (`src/stores/supabase/*.ts`) - Server-side persistence wrapping database services

Both paths use the same TypeScript types from `src/types/index.ts`. The app auto-migrates localStorage data to Supabase when a user signs in for the first time.

**Key stores:**
- `useApplicationsStore` - Job applications with Kanban board statuses
- `useProfileStore` - User profile with multi-profile support
- `useStoriesStore` - STAR-formatted interview stories
- `useAnalyzedJobsStore` - Analyzed job descriptions with generated content

**Zustand selector pattern** - Always use selectors that return stable references:
```tsx
// GOOD - returns stable reference
const applications = useApplicationStore((s) => s.applications);

// BAD - creates new object on every render, causes infinite loops
const stats = useStore((s) => s.getStats());
```

### Database Services (`src/services/database/`)

Type-safe wrappers around Supabase queries with CRUD operations and real-time subscriptions. Each service follows the pattern:
- `list()` - Fetch all for current user
- `create(data)` - Insert with auto user_id
- `update(id, data)` - Update by id
- `delete(id)` - Delete by id
- `subscribe(callback)` - Real-time updates

### AI Services (`src/services/gemini/`)

All AI features use Google's Gemini API via `@google/genai`. Key services:
- `analyze-jd.ts` - Job description analysis with fit scoring
- `research-company.ts` - Company intelligence with grounded search
- `generate-interview-answer.ts` - STAR/technical answer generation
- `predict-questions.ts` - Interview question prediction
- `resume-enhance.ts` - Resume optimization suggestions

The Gemini API key is exposed via Vite's `define`:
```ts
process.env.GEMINI_API_KEY  // or process.env.API_KEY
```

### Routing

Routes are lazy-loaded in `src/main.tsx`. Page components are in `src/app/routes/`:

| Route | Page |
|-------|------|
| `/` | Dashboard (Kanban board) |
| `/analyzer` | JD Analyzer - analyze and save jobs |
| `/research` | Company Research |
| `/stories` | Experience Bank (STAR stories) |
| `/interview` | Mock Interview (basic) |
| `/mock-interview` | Enhanced Mock Interview |
| `/interview-prep` | Interview preparation hub |
| `/answers` | Technical Answers bank |
| `/enhance` | Resume Enhancement |
| `/profile` | Profile Builder |
| `/copilot` | Interview Copilot (real-time) |

### Path Aliases

The `@/` alias points to the project root:
```ts
import { supabase } from '@/src/lib/supabase';
import { Experience } from '@/src/types';
```

## Key Patterns

### Multi-Profile Support

Users can maintain multiple professional profiles (e.g., "Frontend Focus", "Freelance Profile"). Profile-linked entities include a `profileId` field. The `UserProfileWithMeta` type combines profile data with `ProfileMetadata`.

### Type Converters

Database row types differ from app types. Use converters in `src/services/database/types.ts`:
```ts
profileRowToUserProfileWithMeta(row)  // DB row -> app type
userProfileWithMetaToRow(profile, userId)  // app type -> DB row
```

### Application Types

Three job types with different analysis schemas:
- `fulltime` - FTEAnalysis with role type, talking points
- `freelance` - FreelanceAnalysis with bid suggestions, proposal angles
- `contract` - ContractAnalysis with contract type, conversion potential

### Environment Variables

Required in `.env.local`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key
```

## Database

Schema migrations are in `supabase/migrations/`. All tables have RLS enabled with policies restricting access to `auth.uid() = user_id`.

Key tables: `profiles`, `applications`, `stories`, `analyzed_jobs`, `technical_answers`, `company_research`

## Legacy Code

Root-level `components/`, `services/`, and `utils/` directories contain legacy code being migrated to `src/`. The legacy `App.tsx` at root is being phased out in favor of `src/main.tsx`.
