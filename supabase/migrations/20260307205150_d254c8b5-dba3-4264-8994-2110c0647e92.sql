
-- RPC: get_messages_by_hour - agrupa mensajes por hora server-side
CREATE OR REPLACE FUNCTION public.get_messages_by_hour(
  p_user_id uuid,
  p_start_date timestamptz
)
RETURNS TABLE(hour integer, incoming bigint, outgoing bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    EXTRACT(HOUR FROM created_at)::integer AS hour,
    COUNT(*) FILTER (WHERE direction IN ('incoming', 'inbound')) AS incoming,
    COUNT(*) FILTER (WHERE direction IN ('outgoing', 'outbound')) AS outgoing
  FROM messages
  WHERE user_id = p_user_id
    AND created_at >= p_start_date
  GROUP BY EXTRACT(HOUR FROM created_at)
  ORDER BY hour;
$$;

-- RPC: get_conversion_rate - calcula tasa de conversión server-side
CREATE OR REPLACE FUNCTION public.get_conversion_rate(p_user_id uuid)
RETURNS TABLE(total_leads bigint, qualified_leads bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COUNT(*)::bigint AS total_leads,
    COUNT(*) FILTER (
      WHERE lc.name ILIKE '%calificado%' 
         OR lc.name ILIKE '%ganado%' 
         OR lc.name ILIKE '%cerrado%'
    )::bigint AS qualified_leads
  FROM leads l
  JOIN lead_columns lc ON l.column_id = lc.id
  WHERE l.user_id = p_user_id;
$$;

-- RPC: get_conversations_by_hour - agrupa conversaciones por hora server-side
CREATE OR REPLACE FUNCTION public.get_conversations_by_hour(
  p_user_id uuid,
  p_start_date timestamptz
)
RETURNS TABLE(hour integer, new_count bigint, recurring_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    EXTRACT(HOUR FROM created_at)::integer AS hour,
    COUNT(*) FILTER (WHERE created_at > (NOW() - INTERVAL '30 days')) AS new_count,
    COUNT(*) FILTER (WHERE created_at <= (NOW() - INTERVAL '30 days')) AS recurring_count
  FROM conversations
  WHERE user_id = p_user_id
    AND created_at >= p_start_date
  GROUP BY EXTRACT(HOUR FROM created_at)
  ORDER BY hour;
$$;

-- RPC: get_messages_heatmap - agrupa mensajes por día y hora server-side
CREATE OR REPLACE FUNCTION public.get_messages_heatmap(
  p_user_id uuid,
  p_start_date timestamptz
)
RETURNS TABLE(day_of_week integer, hour integer, msg_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    EXTRACT(DOW FROM created_at)::integer AS day_of_week,
    EXTRACT(HOUR FROM created_at)::integer AS hour,
    COUNT(*)::bigint AS msg_count
  FROM messages
  WHERE user_id = p_user_id
    AND created_at >= p_start_date
  GROUP BY EXTRACT(DOW FROM created_at), EXTRACT(HOUR FROM created_at)
  ORDER BY day_of_week, hour;
$$;
