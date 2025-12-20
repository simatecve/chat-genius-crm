
-- Limpieza de datos: eliminar conversaciones y mensajes de WhatsApp/Twilio, mantener WebChat

-- Paso 1: Eliminar mensajes de conversaciones que NO son webchat
DELETE FROM messages 
WHERE conversation_id IN (
  SELECT id FROM conversations 
  WHERE channel_type != 'webchat' OR channel_type IS NULL
);

-- Paso 2: Limpiar buffer de respuestas IA (relacionado con WhatsApp/Twilio)
DELETE FROM ai_response_buffer;

-- Paso 3: Eliminar conversaciones que NO son webchat
DELETE FROM conversations 
WHERE channel_type != 'webchat' OR channel_type IS NULL;
