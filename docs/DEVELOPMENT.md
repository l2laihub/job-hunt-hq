# Development Setup Guide

This guide helps new developers set up Job Hunt HQ for local development.

## Prerequisites

- **Node.js**: v20.19.0+ or v22.12.0+ (recommended)
- **npm**: v9+ (comes with Node.js)
- **Git**: For version control
- **Gemini API Key**: Required for AI features

## Quick Start

```bash
# 1. Clone the repository
git clone <repository-url>
cd job-hunt-hq

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your GEMINI_API_KEY

# 4. Start the development server
npm run dev
```

The app will be available at `http://localhost:3000`

## Environment Variables

Create a `.env.local` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### Getting a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and paste it in your `.env.local` file

## Project Structure

```
job-hunt-hq/
├── src/                      # Main source code (new architecture)
│   ├── app/                  # App shell and routes
│   │   ├── layout.tsx        # Main layout with navigation
│   │   └── routes/           # Page components
│   │       ├── dashboard.tsx
│   │       ├── analyzer.tsx
│   │       ├── research.tsx
│   │       ├── stories.tsx
│   │       ├── interview.tsx
│   │       └── profile.tsx
│   ├── components/           # Reusable components
│   │   ├── ui/               # Base UI components (Button, Card, etc.)
│   │   ├── shared/           # Shared components (EmptyState, ErrorBoundary)
│   │   └── applications/     # Application-specific components
│   ├── stores/               # Zustand state management
│   │   ├── applications.ts   # Job applications store
│   │   ├── profile.ts        # User profile store
│   │   ├── stories.ts        # Interview stories store
│   │   └── ui.ts             # UI state (modals, toasts)
│   ├── services/             # External services
│   │   └── gemini/           # Gemini AI integration
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utilities and constants
│   └── types/                # TypeScript type definitions
├── components/               # Legacy components (being migrated)
├── services/                 # Legacy services
├── utils/                    # Legacy utilities
├── types.ts                  # Legacy types
├── index.html                # HTML entry point
└── vite.config.ts            # Vite configuration
```

## Available Scripts

```bash
npm run dev       # Start development server (port 3000)
npm run build     # Build for production
npm run preview   # Preview production build locally
```

## Technology Stack

| Category | Technology |
|----------|------------|
| Framework | React 19 |
| Build Tool | Vite 6 |
| Language | TypeScript 5.8 |
| Styling | Tailwind CSS 4 |
| State Management | Zustand 5 |
| Routing | React Router 7 |
| Data Fetching | TanStack Query 5 |
| AI Integration | Google Gemini (`@google/genai`) |
| Icons | Lucide React |
| Validation | Zod 4 |

## Architecture Overview

### State Management

The app uses Zustand for state management with persistence to localStorage:

- **`useApplicationStore`**: Job applications (CRUD, drag-drop status)
- **`useProfileStore`**: User profile and preferences
- **`useStoriesStore`**: STAR-formatted interview stories
- **`useUIStore`**: UI state (modals, toasts, loading)

### AI Integration

All AI features use Google's Gemini API through `src/services/gemini/`:

- **`analyze-jd.ts`**: Job description analysis
- **`research-company.ts`**: Company intelligence with search grounding
- **`process-documents.ts`**: Resume/document parsing
- **`format-experience.ts`**: Convert raw input to STAR format
- **`live-interview.ts`**: Real-time mock interview sessions

### Routing

React Router handles navigation with lazy-loaded route components:

| Route | Page |
|-------|------|
| `/` | Dashboard (Kanban board) |
| `/analyzer` | JD Analyzer |
| `/research` | Company Research |
| `/stories` | Experience Bank |
| `/interview` | Mock Interview |
| `/profile` | Profile Builder |

## Development Guidelines

### Code Style

- Use TypeScript strict mode
- Prefer functional components with hooks
- Use Tailwind CSS for styling (no separate CSS files)
- Follow the existing component patterns

### Component Patterns

```tsx
// Prefer zustand selectors that return stable references
const applications = useApplicationStore((s) => s.applications);

// Avoid selectors that return new objects (causes infinite re-renders)
// BAD: const stats = useStore((s) => s.getStats());
// GOOD: Compute derived state locally in the component
```

### Adding a New Feature

1. Create types in `src/types/index.ts`
2. Add store logic in `src/stores/`
3. Create UI components in `src/components/`
4. Add route in `src/app/routes/`
5. Update navigation in `src/app/layout.tsx`

## Troubleshooting

### "Cannot find module @rollup/rollup-win32-x64-msvc"

```bash
rm -rf node_modules package-lock.json
npm install
```

### API Key Not Working

1. Verify the key is set in `.env.local` (not `.env`)
2. Restart the dev server after changing env vars
3. Check the browser console for specific error messages

### Hot Reload Not Working (WSL/Windows)

The vite config includes polling for WSL compatibility. If issues persist:

```bash
# Increase polling interval in vite.config.ts
watch: {
  usePolling: true,
  interval: 2000,  // Increase if needed
}
```

### TypeScript Path Aliases Not Resolving

Ensure both `tsconfig.json` and `vite.config.ts` have matching path aliases:

```json
// tsconfig.json
"paths": { "@/*": ["./*"] }
```

```ts
// vite.config.ts
resolve: {
  alias: { '@': path.resolve(__dirname, '.') }
}
```

## Data Storage

All data is stored in browser localStorage:

| Key | Description |
|-----|-------------|
| `jhq:applications:v2` | Job applications |
| `jhq:profile:v2` | User profile |
| `jhq:stories:v2` | Interview stories |

Legacy keys (auto-migrated on first load):
- `jobhunt-hq-applications`
- `jobhunt-hq-profile`
- `jobhunt-hq-experiences`

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Test locally with `npm run dev`
4. Ensure build passes with `npm run build`
5. Submit a pull request

## Need Help?

- Check the [CLAUDE.md](../CLAUDE.md) for AI assistant context
- Review existing components for patterns
- Open an issue for bugs or feature requests
