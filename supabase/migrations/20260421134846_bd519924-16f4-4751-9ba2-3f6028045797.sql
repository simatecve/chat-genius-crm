-- 1. Add columns to conversations
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS assigned_by uuid;

CREATE INDEX IF NOT EXISTS idx_conversations_user_assigned
  ON public.conversations(user_id, assigned_to);

-- 2. agent_presence table
CREATE TABLE IF NOT EXISTS public.agent_presence (
  user_id uuid PRIMARY KEY,
  account_owner_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'offline',
  manual_override text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_presence_owner_status
  ON public.agent_presence(account_owner_id, status);

ALTER TABLE public.agent_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own presence"
  ON public.agent_presence FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Account owner views account presence"
  ON public.agent_presence FOR SELECT
  USING (account_owner_id = public.get_account_owner_id(auth.uid()));

CREATE TRIGGER trg_agent_presence_updated
  BEFORE UPDATE ON public.agent_presence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. assignment_settings table
CREATE TABLE IF NOT EXISTS public.assignment_settings (
  account_owner_id uuid PRIMARY KEY,
  auto_assign_enabled boolean NOT NULL DEFAULT false,
  assign_strategy text NOT NULL DEFAULT 'manual',
  include_unassigned_for_all boolean NOT NULL DEFAULT true,
  last_assigned_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assignment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account owner manages assignment settings"
  ON public.assignment_settings FOR ALL
  USING (account_owner_id = public.get_account_owner_id(auth.uid()))
  WITH CHECK (account_owner_id = public.get_account_owner_id(auth.uid()));

CREATE TRIGGER trg_assignment_settings_updated
  BEFORE UPDATE ON public.assignment_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Auto-assign function
CREATE OR REPLACE FUNCTION public.auto_assign_conversation(p_conversation_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_settings record;
  v_chosen uuid;
  v_cutoff timestamptz := now() - interval '90 seconds';
BEGIN
  SELECT user_id INTO v_owner FROM public.conversations WHERE id = p_conversation_id;
  IF v_owner IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO v_settings FROM public.assignment_settings WHERE account_owner_id = v_owner;
  IF NOT FOUND OR NOT v_settings.auto_assign_enabled OR v_settings.assign_strategy = 'manual' THEN
    RETURN NULL;
  END IF;

  IF v_settings.assign_strategy = 'least_load' THEN
    SELECT ap.user_id INTO v_chosen
    FROM public.agent_presence ap
    LEFT JOIN public.conversations c
      ON c.assigned_to = ap.user_id
      AND c.user_id = v_owner
      AND c.status = 'active'
    WHERE ap.account_owner_id = v_owner
      AND ap.last_seen_at > v_cutoff
      AND COALESCE(ap.manual_override, ap.status) NOT IN ('busy', 'offline')
    GROUP BY ap.user_id, ap.last_seen_at
    ORDER BY COUNT(c.id) ASC, ap.last_seen_at ASC
    LIMIT 1;
  ELSE
    -- round_robin
    WITH active AS (
      SELECT user_id FROM public.agent_presence
      WHERE account_owner_id = v_owner
        AND last_seen_at > v_cutoff
        AND COALESCE(manual_override, status) NOT IN ('busy', 'offline')
      ORDER BY user_id
    ),
    indexed AS (
      SELECT user_id, ROW_NUMBER() OVER () AS rn, COUNT(*) OVER () AS total FROM active
    ),
    cursor_pos AS (
      SELECT COALESCE((SELECT rn FROM indexed WHERE user_id = v_settings.last_assigned_user_id), 0) AS pos,
             (SELECT total FROM indexed LIMIT 1) AS total
    )
    SELECT i.user_id INTO v_chosen
    FROM indexed i, cursor_pos cp
    WHERE i.rn = (cp.pos % NULLIF(cp.total, 0)) + 1;
  END IF;

  IF v_chosen IS NULL THEN RETURN NULL; END IF;

  UPDATE public.conversations
  SET assigned_to = v_chosen,
      assigned_at = now(),
      assigned_by = NULL
  WHERE id = p_conversation_id;

  UPDATE public.assignment_settings
  SET last_assigned_user_id = v_chosen
  WHERE account_owner_id = v_owner;

  RETURN v_chosen;
END;
$$;

-- 5. Trigger on conversations insert
CREATE OR REPLACE FUNCTION public.on_conversation_insert_assign()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assigned_to IS NULL THEN
    PERFORM public.auto_assign_conversation(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_conversation_auto_assign ON public.conversations;
CREATE TRIGGER trg_conversation_auto_assign
  AFTER INSERT ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.on_conversation_insert_assign();