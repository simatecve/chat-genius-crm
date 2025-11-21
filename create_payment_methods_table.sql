-- Crear tabla payment_methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(100) NOT NULL,
  api_key TEXT,
  secret_key TEXT,
  webhook_url TEXT,
  supported_currencies TEXT[] DEFAULT ARRAY['USD'],
  configuration JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_methods_provider_unique ON payment_methods(provider);
CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON payment_methods(is_active);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payment_methods_updated_at
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Política para superadmins (pueden ver y modificar todo)
CREATE POLICY "Superadmins can manage payment methods" ON payment_methods
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'superadmin'
    )
  );

-- Política para usuarios normales (solo pueden ver métodos activos)
CREATE POLICY "Users can view active payment methods" ON payment_methods
  FOR SELECT USING (is_active = true);

-- Insertar métodos de pago por defecto
INSERT INTO payment_methods (name, provider, api_key, secret_key, supported_currencies, configuration, is_active)
VALUES 
  (
    'Stripe',
    'stripe',
    '', -- Dejar vacío para que el admin configure
    '', -- Dejar vacío para que el admin configure
    ARRAY['USD', 'EUR', 'ARS'],
    '{
      "webhook_secret": "",
      "environment": "test",
      "description": "Procesador de pagos internacional con soporte para múltiples monedas"
    }'::jsonb,
    false
  ),
  (
    'Mercado Pago Argentina',
    'mercadopago',
    '', -- Dejar vacío para que el admin configure
    '', -- Dejar vacío para que el admin configure
    ARRAY['ARS', 'USD'],
    '{
      "webhook_secret": "",
      "environment": "sandbox",
      "country": "AR",
      "description": "Procesador de pagos líder en Argentina y América Latina"
    }'::jsonb,
    false
  )
ON CONFLICT DO NOTHING;

-- Comentarios para documentación
COMMENT ON TABLE payment_methods IS 'Tabla para almacenar configuraciones de métodos de pago';
COMMENT ON COLUMN payment_methods.api_key IS 'Clave pública o API key del proveedor';
COMMENT ON COLUMN payment_methods.secret_key IS 'Clave secreta del proveedor';
COMMENT ON COLUMN payment_methods.configuration IS 'Configuración adicional específica del proveedor en formato JSON';
COMMENT ON COLUMN payment_methods.supported_currencies IS 'Array de códigos de moneda soportados (ISO 4217)';