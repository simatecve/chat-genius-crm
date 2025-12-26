
-- Crear nuevo lead para la conversación de Twilio +18065471483
DO $$
DECLARE
  new_lead_id uuid;
BEGIN
  -- Insertar el nuevo lead
  INSERT INTO leads (user_id, column_id, name, phone, position, notes, bot_active)
  VALUES (
    'aceeab1a-ec2e-44c7-90c5-7382102955fd',
    'a73eba50-a7d0-4d3c-93be-c28f3d538f21',
    'Koonetxa',
    '593983859723',
    171,
    'Lead desde línea Twilio: twilio +18065471483',
    true
  )
  RETURNING id INTO new_lead_id;

  -- Actualizar la conversación para que apunte al nuevo lead
  UPDATE conversations 
  SET lead_id = new_lead_id
  WHERE id = 'd05fc405-5ac8-4465-9603-8e9cdbaa2294';

  RAISE NOTICE 'Nuevo lead creado: %', new_lead_id;
END $$;
