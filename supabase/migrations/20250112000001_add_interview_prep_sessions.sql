-- Interview Prep Sessions Table
-- Stores interview preparation sessions for tracking interview readiness

-- ============================================
-- 1. INTERVIEW PREP SESSIONS TABLE
-- ============================================
create table public.interview_prep_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  profile_id uuid references public.profiles(id) on delete set null,
  application_id uuid references public.applications(id) on delete cascade not null,

  -- Interview scheduling
  interview_date date,
  interview_time time,
  interview_type text check (interview_type in (
    'phone-screen', 'technical', 'behavioral', 'system-design',
    'hiring-manager', 'final-round', 'onsite'
  )) not null default 'phone-screen',
  interviewer_name text,
  interviewer_role text,
  interview_location text,
  notes text,

  -- Preparation state (stored as JSONB for flexibility)
  checklist jsonb default '[]'::jsonb,
  predicted_questions jsonb default '[]'::jsonb,
  readiness_score integer default 0 check (readiness_score >= 0 and readiness_score <= 100),

  -- Generated content (from AI services)
  phone_screen_prep jsonb,
  technical_prep jsonb,
  application_strategy jsonb,
  quick_reference jsonb,

  -- Practice tracking
  practice_session_ids uuid[] default '{}',
  last_practiced_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index interview_prep_sessions_user_id_idx on public.interview_prep_sessions(user_id);
create index interview_prep_sessions_profile_id_idx on public.interview_prep_sessions(profile_id);
create index interview_prep_sessions_application_id_idx on public.interview_prep_sessions(application_id);
create index interview_prep_sessions_interview_date_idx on public.interview_prep_sessions(interview_date);

-- ============================================
-- 2. INTERVIEW PRACTICE SESSIONS TABLE
-- ============================================
create table public.interview_practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  prep_session_id uuid references public.interview_prep_sessions(id) on delete cascade not null,

  -- Session data
  mode text check (mode in ('quick', 'timed', 'mock')) not null default 'quick',
  question_ids text[] default '{}',
  duration_seconds integer,
  self_rating integer check (self_rating >= 1 and self_rating <= 5),
  notes text,

  -- For mock interviews - store detailed results
  question_results jsonb default '[]'::jsonb,
  feedback jsonb,
  config jsonb,

  created_at timestamptz default now()
);

-- Indexes
create index interview_practice_sessions_user_id_idx on public.interview_practice_sessions(user_id);
create index interview_practice_sessions_prep_session_id_idx on public.interview_practice_sessions(prep_session_id);

-- ============================================
-- 3. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS
alter table public.interview_prep_sessions enable row level security;
alter table public.interview_practice_sessions enable row level security;

-- Interview prep sessions policies
create policy "Users can view own prep sessions"
  on public.interview_prep_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own prep sessions"
  on public.interview_prep_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own prep sessions"
  on public.interview_prep_sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete own prep sessions"
  on public.interview_prep_sessions for delete
  using (auth.uid() = user_id);

-- Interview practice sessions policies
create policy "Users can view own practice sessions"
  on public.interview_practice_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own practice sessions"
  on public.interview_practice_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own practice sessions"
  on public.interview_practice_sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete own practice sessions"
  on public.interview_practice_sessions for delete
  using (auth.uid() = user_id);

-- ============================================
-- 4. TRIGGERS
-- ============================================

-- Apply updated_at trigger to interview_prep_sessions
create trigger interview_prep_sessions_updated_at
  before update on public.interview_prep_sessions
  for each row execute function public.handle_updated_at();
