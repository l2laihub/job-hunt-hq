-- Add skill_groups column to profiles table
-- This allows users to organize their technical skills into custom groups

-- Add the skill_groups column as JSONB with default empty array
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS skill_groups jsonb DEFAULT '[]'::jsonb;

-- Add a comment to describe the column
COMMENT ON COLUMN public.profiles.skill_groups IS 'User-defined skill groups for organizing technical skills. Each group has: id, name, skills[], order, isCustom';
