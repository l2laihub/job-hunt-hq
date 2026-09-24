-- Source documents (career facts, resume, prep notes) fed verbatim to AI prompts.
-- Covered by the existing profiles RLS policy (auth.uid() = user_id).

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS context_documents JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN profiles.context_documents IS 'Array of {id, name, kind: authoritative|supporting, content, uploadedAt}. Authoritative doc overrides structured profile fields in AI prompts.';
