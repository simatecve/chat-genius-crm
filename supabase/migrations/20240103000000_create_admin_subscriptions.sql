-- Crear tabla para gestión completa de suscripciones por super admin
CREATE TABLE IF NOT EXISTS public.admin_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
    payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL,
    
    -- Fechas de suscripción
    start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    
    -- Estado de la suscripción
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'cancelled', 'expired', 'pending')),
    
    -- Información de pago
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly', 'quarterly', 'weekly', 'one-time')),
    
    -- Información adicional
    notes TEXT,
    auto_renew BOOLEAN DEFAULT true,
    trial_end_date TIMESTAMP WITH TIME ZONE,
    
    -- Metadatos de administración
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_admin_subscriptions_user_id ON public.admin_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_subscriptions_plan_id ON public.admin_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_admin_subscriptions_status ON public.admin_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_admin_subscriptions_start_date ON public.admin_subscriptions(start_date);
CREATE INDEX IF NOT EXISTS idx_admin_subscriptions_end_date ON public.admin_subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_admin_subscriptions_payment_method ON public.admin_subscriptions(payment_method_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_admin_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at
CREATE TRIGGER update_admin_subscriptions_updated_at
    BEFORE UPDATE ON public.admin_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_admin_subscriptions_updated_at();

-- Habilitar RLS
ALTER TABLE public.admin_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Solo superadmins pueden gestionar todas las suscripciones
CREATE POLICY "Superadmins can manage all subscriptions" ON public.admin_subscriptions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.profile_type = 'superadmin'
        )
    );

-- Los usuarios pueden ver solo sus propias suscripciones
CREATE POLICY "Users can view their own subscriptions" ON public.admin_subscriptions
    FOR SELECT USING (
        user_id = auth.uid() AND
        auth.role() = 'authenticated'
    );

-- Función para validar fechas de suscripción
CREATE OR REPLACE FUNCTION validate_subscription_dates()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar que end_date sea posterior a start_date
    IF NEW.end_date IS NOT NULL AND NEW.end_date <= NEW.start_date THEN
        RAISE EXCEPTION 'La fecha de fin debe ser posterior a la fecha de inicio';
    END IF;
    
    -- Validar que trial_end_date sea posterior a start_date
    IF NEW.trial_end_date IS NOT NULL AND NEW.trial_end_date <= NEW.start_date THEN
        RAISE EXCEPTION 'La fecha de fin del trial debe ser posterior a la fecha de inicio';
    END IF;
    
    -- Validar que el monto sea positivo
    IF NEW.amount <= 0 THEN
        RAISE EXCEPTION 'El monto debe ser mayor a cero';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para validar fechas
CREATE TRIGGER validate_admin_subscription_dates
    BEFORE INSERT OR UPDATE ON public.admin_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION validate_subscription_dates();

-- Función para actualizar el estado de suscripciones expiradas
CREATE OR REPLACE FUNCTION update_expired_subscriptions()
RETURNS void AS $$
BEGIN
    UPDATE public.admin_subscriptions 
    SET status = 'expired', updated_at = NOW()
    WHERE end_date < NOW() 
    AND status = 'active';
END;
$$ language 'plpgsql';

-- Comentarios para documentación
COMMENT ON TABLE public.admin_subscriptions IS 'Tabla para gestión completa de suscripciones por super administradores';
COMMENT ON COLUMN public.admin_subscriptions.status IS 'Estado de la suscripción: active, inactive, suspended, cancelled, expired, pending';
COMMENT ON COLUMN public.admin_subscriptions.billing_cycle IS 'Ciclo de facturación: monthly, yearly, quarterly, weekly, one-time';
COMMENT ON COLUMN public.admin_subscriptions.auto_renew IS 'Indica si la suscripción se renueva automáticamente';
COMMENT ON COLUMN public.admin_subscriptions.trial_end_date IS 'Fecha de fin del período de prueba si aplica';
COMMENT ON COLUMN public.admin_subscriptions.created_by IS 'ID del super admin que creó la suscripción';
COMMENT ON COLUMN public.admin_subscriptions.updated_by IS 'ID del super admin que actualizó la suscripción por última vez';