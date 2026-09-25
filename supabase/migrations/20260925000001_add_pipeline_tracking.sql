-- Pipeline tracking parity with the Claude Application Pipeline:
-- 'contact' (in contact, not yet applied) and 'expired' (posting closed) statuses,
-- recruiter, next action, and structured compensation.
-- Covered by the existing applications RLS policy (auth.uid() = user_id).

ALTER TABLE public.applications
DROP CONSTRAINT IF EXISTS applications_status_check;

ALTER TABLE public.applications
ADD CONSTRAINT applications_status_check
CHECK (status IN ('wishlist', 'contact', 'applied', 'interviewing', 'offer', 'passed', 'rejected', 'expired'));

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS recruiter text,
  ADD COLUMN IF NOT EXISTS recruiter_contact text,
  ADD COLUMN IF NOT EXISTS contacted_date date,
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS next_action_date date,
  ADD COLUMN IF NOT EXISTS comp_min numeric CHECK (comp_min >= 0),
  ADD COLUMN IF NOT EXISTS comp_max numeric CHECK (comp_max >= 0),
  ADD COLUMN IF NOT EXISTS comp_unit text CHECK (comp_unit IN ('year', 'hour')),
  ADD COLUMN IF NOT EXISTS comp_currency text CHECK (comp_currency IN ('USD', 'CAD'));

ALTER TABLE public.applications
DROP CONSTRAINT IF EXISTS applications_comp_range_check;

ALTER TABLE public.applications
ADD CONSTRAINT applications_comp_range_check
CHECK (comp_min IS NULL OR comp_max IS NULL OR comp_min <= comp_max);

CREATE INDEX IF NOT EXISTS applications_next_action_date_idx
  ON public.applications(user_id, next_action_date)
  WHERE next_action_date IS NOT NULL;
