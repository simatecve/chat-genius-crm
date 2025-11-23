-- Create etiquetas (tags) table for tag management system
-- This table stores tags that can be assigned to contacts, leads, etc.

CREATE TABLE IF NOT EXISTS public.etiquetas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  nombre TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#F29A1F',
  descripcion TEXT,
  creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organizacion_id UUID -- For multi-tenant support
);

-- Enable Row Level Security
ALTER TABLE public.etiquetas ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view tags from their organization
CREATE POLICY "Users can view organization tags"
  ON public.etiquetas FOR SELECT
  USING (
    organizacion_id = (
      SELECT (raw_user_meta_data->>'organizacion_id')::uuid
      FROM auth.users
      WHERE id = auth.uid()
    )
    OR creado_por = auth.uid()
    OR organizacion_id IS NULL -- Allow viewing tags without organization
  );

-- RLS Policy: Users can insert tags
CREATE POLICY "Users can insert tags"
  ON public.etiquetas FOR INSERT
  WITH CHECK (
    creado_por = auth.uid()
  );

-- RLS Policy: Users can update tags they created
CREATE POLICY "Users can update their tags"
  ON public.etiquetas FOR UPDATE
  USING (
    creado_por = auth.uid()
  );

-- RLS Policy: Users can delete tags they created
CREATE POLICY "Users can delete their tags"
  ON public.etiquetas FOR DELETE
  USING (
    creado_por = auth.uid()
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_etiquetas_organizacion ON public.etiquetas(organizacion_id);
CREATE INDEX IF NOT EXISTS idx_etiquetas_creado_por ON public.etiquetas(creado_por);
CREATE INDEX IF NOT EXISTS idx_etiquetas_nombre ON public.etiquetas(nombre);
CREATE INDEX IF NOT EXISTS idx_etiquetas_color ON public.etiquetas(color);

-- Add unique constraint to prevent duplicate tag names per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_etiquetas_unique_nombre_org 
  ON public.etiquetas(nombre, organizacion_id) 
  WHERE organizacion_id IS NOT NULL;

-- Add comment to table
COMMENT ON TABLE public.etiquetas IS 'Tags/labels that can be assigned to contacts, leads, and other entities';
COMMENT ON COLUMN public.etiquetas.organizacion_id IS 'Organization ID for multi-tenant support (optional)';
