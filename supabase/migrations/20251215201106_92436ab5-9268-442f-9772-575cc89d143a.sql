-- Delete all messages first (due to foreign key constraint)
DELETE FROM messages;

-- Delete all conversations
DELETE FROM conversations;