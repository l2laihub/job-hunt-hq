<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Job Hunt HQ

A comprehensive job search management application powered by Google's Gemini AI. Track applications, analyze job descriptions, research companies, and practice interviews with AI.

## Features

- **Dashboard**: Kanban-style job application tracker
- **JD Analyzer**: AI-powered job description analysis with fit scoring
- **Profile Builder**: Build and manage professional profiles
- **Company Research**: AI-researched company intelligence
- **Experience Bank**: STAR-formatted interview story management
- **Mock Interview**: Live AI-powered interview practice

## Quick Start

### Prerequisites

- Node.js 18+
- [Supabase](https://supabase.com) account (free tier)
- [Google AI Studio](https://ai.google.dev/) API key

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**

   Create `.env.local` with:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   GEMINI_API_KEY=your-gemini-api-key
   ```

3. **Set up database:**
   ```bash
   npx supabase login
   npx supabase link --project-ref your-project-id
   npx supabase db push
   ```

4. **Run the app:**
   ```bash
   npm run dev
   ```

Visit `http://localhost:3000`

## Documentation

- [Developer Setup Guide](docs/SETUP.md) - Detailed setup instructions
- [Supabase Integration](docs/SUPABASE.md) - Database and auth documentation

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **State**: Zustand
- **Backend**: Supabase (PostgreSQL + Auth)
- **AI**: Google Gemini API
- **Build**: Vite

## Project Structure

```
job-hunt-hq/
├── src/
│   ├── app/routes/       # Page components
│   ├── components/       # UI components
│   ├── lib/supabase/     # Supabase client & auth
│   ├── services/         # API & database services
│   ├── stores/           # Zustand stores
│   └── types/            # TypeScript definitions
├── supabase/migrations/  # Database schema
└── docs/                 # Documentation
```

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview build
```

## License

MIT
