-- Add workspace_id column to whatsapp_connections table
ALTER TABLE public.whatsapp_connections 
ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- Create an index for better query performance
CREATE INDEX idx_whatsapp_connections_workspace_id ON public.whatsapp_connections(workspace_id);