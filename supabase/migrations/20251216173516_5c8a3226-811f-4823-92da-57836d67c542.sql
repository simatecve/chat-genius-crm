-- Add trigger_type column to automated_message_logs
ALTER TABLE automated_message_logs 
ADD COLUMN IF NOT EXISTS trigger_type TEXT DEFAULT 'campaign';

-- Add index for faster queries on trigger_type
CREATE INDEX IF NOT EXISTS idx_automated_message_logs_trigger_type 
ON automated_message_logs(trigger_type);

-- Add compound index for payment reminder queries
CREATE INDEX IF NOT EXISTS idx_automated_message_logs_payment_reminder 
ON automated_message_logs(phone_number, user_id, status, trigger_type);
