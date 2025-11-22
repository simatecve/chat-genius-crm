-- Create quick_replies table
CREATE TABLE public.quick_replies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  hotkey text,
  message text NOT NULL,
  attachment_urls text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own quick replies"
  ON public.quick_replies
  FOR ALL
  USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_quick_replies_user_id ON public.quick_replies(user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_quick_replies_updated_at
  BEFORE UPDATE ON public.quick_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();