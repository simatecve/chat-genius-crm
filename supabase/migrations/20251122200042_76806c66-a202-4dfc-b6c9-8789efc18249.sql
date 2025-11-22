-- Crear tabla de información adicional de contactos en conversaciones
CREATE TABLE IF NOT EXISTS public.contact_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Información personal
  gender TEXT CHECK (gender IN ('Masculino', 'Femenino', 'Otro', NULL)),
  origin TEXT,
  birth_date DATE,
  
  -- Información de negocio
  agent_id UUID,
  funnel_stage TEXT,
  
  -- Notas
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(conversation_id)
);

-- Crear tabla de ventas asociadas a contactos
CREATE TABLE IF NOT EXISTS public.contact_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_detail_id UUID REFERENCES public.contact_details(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  description TEXT,
  sale_date TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.contact_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_sales ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para contact_details
CREATE POLICY "Users can manage their own contact details"
  ON public.contact_details
  FOR ALL
  USING (auth.uid() = user_id);

-- Políticas RLS para contact_sales
CREATE POLICY "Users can manage their own contact sales"
  ON public.contact_sales
  FOR ALL
  USING (auth.uid() = user_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_contact_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contact_details_updated_at
  BEFORE UPDATE ON public.contact_details
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_details_updated_at();

CREATE TRIGGER contact_sales_updated_at
  BEFORE UPDATE ON public.contact_sales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();