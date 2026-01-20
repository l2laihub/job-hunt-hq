-- Add 'passed' status to applications table
-- This status is for jobs the user decided to pass on (distinct from rejected by company)

-- Drop the old constraint and add a new one with 'passed' included
ALTER TABLE public.applications
DROP CONSTRAINT IF EXISTS applications_status_check;

ALTER TABLE public.applications
ADD CONSTRAINT applications_status_check
CHECK (status IN ('wishlist', 'applied', 'interviewing', 'offer', 'passed', 'rejected'));
