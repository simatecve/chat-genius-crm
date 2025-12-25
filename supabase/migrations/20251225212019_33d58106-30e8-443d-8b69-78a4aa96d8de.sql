-- Actualizar espacios de trabajo PUBLI PRINCIPAL y PUBLI META NUEVA a twilio
UPDATE workspaces 
SET channel_type = 'twilio' 
WHERE id IN ('47c18cbb-0cac-4c6c-a278-cc390cf3a69f', '7c56199d-c9e1-4199-a55c-7bf34a0a28eb');