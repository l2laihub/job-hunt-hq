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
- `useApplicationStore` - Job applications with Kanban board statuses
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

All AI features use Google's Gemini API via `@google/genai`. The client is configured in `src/services/gemini/client.ts`:
- Default model: `gemini-2.5-flash`
- Live model (for real-time features): `gemini-2.5-flash-native-audio-preview-09-2025`

Key services:
- `analyze-jd.ts` - Job description analysis with fit scoring
- `research-company.ts` - Company intelligence with grounded search
- `generate-interview-answer.ts` - STAR/technical answer generation
- `predict-questions.ts` - Interview question prediction
- `resume-enhance.ts` - Resume optimization suggestions
- `ai-assistant.ts` - Context-aware AI chat assistant

The Gemini API key is exposed via Vite's `define`:
```ts
process.env.GEMINI_API_KEY  // or import.meta.env.VITE_GEMINI_API_KEY
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

### Store Initialization

Stores are initialized in `src/stores/index.ts` via `initializeStores()` which:
1. Sets up cross-tab sync
2. Runs legacy data migrations
3. Initializes real-time subscriptions for each store

### Authentication

Auth is provided via `AuthProvider` in `src/lib/supabase/auth-context.tsx`:
```tsx
const { user, session, signIn, signUp, signOut } = useAuth();
const { user, loading } = useRequireAuth(); // Protected routes
```

## Environment Variables

Required in `.env.local`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key
```

## Database

Schema migrations are in `supabase/migrations/`. All tables have RLS enabled with policies restricting access to `auth.uid() = user_id`.

Key tables: `profiles`, `applications`, `stories`, `analyzed_jobs`, `technical_answers`, `company_research`, `interview_prep_sessions`, `copilot_sessions`

## Legacy Code

Root-level `components/`, `services/`, and `utils/` directories contain legacy code being migrated to `src/`. The legacy `App.tsx` at root is being phased out in favor of `src/main.tsx`. The root `types.ts` re-exports from `src/types/index.ts` for backwards compatibility.

---

## Agent Orchestration

### Quick Reference

| Command | Use For |
|---------|---------|
| `/feature [description]` | New features (full workflow) |
| `/bugfix [description]` | Bug investigation and fix |
| `/review-security` | Security & performance audit |
| `/quickfix [description]` | Simple tasks (<15 min) |

### Agent Delegation Rules

When working on this project, automatically delegate to specialized agents:

#### By File Type/Location
[CUSTOMIZE: Update patterns to match your project structure]

| Path Pattern | Agent |
|--------------|-------|
| `src/components/**/*.tsx` | `@frontend` |
| `src/app/**/*.tsx` | `@frontend` or `@mobile-dev` |
| `src/api/**`, `src/server/**` | `@backend` |
| `**/migrations/**/*.sql` | `@database` |
| `**/*.test.ts`, `**/*.spec.ts` | `@tester` |
| `.github/workflows/**`, `**/Dockerfile` | `@devops` |

#### By Task Type
| Task | Agent Flow |
|------|------------|
| New feature | `@planner` → implementation agent → `@tester` → `@reviewer` |
| Bug fix | `@debugger` → implementation agent → `@tester` → `@reviewer` |
| API changes | `@api-designer` → `@backend` → `@tester` |
| UI design | `@mobile-ui` → `@frontend` or `@mobile-dev` |
| Performance issue | `@performance` → implementation agent |
| Schema changes | `@database` → update types → test |
| Deployment | `@deploy` (with `@security` review if needed) |
| CI/CD changes | `@devops` |

#### Security-Required Reviews

Always run `@security` review when touching:
- [ ] Authentication / authorization code
- [ ] Password / token handling
- [ ] Payment / billing code
- [ ] User input handlers
- [ ] Database queries with user-provided data
- [ ] File uploads
- [ ] API endpoints accepting external data
- [ ] Third-party integrations

#### Database Changes

Always use `@database` agent when:
- [ ] Creating/modifying tables
- [ ] Adding/changing access policies
- [ ] Writing migrations
- [ ] Backfilling data
- [ ] Adding indexes

### Quality Gates

Before merging ANY code:
- [ ] `@reviewer` has approved
- [ ] `@security` has reviewed (if applicable)
- [ ] `@database` has reviewed migrations (if schema changed)
- [ ] All tests pass
- [ ] No TypeScript/lint errors
- [ ] Types regenerated if schema changed
- [ ] Documentation updated (if user-facing)

### Project-Specific Notes

[CUSTOMIZE: Add notes specific to your project]

#### Critical Paths (Extra Care Required)
- **[Path 1]**: [Why it needs extra care]
- **[Path 2]**: [Why it needs extra care]

#### Tech Stack Quick Reference
[CUSTOMIZE: Fill in your actual tech stack]

- **Frontend**: [e.g., React, Vue, Next.js]
- **State**: [e.g., Redux, Zustand, React Query]
- **Backend**: [e.g., Node.js, .NET, Supabase, Django]
- **Database**: [e.g., PostgreSQL, MongoDB, Supabase]
- **Payments**: [e.g., Stripe, PayPal] (if applicable)
- **Hosting**: [e.g., Vercel, Netlify, AWS, Azure]

#### Common Commands
[CUSTOMIZE: Add your project's common commands]

```bash
# Development
npm run dev           # Start dev server
npm test              # Run tests
npm run build         # Production build
npm run lint          # Lint code
npm run typecheck     # Type checking

# Database (if applicable)
# [Add your migration/seed commands]

# Deployment (if applicable)
# [Add your deploy commands]
```

---