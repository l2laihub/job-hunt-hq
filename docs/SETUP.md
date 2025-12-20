# Job Hunt HQ - Developer Setup Guide

Quick guide to get Job Hunt HQ running locally.

## Prerequisites

- Node.js 18+
- npm or yarn
- A Supabase account (free tier works)

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd job-hunt-hq
npm install
```

### 2. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key from Settings → API

### 3. Configure Environment

Create `.env.local`:

```env
# Supabase (required for data persistence)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Gemini AI (required for AI features)
GEMINI_API_KEY=your-gemini-api-key
```

### 4. Set Up Database

Option A - Using Supabase CLI:
```bash
npx supabase login
npx supabase link --project-ref your-project-id
npx supabase db push
```

Option B - Using SQL Editor:
1. Go to SQL Editor in Supabase dashboard
2. Run the contents of `supabase/migrations/001_initial_schema.sql`

### 5. Run Development Server

```bash
npm run dev
```

App will be available at `http://localhost:3000`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `GEMINI_API_KEY` | Yes | Google Gemini API key for AI features |

## Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Project Structure

```
job-hunt-hq/
├── src/
│   ├── app/routes/       # Page components
│   ├── components/       # Reusable UI components
│   ├── lib/supabase/     # Supabase client & auth
│   ├── services/         # API & database services
│   ├── stores/           # Zustand state management
│   └── types/            # TypeScript types
├── components/           # Legacy components (root level)
├── services/             # Legacy services (root level)
├── supabase/migrations/  # Database schema
└── docs/                 # Documentation
```

## Next Steps

- Read [SUPABASE.md](./SUPABASE.md) for detailed Supabase integration docs
- Check [CLAUDE.md](../CLAUDE.md) for AI assistant guidelines
- Review the types in `src/types/index.ts` to understand data models

## Troubleshooting

**Build fails with type errors?**
```bash
npm run build 2>&1 | grep "error TS"
```

**Supabase connection issues?**
- Verify your `.env.local` has correct values
- Check the browser console for errors
- Ensure RLS policies are set up (run migrations)

**Need to reset the database?**
```bash
# In Supabase SQL Editor
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

# Then re-run migrations
```
