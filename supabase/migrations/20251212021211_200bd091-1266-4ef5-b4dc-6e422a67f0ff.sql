-- Add widget_type, width, and height columns to web_chatbots
ALTER TABLE public.web_chatbots 
ADD COLUMN IF NOT EXISTS widget_type text DEFAULT 'floating',
ADD COLUMN IF NOT EXISTS width text DEFAULT '400px',
ADD COLUMN IF NOT EXISTS height text DEFAULT '600px';