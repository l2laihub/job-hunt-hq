-- Add generated_summary column to profiles table
-- This field stores the AI-generated professional summary for resume
-- Separate from current_situation which is used for AI personalization

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS generated_summary TEXT DEFAULT '';

-- Add comment for documentation
COMMENT ON COLUMN profiles.generated_summary IS 'AI-generated professional summary for resume PDF. Separate from current_situation which is for AI personalization.';
