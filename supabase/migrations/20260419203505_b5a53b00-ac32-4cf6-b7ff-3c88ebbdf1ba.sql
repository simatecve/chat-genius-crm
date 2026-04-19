
-- Habilitar RLS en mensaje_landing (tabla de formulario público de landing)
ALTER TABLE public.mensaje_landing ENABLE ROW LEVEL SECURITY;

-- INSERT público: la landing necesita poder guardar mensajes sin autenticación
CREATE POLICY "Public can submit landing messages"
ON public.mensaje_landing
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- SELECT: solo el dueño del mensaje (id_usuario) o un superadmin
CREATE POLICY "Owners and superadmins can read landing messages"
ON public.mensaje_landing
FOR SELECT
TO authenticated
USING (
  id_usuario = auth.uid()::text
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND profile_type = 'superadmin'
  )
);

-- UPDATE / DELETE: solo superadmin
CREATE POLICY "Only superadmins can update landing messages"
ON public.mensaje_landing
FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profile_type = 'superadmin')
);

CREATE POLICY "Only superadmins can delete landing messages"
ON public.mensaje_landing
FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profile_type = 'superadmin')
);
