-- Delete all web chat messages first (due to foreign key)
DELETE FROM messages WHERE conversation_id IN (
  SELECT id FROM conversations WHERE channel_type = 'webchat'
);

-- Delete all web chat conversations
DELETE FROM conversations WHERE channel_type = 'webchat';