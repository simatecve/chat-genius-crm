-- Create embudos (funnels) table
CREATE TABLE IF NOT EXISTS public.embudos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  espacio_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  orden INTEGER DEFAULT 0,
  color TEXT DEFAULT '#4ecdc4',
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security
ALTER TABLE public.embudos ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view embudos from their workspaces
CREATE POLICY "Users can view workspace embudos"
  ON public.embudos FOR SELECT
  USING (
    espacio_id IN (
      SELECT id FROM public.workspaces 
      WHERE user_id = auth.uid() -- Simplified check, assuming user owns workspace
    )
    OR creado_por = auth.uid()
  );

-- RLS Policy: Users can insert embudos
CREATE POLICY "Users can insert embudos"
  ON public.embudos FOR INSERT
  WITH CHECK (
    auth.uid() = creado_por
  );

-- RLS Policy: Users can update their embudos
CREATE POLICY "Users can update their embudos"
  ON public.embudos FOR UPDATE
  USING (
    creado_por = auth.uid() OR 
    espacio_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid())
  );

-- RLS Policy: Users can delete their embudos
CREATE POLICY "Users can delete their embudos"
  ON public.embudos FOR DELETE
  USING (
    creado_por = auth.uid() OR 
    espacio_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid())
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_embudos_espacio_id ON public.embudos(espacio_id);
CREATE INDEX IF NOT EXISTS idx_embudos_creado_por ON public.embudos(creado_por);
