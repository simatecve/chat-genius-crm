-- Actualizar políticas RLS para leads para permitir acceso por instancias de WhatsApp

-- Eliminar políticas existentes de lectura
DROP POLICY IF EXISTS "Users can view their own leads" ON public.leads;
DROP POLICY IF EXISTS "todos" ON public.leads;

-- Crear nueva política de lectura que incluye instancias de WhatsApp
CREATE POLICY "Users can view their own leads and leads from their instances"
ON public.leads
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR 
  instancia IN (
    SELECT name 
    FROM public.whatsapp_connections 
    WHERE user_id = auth.uid()
  )
);

-- Actualizar política de INSERT para asignar user_id o validar instancia
DROP POLICY IF EXISTS "Users can create their own leads" ON public.leads;

CREATE POLICY "Users can create leads in their columns or instances"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.lead_columns 
    WHERE lead_columns.id = leads.column_id 
    AND lead_columns.user_id = auth.uid()
  ))
  OR
  (instancia IN (
    SELECT name 
    FROM public.whatsapp_connections 
    WHERE user_id = auth.uid()
  ))
);

-- Actualizar política de UPDATE
DROP POLICY IF EXISTS "Users can update their own leads" ON public.leads;

CREATE POLICY "Users can update their leads and instance leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  OR 
  instancia IN (
    SELECT name 
    FROM public.whatsapp_connections 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.lead_columns 
    WHERE lead_columns.id = leads.column_id 
    AND lead_columns.user_id = auth.uid()
  ))
  OR
  (instancia IN (
    SELECT name 
    FROM public.whatsapp_connections 
    WHERE user_id = auth.uid()
  ))
);

-- Actualizar política de DELETE
DROP POLICY IF EXISTS "Users can delete their own leads" ON public.leads;

CREATE POLICY "Users can delete their leads and instance leads"
ON public.leads
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id 
  OR 
  instancia IN (
    SELECT name 
    FROM public.whatsapp_connections 
    WHERE user_id = auth.uid()
  )
);