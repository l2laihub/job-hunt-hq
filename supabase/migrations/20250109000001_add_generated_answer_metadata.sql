-- Add generated_answer_metadata column to stories table
-- This stores the full AI-generated answer metadata including follow-up Q&A with responses

-- Add the generated_answer_metadata column as JSONB with default null
ALTER TABLE public.stories
ADD COLUMN IF NOT EXISTS generated_answer_metadata jsonb DEFAULT NULL;

-- Add a comment to describe the column
COMMENT ON COLUMN public.stories.generated_answer_metadata IS 'Full AI-generated answer metadata including: detectedQuestionType, answerFormat, sections, narrative, bulletPoints, keyTalkingPoints, deliveryTips, followUpQA (with suggested answers), and sources';
