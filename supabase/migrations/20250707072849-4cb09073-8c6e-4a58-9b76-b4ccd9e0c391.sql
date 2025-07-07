
-- First, let's create an ENUM type for risk levels
CREATE TYPE public.risk_level_enum AS ENUM ('low', 'medium', 'high');

-- Update the transactions table to use the ENUM type
-- First, we need to handle any existing data that might not conform
UPDATE public.transactions 
SET risk_level = 'low' 
WHERE risk_level IS NULL OR risk_level NOT IN ('low', 'medium', 'high');

-- Now alter the column to use the ENUM type
ALTER TABLE public.transactions 
ALTER COLUMN risk_level TYPE public.risk_level_enum 
USING risk_level::public.risk_level_enum;

-- Set a proper default value
ALTER TABLE public.transactions 
ALTER COLUMN risk_level SET DEFAULT 'low'::public.risk_level_enum;

-- Make the column NOT NULL since it should always have a value
ALTER TABLE public.transactions 
ALTER COLUMN risk_level SET NOT NULL;
