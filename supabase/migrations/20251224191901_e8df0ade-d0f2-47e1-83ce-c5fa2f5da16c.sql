-- Crear tabla de configuración de humanización de IA
CREATE TABLE IF NOT EXISTS public.ia_humanization_settings (
    id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    
    -- Configuración de delays
    min_response_delay_ms integer NOT NULL DEFAULT 2000,
    max_response_delay_ms integer NOT NULL DEFAULT 6000,
    
    -- Simulación humana
    enable_typing_indicator boolean NOT NULL DEFAULT true,
    enable_response_variation boolean NOT NULL DEFAULT true,
    
    -- Control de emojis
    emoji_frequency integer NOT NULL DEFAULT 50 CHECK (emoji_frequency >= 0 AND emoji_frequency <= 100),
    
    -- Mensajes múltiples
    combine_multiple_messages boolean NOT NULL DEFAULT true,
    delay_between_messages_ms integer NOT NULL DEFAULT 1500,
    
    -- Temperatura del modelo (más alto = más variado)
    ai_temperature numeric(3,2) NOT NULL DEFAULT 0.75 CHECK (ai_temperature >= 0 AND ai_temperature <= 1),
    
    -- Rate limiting
    max_responses_per_minute integer NOT NULL DEFAULT 10,
    
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.ia_humanization_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso
CREATE POLICY "Anyone can read humanization settings"
ON public.ia_humanization_settings FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can update humanization settings"
ON public.ia_humanization_settings FOR UPDATE
USING (id = 1 AND auth.uid() IS NOT NULL)
WITH CHECK (id = 1 AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert humanization settings"
ON public.ia_humanization_settings FOR INSERT
WITH CHECK (id = 1 AND auth.uid() IS NOT NULL);

-- Insertar configuración por defecto
INSERT INTO public.ia_humanization_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_ia_humanization_settings_updated_at
BEFORE UPDATE ON public.ia_humanization_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();