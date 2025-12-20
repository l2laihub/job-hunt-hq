-- Job Hunt HQ - Initial Database Schema
-- This migration creates all tables needed for the application

-- Note: Using gen_random_uuid() which is built into PostgreSQL 13+
-- No extension needed for UUID generation in Supabase

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
-- Stores user profiles with all professional data
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,

  -- Profile metadata
  name text not null default 'My Profile',
  description text,
  color text default '#3B82F6',
  is_default boolean default false,

  -- Professional info
  display_name text not null default 'Professional',
  email text,
  phone text,
  headline text default 'Software Engineer',
  years_experience integer default 0,
  current_situation text default 'Looking for opportunities',

  -- Arrays stored as JSONB for flexibility
  technical_skills jsonb default '[]'::jsonb,
  soft_skills jsonb default '[]'::jsonb,
  industries jsonb default '[]'::jsonb,
  goals jsonb default '[]'::jsonb,
  constraints jsonb default '[]'::jsonb,

  -- Complex nested structures
  key_achievements jsonb default '[]'::jsonb,
  recent_roles jsonb default '[]'::jsonb,
  active_projects jsonb default '[]'::jsonb,

  -- Preferences (nested object)
  preferences jsonb default '{
    "targetRoles": [],
    "workStyle": "remote",
    "salaryRange": {"min": 100000, "max": 200000},
    "dealBreakers": [],
    "priorityFactors": []
  }'::jsonb,

  -- Freelance profile (nested object)
  freelance_profile jsonb default '{
    "hourlyRate": {"min": 50, "max": 100},
    "availableHours": "20 hrs/week",
    "preferredProjectTypes": [],
    "uniqueSellingPoints": []
  }'::jsonb,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for faster lookups
create index profiles_user_id_idx on public.profiles(user_id);
create index profiles_is_default_idx on public.profiles(user_id, is_default);

-- ============================================
-- 2. JOB APPLICATIONS TABLE
-- ============================================
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  profile_id uuid references public.profiles(id) on delete set null,

  -- Core fields
  type text check (type in ('fulltime', 'freelance')) not null default 'fulltime',
  company text not null,
  role text not null,
  status text check (status in ('wishlist', 'applied', 'interviewing', 'offer', 'rejected')) not null default 'wishlist',
  source text check (source in ('linkedin', 'upwork', 'direct', 'referral', 'other')) default 'other',

  -- Details
  salary_range text,
  date_applied date,
  notes text default '',
  job_description_raw text,

  -- Freelance specific
  platform text check (platform in ('upwork', 'direct', 'other')),
  proposal_sent text,

  -- AI-generated analysis (stored as JSONB)
  analysis jsonb,

  -- Cached company research (stored as JSONB)
  company_research jsonb,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index applications_user_id_idx on public.applications(user_id);
create index applications_profile_id_idx on public.applications(profile_id);
create index applications_status_idx on public.applications(status);
create index applications_company_idx on public.applications(company);

-- ============================================
-- 3. STORIES (EXPERIENCE BANK) TABLE
-- ============================================
create table public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  profile_id uuid references public.profiles(id) on delete set null,

  -- Core fields
  title text not null,
  raw_input text default '',
  input_method text check (input_method in ('manual', 'voice', 'import')) default 'manual',

  -- STAR structure (stored as JSONB)
  star jsonb not null default '{
    "situation": "",
    "task": "",
    "action": "",
    "result": ""
  }'::jsonb,

  -- Metrics
  metrics jsonb default '{
    "primary": null,
    "secondary": [],
    "missing": []
  }'::jsonb,

  -- Categorization
  tags text[] default '{}',

  -- Variations for different contexts
  variations jsonb default '{}'::jsonb,

  -- Coaching
  follow_up_questions text[] default '{}',
  coaching_notes text,

  -- Usage tracking
  used_in_interviews text[] default '{}',
  times_used integer default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index stories_user_id_idx on public.stories(user_id);
create index stories_profile_id_idx on public.stories(profile_id);
create index stories_tags_idx on public.stories using gin(tags);

