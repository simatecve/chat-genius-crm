-- Add webchat tracking columns to conversations table
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS casino_username text;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS payment_receipt_sent boolean DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS payment_receipt_detected_at timestamp with time zone;

-- Add index for webchat stats queries
CREATE INDEX IF NOT EXISTS idx_conversations_webchat_stats 
ON conversations (channel_type, casino_user_created, payment_receipt_sent) 
WHERE channel_type = 'webchat';