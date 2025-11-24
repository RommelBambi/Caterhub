-- Add selection_mode column to packages table
-- This allows packages to be either FIXED_MENU or CHOICE_BASED

-- Add the column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'packages'
    AND column_name = 'selection_mode'
  ) THEN
    ALTER TABLE public.packages
    ADD COLUMN selection_mode TEXT CHECK (selection_mode IN ('FIXED_MENU', 'CHOICE_BASED'));
    
    -- Set default for existing packages (assume CHOICE_BASED for backward compatibility)
    UPDATE public.packages
    SET selection_mode = 'CHOICE_BASED'
    WHERE selection_mode IS NULL;
    
    -- Make it NOT NULL after setting defaults
    ALTER TABLE public.packages
    ALTER COLUMN selection_mode SET NOT NULL;
    
    -- Add default value for new rows
    ALTER TABLE public.packages
    ALTER COLUMN selection_mode SET DEFAULT 'CHOICE_BASED';
  END IF;
END $$;

-- Verify the column was added
SELECT 
  'Verification' as check,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'packages'
  AND column_name = 'selection_mode';

