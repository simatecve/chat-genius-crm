-- Fix foreign key constraints that block Twilio connection deletion

-- Drop existing constraints
ALTER TABLE ai_response_buffer 
DROP CONSTRAINT IF EXISTS ai_response_buffer_twilio_connection_id_fkey;

ALTER TABLE mass_campaigns 
DROP CONSTRAINT IF EXISTS mass_campaigns_twilio_connection_id_fkey;

-- Recreate with ON DELETE SET NULL to allow deletion
ALTER TABLE ai_response_buffer
ADD CONSTRAINT ai_response_buffer_twilio_connection_id_fkey 
FOREIGN KEY (twilio_connection_id) 
REFERENCES twilio_connections(id) 
ON DELETE SET NULL;

ALTER TABLE mass_campaigns
ADD CONSTRAINT mass_campaigns_twilio_connection_id_fkey 
FOREIGN KEY (twilio_connection_id) 
REFERENCES twilio_connections(id) 
ON DELETE SET NULL;