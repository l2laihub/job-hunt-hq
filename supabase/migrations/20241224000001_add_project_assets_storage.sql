-- Job Hunt HQ - Project Assets Storage
-- This migration creates storage bucket for project documentation assets

-- ============================================
-- 1. CREATE STORAGE BUCKET
-- ============================================
-- Create the bucket for project assets (screenshots, diagrams, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-assets',
  'project-assets',
  true,
  10485760, -- 10MB max file size
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. STORAGE RLS POLICIES
-- ============================================

-- Policy: Users can upload to their own folder (user_id/project_id/filename)
CREATE POLICY "Users can upload own project assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-assets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can view their own assets
CREATE POLICY "Users can view own project assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-assets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own assets
CREATE POLICY "Users can update own project assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-assets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own assets
CREATE POLICY "Users can delete own project assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-assets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Public can view all assets (for public URLs)
-- This is needed because we use public URLs for displaying images
CREATE POLICY "Public can view project assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'project-assets');

-- ============================================
-- 3. PROJECT DOCUMENTATION TABLE (Optional)
-- ============================================
-- Separate table for project documentation to enable better querying
-- and avoid bloating the profiles JSONB column

CREATE TABLE IF NOT EXISTS public.project_documentation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Project identification
  project_id text NOT NULL, -- Matches project.id in profile's activeProjects
  project_name text NOT NULL,

  -- Documentation content (stored as JSONB for flexibility)
  documentation jsonb DEFAULT '{
    "screenshots": [],
    "architectureDiagrams": [],
    "technicalDecisions": [],
    "challenges": [],
    "metrics": [],
    "systemContext": "",
    "integrations": [],
    "teamSize": null,
    "duration": "",
    "myRole": "",
    "aiSummary": "",
    "talkingPoints": [],
    "interviewQuestions": []
  }'::jsonb,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Unique constraint per user + project
  UNIQUE(user_id, project_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS project_docs_user_id_idx ON public.project_documentation(user_id);
CREATE INDEX IF NOT EXISTS project_docs_profile_id_idx ON public.project_documentation(profile_id);
CREATE INDEX IF NOT EXISTS project_docs_project_id_idx ON public.project_documentation(project_id);

-- Enable RLS
ALTER TABLE public.project_documentation ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own project documentation"
  ON public.project_documentation FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own project documentation"
  ON public.project_documentation FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own project documentation"
  ON public.project_documentation FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own project documentation"
  ON public.project_documentation FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER project_documentation_updated_at
  BEFORE UPDATE ON public.project_documentation
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
