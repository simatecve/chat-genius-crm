-- Create tareas (tasks) table for calendar system
-- This table stores tasks/events for the calendar feature

CREATE TABLE IF NOT EXISTS public.tareas (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  titulo TEXT NOT NULL,
  descripion TEXT, -- Note: typo kept for compatibility with CapibetCRM
  fecha DATE NOT NULL,
  hora TIME DEFAULT '09:00:00',
  asignada BIGINT, -- User assigned to task (references auth.users but using BIGINT for compatibility)
  creado_por BIGINT, -- User who created task
  categoria TEXT NOT NULL DEFAULT 'Trabajo',
  prioridad TEXT NOT NULL DEFAULT 'Media'
);

-- Enable Row Level Security
ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admin users can see all tasks
CREATE POLICY "Admin users can view all tasks"
  ON public.tareas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id::text = auth.uid()::text
      AND (auth.users.raw_user_meta_data->>'role' = 'Admin' 
           OR auth.users.raw_user_meta_data->>'role' = 'admin')
    )
  );

-- RLS Policy: Commercial users can only see tasks assigned to them
CREATE POLICY "Commercial users can view assigned tasks"
  ON public.tareas FOR SELECT
  USING (
    asignada::text = auth.uid()::text
    OR creado_por::text = auth.uid()::text
  );

-- RLS Policy: Admin users can insert tasks
CREATE POLICY "Admin users can insert tasks"
  ON public.tareas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id::text = auth.uid()::text
      AND (auth.users.raw_user_meta_data->>'role' = 'Admin'
           OR auth.users.raw_user_meta_data->>'role' = 'admin')
    )
  );

-- RLS Policy: Users can update tasks they created or are assigned to
CREATE POLICY "Users can update their tasks"
  ON public.tareas FOR UPDATE
  USING (
    asignada::text = auth.uid()::text
    OR creado_por::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id::text = auth.uid()::text
      AND (auth.users.raw_user_meta_data->>'role' = 'Admin'
           OR auth.users.raw_user_meta_data->>'role' = 'admin')
    )
  );

-- RLS Policy: Admin users can delete tasks
CREATE POLICY "Admin users can delete tasks"
  ON public.tareas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id::text = auth.uid()::text
      AND (auth.users.raw_user_meta_data->>'role' = 'Admin'
           OR auth.users.raw_user_meta_data->>'role' = 'admin')
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tareas_fecha ON public.tareas(fecha);
CREATE INDEX IF NOT EXISTS idx_tareas_asignada ON public.tareas(asignada);
CREATE INDEX IF NOT EXISTS idx_tareas_creado_por ON public.tareas(creado_por);
CREATE INDEX IF NOT EXISTS idx_tareas_categoria ON public.tareas(categoria);
CREATE INDEX IF NOT EXISTS idx_tareas_prioridad ON public.tareas(prioridad);

-- Add comment to table
COMMENT ON TABLE public.tareas IS 'Calendar tasks/events for the calendar system';
COMMENT ON COLUMN public.tareas.descripion IS 'Task description (typo kept for CapibetCRM compatibility)';
