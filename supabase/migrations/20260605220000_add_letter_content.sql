-- Add letter_content column to dispute_letters for storing AI-generated letter text
ALTER TABLE public.dispute_letters
ADD COLUMN IF NOT EXISTS letter_content TEXT DEFAULT '';

-- Add generation_error column to track failed generation attempts
ALTER TABLE public.dispute_letters
ADD COLUMN IF NOT EXISTS generation_error TEXT DEFAULT NULL;

-- Add generated_at timestamp
ALTER TABLE public.dispute_letters
ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ DEFAULT NULL;