-- ============================================
-- 4. COMPANY RESEARCH TABLE
-- ============================================
create table public.company_research (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,

  -- Core fields
  company_name text not null,
  role_context text,

  -- Research data (stored as JSONB for flexibility)
  overview jsonb default '{}'::jsonb,
  recent_news jsonb default '[]'::jsonb,
  engineering_culture jsonb default '{}'::jsonb,
  red_flags jsonb default '[]'::jsonb,
  green_flags jsonb default '[]'::jsonb,
  key_people jsonb default '[]'::jsonb,
  interview_intel jsonb default '{}'::jsonb,
  verdict jsonb default '{
    "overall": "yellow",
    "summary": ""
  }'::jsonb,

  sources_used text[] default '{}',
  searched_at timestamptz default now(),

  created_at timestamptz default now(),

  -- Unique constraint per user + company
  unique(user_id, company_name)
);

-- Indexes
create index company_research_user_id_idx on public.company_research(user_id);
create index company_research_company_name_idx on public.company_research(company_name);

-- ============================================
-- 5. TECHNICAL ANSWERS TABLE
-- ============================================
create table public.technical_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  profile_id uuid references public.profiles(id) on delete set null,

  -- Core fields
  question text not null,
  question_type text check (question_type in (
    'behavioral-technical', 'conceptual', 'system-design', 'problem-solving', 'experience'
  )) default 'conceptual',

  -- Answer format and content
  format jsonb default '{
    "type": "Explain-Example-Tradeoffs",
    "sections": []
  }'::jsonb,

  sources jsonb default '{
    "storyIds": [],
    "profileSections": [],
    "synthesized": false
  }'::jsonb,

  answer jsonb default '{
    "structured": [],
    "narrative": "",
    "bulletPoints": []
  }'::jsonb,

  follow_ups jsonb default '[]'::jsonb,

  -- Metadata
  metadata jsonb default '{
    "difficulty": "mid",
    "tags": []
  }'::jsonb,

  -- Usage tracking
  used_in_interviews text[] default '{}',
  times_used integer default 0,
  practice_count integer default 0,
  last_practiced_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index technical_answers_user_id_idx on public.technical_answers(user_id);
create index technical_answers_profile_id_idx on public.technical_answers(profile_id);
create index technical_answers_question_type_idx on public.technical_answers(question_type);

-- ============================================
-- 6. PRACTICE SESSIONS TABLE
-- ============================================
create table public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  answer_id uuid references public.technical_answers(id) on delete cascade not null,

  -- Session data
  duration_seconds integer,
  notes text,
  self_rating integer check (self_rating >= 1 and self_rating <= 5),
  areas_to_improve text[] default '{}',

  created_at timestamptz default now()
);

-- Indexes
create index practice_sessions_answer_id_idx on public.practice_sessions(answer_id);

-- ============================================
-- 7. ANALYZED JOBS TABLE
-- ============================================
create table public.analyzed_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  profile_id uuid references public.profiles(id) on delete set null,
  application_id uuid references public.applications(id) on delete set null,

  -- Core fields
  job_description text not null,
  type text check (type in ('fulltime', 'freelance', 'contract')) default 'fulltime',
  company text,
  role text,
  location text,
  salary_range text,
  source text,
  job_url text,

  -- AI Analysis (stored as JSONB)
  analysis jsonb not null,

  -- Generated content
  cover_letters jsonb default '[]'::jsonb,
  phone_screen_prep jsonb,
  technical_interview_prep jsonb,
  application_strategy jsonb,
  skills_roadmap jsonb,
  screening_questions jsonb default '[]'::jsonb,
  application_questions jsonb default '[]'::jsonb,

  -- Organization
  is_favorite boolean default false,
  notes text,
  tags text[] default '{}',

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index analyzed_jobs_user_id_idx on public.analyzed_jobs(user_id);
create index analyzed_jobs_profile_id_idx on public.analyzed_jobs(profile_id);
create index analyzed_jobs_application_id_idx on public.analyzed_jobs(application_id);
create index analyzed_jobs_is_favorite_idx on public.analyzed_jobs(is_favorite) where is_favorite = true;
create index analyzed_jobs_tags_idx on public.analyzed_jobs using gin(tags);

