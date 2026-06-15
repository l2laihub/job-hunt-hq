-- Job Hunt HQ - Strict per-profile data scoping
-- 1. Backfill NULL profile_id on already-scoped tables to each user's default profile
-- 2. Add profile_id to company_research and interview_notes (previously user-only scoped)
-- 3. Make company_research uniqueness profile-aware
--
-- Default profile resolution per user: prefer is_default = true, else oldest by created_at.
-- Rows belonging to a user that has NO profile row are left NULL (cannot be assigned).

-- ============================================
-- 1. BACKFILL EXISTING SCOPED TABLES
-- ============================================
do $$
declare
  tbl text;
  scoped_tables text[] := array[
    'applications',
    'technical_answers',
    'analyzed_jobs',
    'enhancements',
    'interview_prep_sessions',
    'copilot_sessions',
    'assistant_chats',
    'topic_research',
    'study_sessions',
    'study_progress'
  ];
begin
  foreach tbl in array scoped_tables loop
    -- Skip tables that don't exist in this environment
    if to_regclass('public.' || tbl) is null then
      continue;
    end if;

    execute format($f$
      update public.%1$I t
      set profile_id = (
        select p.id
        from public.profiles p
        where p.user_id = t.user_id
        order by p.is_default desc, p.created_at asc
        limit 1
      )
      where t.profile_id is null
        and exists (
          select 1 from public.profiles p where p.user_id = t.user_id
        )
    $f$, tbl);
  end loop;
end $$;

-- ============================================
-- 2. COMPANY RESEARCH -> profile-scoped
-- ============================================
alter table public.company_research
  add column if not exists profile_id uuid references public.profiles(id) on delete set null;

create index if not exists company_research_profile_id_idx
  on public.company_research(profile_id);

-- Backfill to default profile
update public.company_research t
set profile_id = (
  select p.id
  from public.profiles p
  where p.user_id = t.user_id
  order by p.is_default desc, p.created_at asc
  limit 1
)
where t.profile_id is null
  and exists (select 1 from public.profiles p where p.user_id = t.user_id);

-- Uniqueness is now per (user, profile, company) so the same company can be
-- researched independently under different profiles.
alter table public.company_research
  drop constraint if exists company_research_user_id_company_name_key;

-- Use a unique index (treats NULL profile_id rows as distinct, which is fine
-- for any legacy rows belonging to profile-less users).
create unique index if not exists company_research_user_profile_company_key
  on public.company_research(user_id, profile_id, company_name);

-- ============================================
-- 3. INTERVIEW NOTES -> profile-scoped (denormalized from parent application)
-- ============================================
alter table public.interview_notes
  add column if not exists profile_id uuid references public.profiles(id) on delete set null;

create index if not exists interview_notes_profile_id_idx
  on public.interview_notes(profile_id);

-- Backfill from the parent application's profile
update public.interview_notes n
set profile_id = a.profile_id
from public.applications a
where n.application_id = a.id
  and n.profile_id is null;
