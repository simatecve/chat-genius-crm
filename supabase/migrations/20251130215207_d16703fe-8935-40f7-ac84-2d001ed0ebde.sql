-- Eliminar políticas antiguas que causan problemas
DROP POLICY IF EXISTS "Users can view organization tags" ON public.etiquetas;
DROP POLICY IF EXISTS "Users can insert tags" ON public.etiquetas;
DROP POLICY IF EXISTS "Users can update their tags" ON public.etiquetas;
DROP POLICY IF EXISTS "Users can delete their tags" ON public.etiquetas;

-- Crear políticas RLS simples y funcionales para etiquetas
CREATE POLICY "Users can view their own tags"
  ON public.etiquetas
  FOR SELECT
  USING (
    creado_por = auth.uid() OR 
    organizacion_id IS NULL OR
    creado_por IS NULL
  );

CREATE POLICY "Users can insert their own tags"
  ON public.etiquetas
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own tags"
  ON public.etiquetas
  FOR UPDATE
  USING (creado_por = auth.uid())
  WITH CHECK (creado_por = auth.uid());

CREATE POLICY "Users can delete their own tags"
  ON public.etiquetas
  FOR DELETE
  USING (creado_por = auth.uid());