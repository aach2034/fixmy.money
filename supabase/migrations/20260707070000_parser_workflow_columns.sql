-- Migration: Add missing columns for enhanced parser workflow
-- Adds is_negative, is_collection to negative_items
-- Adds all_accounts, all_inquiries, public_records, section_confidence to parsed_credit_reports
-- Adds 'positive' to negative_item_category enum

-- Add 'positive' to negative_item_category enum if not present
DO $$ BEGIN
  ALTER TYPE public.negative_item_category ADD VALUE IF NOT EXISTS 'positive';
EXCEPTION WHEN others THEN NULL; END $$;

-- Add is_negative and is_collection columns to negative_items
ALTER TABLE public.negative_items
  ADD COLUMN IF NOT EXISTS is_negative BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_collection BOOLEAN DEFAULT FALSE;

-- Add all_accounts, all_inquiries, public_records, section_confidence to parsed_credit_reports
ALTER TABLE public.parsed_credit_reports
  ADD COLUMN IF NOT EXISTS all_accounts JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS all_inquiries JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS public_records JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS section_confidence JSONB DEFAULT '{}'::JSONB;

-- Backfill is_negative from negative_category for existing rows
UPDATE public.negative_items
SET is_negative = TRUE
WHERE negative_category IN ('collection', 'charge_off', 'late_payment', 'repossession', 'foreclosure', 'bankruptcy', 'public_record', 'derogatory', 'other')
  AND is_negative = FALSE;

UPDATE public.negative_items
SET is_collection = TRUE
WHERE negative_category = 'collection'
  AND is_collection = FALSE;
