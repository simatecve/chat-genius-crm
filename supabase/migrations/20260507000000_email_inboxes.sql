-- Create email inboxes table
CREATE TABLE IF NOT EXISTS public.email_inboxes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email_address TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.email_inboxes ENABLE ROW LEVEL SECURITY;

-- Create policies for email inboxes
CREATE POLICY "Users can view their own email inboxes" 
ON public.email_inboxes FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email inboxes" 
ON public.email_inboxes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email inboxes" 
ON public.email_inboxes FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email inboxes" 
ON public.email_inboxes FOR DELETE 
USING (auth.uid() = user_id);


-- Create email messages table
CREATE TABLE IF NOT EXISTS public.email_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    inbox_id UUID REFERENCES public.email_inboxes(id) ON DELETE CASCADE,
    from_email TEXT,
    to_email TEXT,
    subject TEXT,
    body_text TEXT,
    body_html TEXT,
    direction TEXT CHECK (direction IN ('inbound', 'outbound')),
    is_read BOOLEAN DEFAULT false,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for email messages
CREATE POLICY "Users can view messages for their inboxes" 
ON public.email_messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.email_inboxes 
        WHERE email_inboxes.id = email_messages.inbox_id 
        AND email_inboxes.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update messages for their inboxes (e.g. mark as read)" 
ON public.email_messages FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.email_inboxes 
        WHERE email_inboxes.id = email_messages.inbox_id 
        AND email_inboxes.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert messages (for outgoing)" 
ON public.email_messages FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.email_inboxes 
        WHERE email_inboxes.id = email_messages.inbox_id 
        AND email_inboxes.user_id = auth.uid()
    )
);
