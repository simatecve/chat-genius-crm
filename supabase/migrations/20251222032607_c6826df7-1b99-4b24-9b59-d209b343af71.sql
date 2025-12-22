-- Crear índice compuesto para ordenamiento eficiente de leads
CREATE INDEX IF NOT EXISTS idx_leads_column_position 
ON public.leads(column_id, position);

-- Índice adicional para búsqueda por teléfono en leads
CREATE INDEX IF NOT EXISTS idx_leads_phone_lookup 
ON public.leads(phone);