-- Actualizar todos los agentes de IA que tengan modelos inválidos o nulos
-- para usar google/gemini-2.5-flash como modelo por defecto

UPDATE ai_agents 
SET model = 'google/gemini-2.5-flash'
WHERE model IS NULL 
   OR model NOT IN (
      'google/gemini-2.5-flash',
      'google/gemini-2.5-pro',
      'google/gemini-3-pro-preview',
      'google/gemini-2.5-flash-lite',
      'google/gemini-2.5-flash-image',
      'google/gemini-3-pro-image-preview',
      'openai/gpt-5',
      'openai/gpt-5-mini',
      'openai/gpt-5-nano'
   );