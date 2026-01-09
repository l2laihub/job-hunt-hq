-- Job Hunt HQ - Interview Notes & Recording Feature
-- This migration creates the interview_notes table and interview-recordings storage bucket

-- ============================================
-- 1. CREATE STORAGE BUCKET
-- ============================================
-- Create the bucket for interview audio recordings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'interview-recordings',
  'interview-recordings',
  false,  -- Private bucket (requires auth)
  52428800, -- 50MB max file size (for long interviews)
  ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. STORAGE RLS POLICIES
-- ============================================

-- Policy: Users can upload to their own folder (user_id/application_id/filename)
CREATE POLICY "Users can upload own interview recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'interview-recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can view their own recordings
CREATE POLICY "Users can view own interview recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'interview-recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own recordings
CREATE POLICY "Users can update own interview recordings"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'interview-recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own recordings
CREATE POLICY "Users can delete own interview recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'interview-recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- 3. INTERVIEW NOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.interview_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  application_id uuid REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,

  -- Interview metadata
  stage text CHECK (stage IN (
    'phone_screen',
    'recruiter',
    'hiring_manager',
    'technical',
    'behavioral',
    'onsite',
    'panel',
    'final',
    'other'
  )) NOT NULL DEFAULT 'phone_screen',
  interview_date timestamptz NOT NULL DEFAULT now(),
  interviewer_name text,
  interviewer_role text,
  duration_minutes integer,

  -- User notes (manual input)
  raw_notes text DEFAULT '',

  -- Audio recording metadata
  audio_path text,                    -- Supabase storage path
  audio_duration_seconds integer,
  audio_size_bytes integer,
  audio_mime_type text,

  -- AI-generated content (populated on manual trigger)
  transcript text,
  summary text,
  key_takeaways jsonb DEFAULT '[]'::jsonb,
  questions_asked jsonb DEFAULT '[]'::jsonb,
  your_answers jsonb DEFAULT '[]'::jsonb,

  -- Next step prep (AI-generated)
  next_step_prep jsonb DEFAULT '{
    "areasToReview": [],
    "suggestedStories": [],
    "anticipatedQuestions": [],
    "strengthsShown": [],
    "areasToImprove": [],
    "followUpActions": [],
    "redFlags": [],
    "greenFlags": []
  }'::jsonb,

  -- Interview outcome
  outcome text CHECK (outcome IN (
    'pending',
    'passed',
    'rejected',
    'ghosted',
    'withdrew'
  )) DEFAULT 'pending',
  outcome_notes text,

  -- Processing status
  processing_status text CHECK (processing_status IN (
    'none',           -- No audio uploaded
    'uploaded',       -- Audio uploaded, not processed
    'transcribing',   -- Currently transcribing
    'analyzing',      -- Currently analyzing
    'completed',      -- Analysis complete
    'failed'          -- Processing failed
  )) DEFAULT 'none',
  processing_error text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- 4. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS interview_notes_user_id_idx ON public.interview_notes(user_id);
CREATE INDEX IF NOT EXISTS interview_notes_application_id_idx ON public.interview_notes(application_id);
CREATE INDEX IF NOT EXISTS interview_notes_stage_idx ON public.interview_notes(stage);
CREATE INDEX IF NOT EXISTS interview_notes_interview_date_idx ON public.interview_notes(interview_date DESC);
CREATE INDEX IF NOT EXISTS interview_notes_outcome_idx ON public.interview_notes(outcome);

-- ============================================
-- 5. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.interview_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own interview notes"
  ON public.interview_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interview notes"
  ON public.interview_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interview notes"
  ON public.interview_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own interview notes"
  ON public.interview_notes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 6. TRIGGER FOR updated_at
-- ============================================
CREATE TRIGGER interview_notes_updated_at
  BEFORE UPDATE ON public.interview_notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
