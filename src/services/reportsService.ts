import { supabase } from '@/integrations/supabase/client';

export type ChannelType = 'whatsapp' | 'twilio' | 'telegram' | 'webchat';

export interface SessionInfo {
  id: string;
  name: string;
  phoneNumber?: string;
  status: string;
  channelType: ChannelType;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface SessionStats {
  totalSent: number;
  totalReceived: number;
  totalConversations: number;
  lastMessageAt: string | null;
  sentChange: number;
  receivedChange: number;
}

export interface DailyMessageStats {
  date: string;
  sent: number;
  received: number;
  total: number;
}

export interface HourlyStats {
  hour: number;
  sent: number;
  received: number;
}

// Get sessions by channel type
export const getSessionsByChannelType = async (
  userId: string,
  channelType: ChannelType
): Promise<SessionInfo[]> => {
  switch (channelType) {
    case 'whatsapp': {
      const { data, error } = await supabase
        .from('conversations')
        .select('whatsapp_number')
        .eq('channel_type', 'whatsapp')
        .not('whatsapp_number', 'is', null)
        .order('last_message_time', { ascending: false });

      if (error) throw error;

      // Get unique whatsapp numbers
      const uniqueNumbers = [...new Set(data?.map(c => c.whatsapp_number).filter(Boolean))];
      return uniqueNumbers.map(num => ({
        id: num as string,
        name: `WhatsApp ${num}`,
        phoneNumber: num as string,
        status: 'active',
        channelType: 'whatsapp'
      }));
    }
    case 'twilio': {
      const { data, error } = await supabase
        .from('twilio_connections')
        .select('id, connection_name, phone_number, status')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(conn => ({
        id: conn.id,
        name: conn.connection_name,
        phoneNumber: conn.phone_number,
        status: conn.status || 'active',
        channelType: 'twilio'
      }));
    }
    case 'telegram': {
      const { data, error } = await supabase
        .from('telegram_bots')
        .select('id, bot_name, bot_username, status')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(bot => ({
        id: bot.id,
        name: bot.bot_name,
        phoneNumber: bot.bot_username || undefined,
        status: bot.status || 'active',
        channelType: 'telegram'
      }));
    }
    case 'webchat': {
      const { data, error } = await supabase
        .from('landing_chat_conversations')
        .select('id, visitor_name, status')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // For webchat, we group by unique conversation
      return (data || []).map(conv => ({
        id: conv.id,
        name: conv.visitor_name || 'Visitante',
        status: conv.status || 'active',
        channelType: 'webchat'
      }));
    }
    default:
      return [];
  }
};

// Get message stats for a session
export const getSessionStats = async (
  userId: string,
  sessionId: string,
  channelType: ChannelType,
  dateRange: DateRange
): Promise<SessionStats> => {
  const startDate = dateRange.startDate.toISOString();
  const endDate = dateRange.endDate.toISOString();

  // Calculate previous period for comparison
  const daysDiff = Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24));
  const prevStartDate = new Date(dateRange.startDate);
  prevStartDate.setDate(prevStartDate.getDate() - daysDiff);
  const prevEndDate = new Date(dateRange.startDate);

  let conversationFilter: Record<string, string> = {};

  switch (channelType) {
    case 'whatsapp':
      conversationFilter = { whatsapp_number: sessionId };
      break;
    case 'twilio':
      conversationFilter = { twilio_connection_id: sessionId };
      break;
    case 'telegram':
      conversationFilter = { telegram_bot_id: sessionId };
      break;
  }

  if (channelType === 'webchat') {
    // Webchat uses separate tables
    const { data: messages, error } = await supabase
      .from('landing_chat_messages')
      .select('direction, created_at')
      .eq('conversation_id', sessionId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) throw error;

    const sent = messages?.filter(m => m.direction === 'outbound').length || 0;
    const received = messages?.filter(m => m.direction === 'inbound').length || 0;
    const lastMessage = messages?.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];

    return {
      totalSent: sent,
      totalReceived: received,
      totalConversations: 1,
      lastMessageAt: lastMessage?.created_at || null,
      sentChange: 0,
      receivedChange: 0
    };
  }

  // Get conversations for this session
  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select('id')
    .match(conversationFilter);

  if (convError) throw convError;

  const conversationIds = conversations?.map(c => c.id) || [];

  if (conversationIds.length === 0) {
    return {
      totalSent: 0,
      totalReceived: 0,
      totalConversations: 0,
      lastMessageAt: null,
      sentChange: 0,
      receivedChange: 0
    };
  }

  // Get current period messages
  const { data: currentMessages, error: msgError } = await supabase
    .from('messages')
    .select('direction, created_at')
    .in('conversation_id', conversationIds)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (msgError) throw msgError;

  // Get previous period messages for comparison
  const { data: prevMessages } = await supabase
    .from('messages')
    .select('direction')
    .in('conversation_id', conversationIds)
    .gte('created_at', prevStartDate.toISOString())
    .lt('created_at', prevEndDate.toISOString());

  const currentSent = currentMessages?.filter(m => m.direction === 'outbound').length || 0;
  const currentReceived = currentMessages?.filter(m => m.direction === 'inbound').length || 0;
  const prevSent = prevMessages?.filter(m => m.direction === 'outbound').length || 0;
  const prevReceived = prevMessages?.filter(m => m.direction === 'inbound').length || 0;

  const lastMessage = currentMessages?.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0];

  // Calculate percentage change
  const sentChange = prevSent > 0 ? Math.round(((currentSent - prevSent) / prevSent) * 100) : 0;
  const receivedChange = prevReceived > 0 ? Math.round(((currentReceived - prevReceived) / prevReceived) * 100) : 0;

  return {
    totalSent: currentSent,
    totalReceived: currentReceived,
    totalConversations: conversationIds.length,
    lastMessageAt: lastMessage?.created_at || null,
    sentChange,
    receivedChange
  };
};

