-- Add content_hash column to analyzed_jobs for duplicate detection
ALTER TABLE analyzed_jobs ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- Create index for fast duplicate lookup
CREATE INDEX IF NOT EXISTS idx_analyzed_jobs_content_hash ON analyzed_jobs(content_hash);

-- Add comment for documentation
COMMENT ON COLUMN analyzed_jobs.content_hash IS 'Hash of normalized job description for duplicate detection';