-- ============================================
-- 8. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.applications enable row level security;
alter table public.stories enable row level security;
alter table public.company_research enable row level security;
alter table public.technical_answers enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.analyzed_jobs enable row level security;

-- Profiles policies
create policy "Users can view own profiles"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own profiles"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profiles"
  on public.profiles for update
  using (auth.uid() = user_id);

create policy "Users can delete own profiles"
  on public.profiles for delete
  using (auth.uid() = user_id);

-- Applications policies
create policy "Users can view own applications"
  on public.applications for select
  using (auth.uid() = user_id);

create policy "Users can insert own applications"
  on public.applications for insert
  with check (auth.uid() = user_id);

create policy "Users can update own applications"
  on public.applications for update
  using (auth.uid() = user_id);

create policy "Users can delete own applications"
  on public.applications for delete
  using (auth.uid() = user_id);

-- Stories policies
create policy "Users can view own stories"
  on public.stories for select
  using (auth.uid() = user_id);

create policy "Users can insert own stories"
  on public.stories for insert
  with check (auth.uid() = user_id);

create policy "Users can update own stories"
  on public.stories for update
  using (auth.uid() = user_id);

create policy "Users can delete own stories"
  on public.stories for delete
  using (auth.uid() = user_id);

-- Company research policies
create policy "Users can view own research"
  on public.company_research for select
  using (auth.uid() = user_id);

create policy "Users can insert own research"
  on public.company_research for insert
  with check (auth.uid() = user_id);

create policy "Users can update own research"
  on public.company_research for update
  using (auth.uid() = user_id);

create policy "Users can delete own research"
  on public.company_research for delete
  using (auth.uid() = user_id);

-- Technical answers policies
create policy "Users can view own answers"
  on public.technical_answers for select
  using (auth.uid() = user_id);

create policy "Users can insert own answers"
  on public.technical_answers for insert
  with check (auth.uid() = user_id);

create policy "Users can update own answers"
  on public.technical_answers for update
  using (auth.uid() = user_id);

create policy "Users can delete own answers"
  on public.technical_answers for delete
  using (auth.uid() = user_id);

-- Practice sessions policies
create policy "Users can view own sessions"
  on public.practice_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own sessions"
  on public.practice_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own sessions"
  on public.practice_sessions for delete
  using (auth.uid() = user_id);

-- Analyzed jobs policies
create policy "Users can view own analyzed jobs"
  on public.analyzed_jobs for select
  using (auth.uid() = user_id);

create policy "Users can insert own analyzed jobs"
  on public.analyzed_jobs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own analyzed jobs"
  on public.analyzed_jobs for update
  using (auth.uid() = user_id);

create policy "Users can delete own analyzed jobs"
  on public.analyzed_jobs for delete
  using (auth.uid() = user_id);

-- ============================================
-- 9. FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger applications_updated_at
  before update on public.applications
  for each row execute function public.handle_updated_at();

create trigger stories_updated_at
  before update on public.stories
  for each row execute function public.handle_updated_at();

create trigger technical_answers_updated_at
  before update on public.technical_answers
  for each row execute function public.handle_updated_at();

create trigger analyzed_jobs_updated_at
  before update on public.analyzed_jobs
  for each row execute function public.handle_updated_at();

-- Function to create default profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, name, is_default, display_name)
  values (new.id, 'My Profile', true, coalesce(new.raw_user_meta_data->>'full_name', 'Professional'));
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Function to ensure only one default profile per user
create or replace function public.ensure_single_default_profile()
returns trigger as $$
begin
  if new.is_default = true then
    update public.profiles
    set is_default = false
    where user_id = new.user_id
      and id != new.id
      and is_default = true;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger ensure_single_default
  after insert or update of is_default on public.profiles
  for each row
  when (new.is_default = true)
  execute function public.ensure_single_default_profile();