// Get messages grouped by day
export const getMessagesByDate = async (
  userId: string,
  sessionId: string,
  channelType: ChannelType,
  dateRange: DateRange
): Promise<DailyMessageStats[]> => {
  const startDate = dateRange.startDate.toISOString();
  const endDate = dateRange.endDate.toISOString();

  let conversationFilter: Record<string, string> = {};

  switch (channelType) {
    case 'whatsapp':
      conversationFilter = { whatsapp_number: sessionId };
      break;
    case 'twilio':
      conversationFilter = { twilio_connection_id: sessionId };
      break;
    case 'telegram':
      conversationFilter = { telegram_bot_id: sessionId };
      break;
  }

  if (channelType === 'webchat') {
    const { data: messages, error } = await supabase
      .from('landing_chat_messages')
      .select('direction, created_at')
      .eq('conversation_id', sessionId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return aggregateMessagesByDate(messages || []);
  }

  // Get conversations for this session
  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select('id')
    .match(conversationFilter);

  if (convError) throw convError;

  const conversationIds = conversations?.map(c => c.id) || [];

  if (conversationIds.length === 0) {
    return [];
  }

  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('direction, created_at')
    .in('conversation_id', conversationIds)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: true });

  if (msgError) throw msgError;

  return aggregateMessagesByDate(messages || []);
};

// Get hourly distribution
export const getHourlyStats = async (
  userId: string,
  sessionId: string,
  channelType: ChannelType,
  dateRange: DateRange
): Promise<HourlyStats[]> => {
  const startDate = dateRange.startDate.toISOString();
  const endDate = dateRange.endDate.toISOString();

  let conversationFilter: Record<string, string> = {};

  switch (channelType) {
    case 'whatsapp':
      conversationFilter = { whatsapp_number: sessionId };
      break;
    case 'twilio':
      conversationFilter = { twilio_connection_id: sessionId };
      break;
    case 'telegram':
      conversationFilter = { telegram_bot_id: sessionId };
      break;
  }

  if (channelType === 'webchat') {
    const { data: messages, error } = await supabase
      .from('landing_chat_messages')
      .select('direction, created_at')
      .eq('conversation_id', sessionId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) throw error;

    return aggregateMessagesByHour(messages || []);
  }

  // Get conversations for this session
  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select('id')
    .match(conversationFilter);

  if (convError) throw convError;

  const conversationIds = conversations?.map(c => c.id) || [];

  if (conversationIds.length === 0) {
    return [];
  }

  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('direction, created_at')
    .in('conversation_id', conversationIds)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (msgError) throw msgError;

  return aggregateMessagesByHour(messages || []);
};

// Helper function to aggregate messages by date
const aggregateMessagesByDate = (
  messages: { direction: string; created_at: string }[]
): DailyMessageStats[] => {
  const dateMap = new Map<string, { sent: number; received: number }>();

  messages.forEach(msg => {
    const date = new Date(msg.created_at).toISOString().split('T')[0];
    const current = dateMap.get(date) || { sent: 0, received: 0 };
    
    if (msg.direction === 'outbound') {
      current.sent++;
    } else {
      current.received++;
    }
    
    dateMap.set(date, current);
  });

  return Array.from(dateMap.entries())
    .map(([date, stats]) => ({
      date,
      sent: stats.sent,
      received: stats.received,
      total: stats.sent + stats.received
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

// Helper function to aggregate messages by hour
const aggregateMessagesByHour = (
  messages: { direction: string; created_at: string }[]
): HourlyStats[] => {
  const hourMap = new Map<number, { sent: number; received: number }>();

  // Initialize all hours
  for (let i = 0; i < 24; i++) {
    hourMap.set(i, { sent: 0, received: 0 });
  }

  messages.forEach(msg => {
    const hour = new Date(msg.created_at).getHours();
    const current = hourMap.get(hour)!;
    
    if (msg.direction === 'outbound') {
      current.sent++;
    } else {
      current.received++;
    }
  });

  return Array.from(hourMap.entries())
    .map(([hour, stats]) => ({
      hour,
      sent: stats.sent,
      received: stats.received
    }))
    .sort((a, b) => a.hour - b.hour);
};
