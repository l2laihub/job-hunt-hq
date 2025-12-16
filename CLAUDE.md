# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Job Hunt HQ is a React-based job search management application powered by Google's Gemini AI. It helps users track job applications, analyze job descriptions, research companies, store interview stories (STAR format), and practice mock interviews with live AI audio.

**Origin**: Exported from Google AI Studio

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server on port 3000
npm run build        # Production build via Vite
npm run preview      # Preview production build
```

## Environment Setup

Set `GEMINI_API_KEY` in `.env.local` for Gemini AI features.

## Architecture

### Entry Points
- [index.html](index.html) - HTML shell with Tailwind CDN and ESM import maps
- [index.tsx](index.tsx) - React 19 root mount
- [App.tsx](App.tsx) - Main app with tab navigation and state management

### Core Structure

**No src/ directory** - All source files are at project root:
```
/
├── components/           # React components
│   ├── Analyzer.tsx           # JD analysis UI
│   ├── AnalysisResultView.tsx # FTE/Freelance result display
│   ├── ApplicationModal.tsx   # Create/edit applications
│   ├── ExperienceBank.tsx     # STAR stories management
│   ├── JobCard.tsx            # Kanban card component
│   ├── MockInterview.tsx      # Live AI interview
│   ├── ProfileBuilder.tsx     # Profile/resume builder
│   └── ResearchView.tsx       # Company research
├── services/
│   └── geminiService.ts  # All Gemini AI integrations
├── utils/
│   └── audio.ts          # PCM audio encoding/decoding
├── types.ts              # TypeScript interfaces
├── App.tsx               # Main app shell + state
└── index.tsx             # React entry point
```

### State Management

All state centralized in `App.tsx`:
- `applications: JobApplication[]` - Job tracker data
- `stories: Experience[]` - STAR-formatted experiences
- `profile: UserProfile` - User's professional profile

**Persistence**: LocalStorage with lazy init + useEffect auto-save
- `jobhunt-hq-applications`
- `jobhunt-hq-profile`
- `jobhunt-hq-experiences`

### AI Integration (`services/geminiService.ts`)

All AI calls use `gemini-2.5-flash` with structured JSON output via response schemas:

| Function | Purpose | Special Features |
|----------|---------|------------------|
| `processDocuments()` | Parse resume/docs into UserProfile | Multimodal (PDF, text, markdown) |
| `analyzeJD()` | Analyze job descriptions | Auto-detects FTE vs freelance |
| `researchCompany()` | Company intelligence | Uses Google Search grounding |
| `formatExperience()` | Convert raw text to STAR | Coaching notes, tag suggestions |
| `matchStoriesToQuestion()` | Match stories to interview Q | Gap detection |
| `createLiveSession()` | Real-time audio interview | Native audio model, bidirectional |
| `generateInterviewFeedback()` | Post-interview analysis | Structured scoring |

### Type System (`types.ts`)

Key interfaces:
- `UserProfile` - Professional profile with FTE + freelance preferences
- `JobApplication` - Application with optional `JDAnalysis` and `CompanyResearch`
- `JDAnalysis` - Union type: `FTEAnalysis | FreelanceAnalysis`
- `Experience` - STAR structure with metrics, tags, variations
- `InterviewConfig` / `InterviewFeedback` - Mock interview types

## Styling

- Tailwind CSS via CDN (not npm installed)
- Dark theme: gray-950 background, custom scales (750, 850, 950)
- `cn()` utility in App.tsx combines `clsx` + `tailwind-merge`

## Path Alias

`@/*` maps to project root (both vite.config.ts and tsconfig.json).

## Features Overview

### 1. Dashboard (Kanban Board)
- Drag-and-drop job applications across columns: Wishlist → Applied → Interviewing → Offer → Rejected
- Cards show fit score, company, salary, dates
- Quick research action on each card

### 2. JD Analyzer
- Paste job description, get AI analysis
- **FTE Mode**: Fit score, skill matching, talking points, questions to ask
- **Freelance Mode**: Auto-detects Upwork/contract, generates proposal strategy, suggested bid

### 3. Profile Builder
- Upload resume (PDF/TXT/MD) for AI parsing
- Tabs: Basic info, Experience, Projects, Preferences
- Supports both FTE salary expectations and freelance rates

### 4. Company Research
- Enter company name, get AI-researched intel
- Recent news, engineering culture, tech stack
- Red/green flags, key people, interview intel
- Links research to job applications

### 5. Experience Bank (My Stories)
- Store STAR-formatted interview stories
- Voice input via Web Speech API
- AI formats raw input into STAR structure
- **Interview Matcher**: Find best story for a given question

### 6. Mock Interview
- Live audio conversation with AI interviewer
- Configurable: type (behavioral/technical), difficulty, focus areas
- Context from profile and specific application
- Post-interview feedback with scores
