-- Alter cashier_numbers from TEXT[] to TEXT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ia_default_settings'
      AND column_name = 'cashier_numbers'
      AND data_type = 'ARRAY'
  ) THEN
    -- Drop default to allow type change
    ALTER TABLE public.ia_default_settings ALTER COLUMN cashier_numbers DROP DEFAULT;
    -- Convert array to comma-separated string during type change
    ALTER TABLE public.ia_default_settings
      ALTER COLUMN cashier_numbers TYPE TEXT USING (
        CASE
          WHEN cashier_numbers IS NULL THEN ''
          ELSE array_to_string(cashier_numbers, ', ')
        END
      );
    -- Set new default for TEXT
    ALTER TABLE public.ia_default_settings ALTER COLUMN cashier_numbers SET DEFAULT '';
  END IF;
END$$;