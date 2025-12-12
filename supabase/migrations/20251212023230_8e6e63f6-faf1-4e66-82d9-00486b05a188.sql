-- Add web_chatbot_id to ai_agents for webchat channel support
ALTER TABLE public.ai_agents 
ADD COLUMN IF NOT EXISTS web_chatbot_id uuid REFERENCES public.web_chatbots(id);

-- Add background_image_url to web_chatbots for widget customization
ALTER TABLE public.web_chatbots 
ADD COLUMN IF NOT EXISTS background_image_url text;