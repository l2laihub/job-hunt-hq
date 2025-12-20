-- Job Hunt HQ - Add Enhancements Table
-- This migration adds the enhancements table for storing resume enhancement data

-- ============================================
-- ENHANCEMENTS TABLE
-- ============================================
-- Stores resume enhancement analysis and suggestions
create table public.enhancements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  profile_id uuid references public.profiles(id) on delete set null,

  -- Enhancement mode
  mode text check (mode in ('professional', 'job-tailored')) not null default 'professional',

  -- Job context (for job-tailored mode)
  job_id uuid references public.analyzed_jobs(id) on delete set null,
  job_title text,
  company_name text,

  -- AI Analysis and suggestions
  analysis jsonb not null default '{}'::jsonb,
  suggestions jsonb default '[]'::jsonb,
  applied_suggestion_ids text[] default '{}',

  -- Enhanced profile data
  enhanced_profile jsonb not null,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index enhancements_user_id_idx on public.enhancements(user_id);
create index enhancements_profile_id_idx on public.enhancements(profile_id);
create index enhancements_job_id_idx on public.enhancements(job_id);
create index enhancements_mode_idx on public.enhancements(mode);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS
alter table public.enhancements enable row level security;

-- Enhancements policies
create policy "Users can view own enhancements"
  on public.enhancements for select
  using (auth.uid() = user_id);

create policy "Users can insert own enhancements"
  on public.enhancements for insert
  with check (auth.uid() = user_id);

create policy "Users can update own enhancements"
  on public.enhancements for update
  using (auth.uid() = user_id);

create policy "Users can delete own enhancements"
  on public.enhancements for delete
  using (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Apply updated_at trigger
create trigger enhancements_updated_at
  before update on public.enhancements
  for each row execute function public.handle_updated_at();
