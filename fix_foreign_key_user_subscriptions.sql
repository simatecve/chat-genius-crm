-- Script para corregir la foreign key de user_subscriptions
-- La foreign key actualmente apunta a auth.users pero debe apuntar a public.profiles

-- 1. Eliminar la foreign key existente que apunta a auth.users
ALTER TABLE public.user_subscriptions 
DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_fkey;

-- 2. Crear la nueva foreign key que apunte a public.profiles
ALTER TABLE public.user_subscriptions 
ADD CONSTRAINT user_subscriptions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Verificar que la foreign key se haya creado correctamente
-- Puedes ejecutar esta consulta para verificar:
-- SELECT conname, conrelid::regclass, confrelid::regclass 
-- FROM pg_constraint 
-- WHERE conname = 'user_subscriptions_user_id_fkey';

COMMIT;