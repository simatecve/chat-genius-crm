-- Migration: Backfill webchat conversations with leads for funnel integration
-- This creates leads for existing webchat conversations that don't have one

-- Step 1: Ensure webchat workspaces exist for users with webchat conversations
INSERT INTO workspaces (user_id, name, channel_type)
SELECT DISTINCT c.user_id, 'Web Chat', 'webchat'
FROM conversations c
WHERE c.channel_type = 'webchat'
  AND NOT EXISTS (
    SELECT 1 FROM workspaces w 
    WHERE w.user_id = c.user_id 
      AND w.channel_type IN ('webchat', 'all')
  )
ON CONFLICT DO NOTHING;

-- Step 2: Ensure default columns exist for webchat workspaces
INSERT INTO lead_columns (user_id, workspace_id, name, position, is_default, color)
SELECT 
  w.user_id,
  w.id as workspace_id,
  'Nuevos' as name,
  0 as position,
  true as is_default,
  '#3B82F6' as color
FROM workspaces w
WHERE w.channel_type = 'webchat'
  AND NOT EXISTS (
    SELECT 1 FROM lead_columns lc 
    WHERE lc.workspace_id = w.id
  )
ON CONFLICT DO NOTHING;

-- Step 3: Create leads for webchat conversations without leads
-- This uses a DO block to handle the logic properly
DO $$
DECLARE
  conv RECORD;
  col_id UUID;
  new_lead_id UUID;
  max_pos INTEGER;
BEGIN
  -- Loop through webchat conversations without leads
  FOR conv IN 
    SELECT c.id, c.user_id, c.contact_name, c.phone_number, c.last_inbound_message_time, c.pushname
    FROM conversations c
    WHERE c.channel_type = 'webchat' 
      AND c.lead_id IS NULL
  LOOP
    -- Find the default column for this user's webchat workspace
    SELECT lc.id INTO col_id
    FROM lead_columns lc
    JOIN workspaces w ON w.id = lc.workspace_id
    WHERE w.user_id = conv.user_id
      AND w.channel_type = 'webchat'
      AND lc.is_default = true
    LIMIT 1;
    
    -- If no webchat column, try 'all' type workspace
    IF col_id IS NULL THEN
      SELECT lc.id INTO col_id
      FROM lead_columns lc
      JOIN workspaces w ON w.id = lc.workspace_id
      WHERE w.user_id = conv.user_id
        AND w.channel_type = 'all'
        AND lc.is_default = true
      LIMIT 1;
    END IF;
    
    -- If still no column, try any default column for the user
    IF col_id IS NULL THEN
      SELECT lc.id INTO col_id
      FROM lead_columns lc
      WHERE lc.user_id = conv.user_id
        AND lc.is_default = true
      LIMIT 1;
    END IF;
    
    -- Only proceed if we found a column
    IF col_id IS NOT NULL THEN
      -- Get max position in column
      SELECT COALESCE(MAX(position), -1) INTO max_pos
      FROM leads
      WHERE column_id = col_id;
      
      -- Create the lead
      INSERT INTO leads (user_id, column_id, name, phone, position, bot_active, last_inbound_message_time)
      VALUES (
        conv.user_id,
        col_id,
        COALESCE(conv.contact_name, conv.pushname, 'Visitante Web'),
        conv.phone_number,
        max_pos + 1,
        true,
        COALESCE(conv.last_inbound_message_time, NOW())
      )
      RETURNING id INTO new_lead_id;
      
      -- Link conversation to lead
      UPDATE conversations
      SET lead_id = new_lead_id
      WHERE id = conv.id;
      
      RAISE NOTICE 'Created lead % for conversation %', new_lead_id, conv.id;
    ELSE
      RAISE NOTICE 'No column found for user %, skipping conversation %', conv.user_id, conv.id;
    END IF;
  END LOOP;
END $$;

-- Step 4: Update web_chatbots with workspace_id and default_column_id where missing
UPDATE web_chatbots wc
SET 
  workspace_id = (
    SELECT w.id FROM workspaces w 
    WHERE w.user_id = wc.user_id 
      AND w.channel_type = 'webchat'
    LIMIT 1
  ),
  default_column_id = (
    SELECT lc.id FROM lead_columns lc 
    JOIN workspaces w ON w.id = lc.workspace_id
    WHERE w.user_id = wc.user_id 
      AND w.channel_type = 'webchat'
      AND lc.is_default = true
    LIMIT 1
  )
WHERE wc.workspace_id IS NULL OR wc.default_column_id IS NULL;