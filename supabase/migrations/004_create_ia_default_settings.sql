-- IA Default Settings singleton table
CREATE TABLE IF NOT EXISTS public.ia_default_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  cashier_numbers TEXT[] NOT NULL DEFAULT '{}',
  cbu TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure a single row exists
INSERT INTO public.ia_default_settings (id)
SELECT 1
WHERE NOT EXISTS (SELECT 1 FROM public.ia_default_settings WHERE id = 1);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ia_default_settings_updated_at ON public.ia_default_settings;
CREATE TRIGGER trg_ia_default_settings_updated_at
BEFORE UPDATE ON public.ia_default_settings
FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- Row Level Security
ALTER TABLE public.ia_default_settings ENABLE ROW LEVEL SECURITY;

-- Read policy: any authenticated user can read
DROP POLICY IF EXISTS ia_default_settings_select ON public.ia_default_settings;
CREATE POLICY ia_default_settings_select ON public.ia_default_settings
FOR SELECT
TO authenticated
USING (true);

-- Write policies: only admin or superadmin can insert/update
DROP POLICY IF EXISTS ia_default_settings_write ON public.ia_default_settings;
CREATE POLICY ia_default_settings_write ON public.ia_default_settings
FOR INSERT TO authenticated WITH CHECK (
  id = 1 AND auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS ia_default_settings_update ON public.ia_default_settings;
CREATE POLICY ia_default_settings_update ON public.ia_default_settings
FOR UPDATE TO authenticated USING (
  id = 1 AND auth.uid() IS NOT NULL
) WITH CHECK (
  id = 1 AND auth.uid() IS NOT NULL
);