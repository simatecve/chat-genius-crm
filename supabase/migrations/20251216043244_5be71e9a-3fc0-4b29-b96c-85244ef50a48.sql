
-- Delete messages associated with WhatsApp group conversations
DELETE FROM messages 
WHERE conversation_id IN (
  SELECT id FROM conversations 
  WHERE phone_number LIKE '%@g.us%' 
  AND channel_type = 'whatsapp'
);

-- Delete leads associated with group conversations
DELETE FROM leads 
WHERE id IN (
  SELECT lead_id FROM conversations 
  WHERE phone_number LIKE '%@g.us%' 
  AND channel_type = 'whatsapp'
  AND lead_id IS NOT NULL
);

-- Delete the group conversations
DELETE FROM conversations 
WHERE phone_number LIKE '%@g.us%' 
AND channel_type = 'whatsapp';
