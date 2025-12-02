-- Add column for storing MIME types of attachments
ALTER TABLE mass_campaigns 
ADD COLUMN IF NOT EXISTS attachment_mime_types text[];