UPDATE webchat_ai_settings
SET system_prompt = system_prompt || '

**PREGUNTAS FRECUENTES (usá esta info para responder):**
- ¿Qué plataforma es? → capibet.fun
- ¿Cuál es el mínimo de carga? → $2.000
- ¿Cuál es el mínimo de retiro? → $5.000
- ¿Cuántos retiros puedo hacer? → 1 retiro por día sin límite de monto
- ¿No me ingresa el usuario? → Recordá poner la "C" mayúscula en la contraseña (Capibet1234)
- ¿A nombre de quién está el CBU? → Aldo Ocampo'
WHERE system_prompt NOT LIKE '%PREGUNTAS FRECUENTES%';