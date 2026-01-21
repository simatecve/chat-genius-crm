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

export interface SessionCounts {
  whatsapp: number;
  twilio: number;
  telegram: number;
  webchat: number;
}

// Get all session counts for all channel types (for badges)
export const getAllSessionCounts = async (userId: string): Promise<SessionCounts> => {
  const [whatsappResult, twilioResult, telegramResult, webchatResult] = await Promise.all([
    // WhatsApp WAHA connections count
    supabase
      .from('whatsapp_connections')
      .select('id', { count: 'exact', head: true }),
    
    // Twilio connections count
    supabase
      .from('twilio_connections')
      .select('id', { count: 'exact', head: true }),
    
    // Telegram bots count
    supabase
      .from('telegram_bots')
      .select('id', { count: 'exact', head: true }),
    
    // Web chatbots count
    supabase
      .from('web_chatbots')
      .select('id', { count: 'exact', head: true })
  ]);

  return {
    whatsapp: whatsappResult.count || 0,
    twilio: twilioResult.count || 0,
    telegram: telegramResult.count || 0,
    webchat: webchatResult.count || 0
  };
};

// Helper function to get conversation IDs for a session
const getConversationIdsForSession = async (
  sessionId: string,
  channelType: ChannelType
): Promise<string[]> => {
  if (channelType === 'whatsapp') {
    // Get phone number from connection
    const { data: waConn } = await supabase
      .from('whatsapp_connections')
      .select('phone_number')
      .eq('id', sessionId)
      .single();
    
    if (waConn?.phone_number) {
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('whatsapp_number', waConn.phone_number)
        .eq('channel_type', 'whatsapp');

      return conversations?.map(c => c.id) || [];
    }
    return [];
  }

  if (channelType === 'webchat') {
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .eq('channel_type', 'webchat');
    
    return conversations?.map(c => c.id) || [];
  }

  // Twilio and Telegram
  let conversationFilter: Record<string, string> = {};

  switch (channelType) {
    case 'twilio':
      conversationFilter = { twilio_connection_id: sessionId };
      break;
    case 'telegram':
      conversationFilter = { telegram_bot_id: sessionId };
      break;
  }

  const { data: conversations } = await supabase
    .from('conversations')
    .select('id')
    .match(conversationFilter);

  return conversations?.map(c => c.id) || [];
};

// Get ALL conversation IDs for a channel type (aggregate)
const getConversationIdsByChannelType = async (
  channelType: ChannelType
): Promise<string[]> => {
  let conversations;

  switch (channelType) {
    case 'whatsapp':
      conversations = await supabase
        .from('conversations')
        .select('id')
        .eq('channel_type', 'whatsapp');
      break;
    case 'twilio':
      conversations = await supabase
        .from('conversations')
        .select('id')
        .not('twilio_connection_id', 'is', null);
      break;
    case 'telegram':
      conversations = await supabase
        .from('conversations')
        .select('id')
        .not('telegram_bot_id', 'is', null);
      break;
    case 'webchat':
      conversations = await supabase
        .from('conversations')
        .select('id')
        .eq('channel_type', 'webchat');
      break;
  }

  return conversations?.data?.map(c => c.id) || [];
};

// Get sessions by channel type
export const getSessionsByChannelType = async (
  userId: string,
  channelType: ChannelType
): Promise<SessionInfo[]> => {
  switch (channelType) {
    case 'whatsapp': {
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .select('id, name, phone_number, status')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(conn => ({
        id: conn.id,
        name: conn.name || `WhatsApp ${conn.phone_number || ''}`,
        phoneNumber: conn.phone_number || undefined,
        status: conn.status || 'active',
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
        .from('web_chatbots')
        .select('id, name, is_active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(chatbot => ({
        id: chatbot.id,
        name: chatbot.name,
        status: chatbot.is_active ? 'active' : 'inactive',
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

  let conversationIds: string[] = [];

  // For WhatsApp, we need to get the phone number from the connection first
  if (channelType === 'whatsapp') {
    const { data: waConn } = await supabase
      .from('whatsapp_connections')
      .select('phone_number')
      .eq('id', sessionId)
      .single();
    
    if (waConn?.phone_number) {
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .eq('whatsapp_number', waConn.phone_number)
        .eq('channel_type', 'whatsapp');

      if (convError) throw convError;
      conversationIds = conversations?.map(c => c.id) || [];
    }
  } else if (channelType === 'webchat') {
    // Webchat - get conversations for this web chatbot
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('channel_type', 'webchat');
    
    if (convError) throw convError;
    conversationIds = conversations?.map(c => c.id) || [];
  } else {
    // Twilio and Telegram
    let conversationFilter: Record<string, string> = {};

    switch (channelType) {
      case 'twilio':
        conversationFilter = { twilio_connection_id: sessionId };
        break;
      case 'telegram':
        conversationFilter = { telegram_bot_id: sessionId };
        break;
    }

    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .match(conversationFilter);

    if (convError) throw convError;
    conversationIds = conversations?.map(c => c.id) || [];
  }

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

  const conversationIds = await getConversationIdsForSession(sessionId, channelType);

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

  const conversationIds = await getConversationIdsForSession(sessionId, channelType);

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

// =====================
// CHANNEL-LEVEL STATS (Aggregate all sessions)
// =====================

// Get stats for ALL sessions of a channel type
export const getChannelTypeStats = async (
  userId: string,
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

  const conversationIds = await getConversationIdsByChannelType(channelType);

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

// Get messages by date for ALL sessions of a channel type
export const getMessagesByDateForChannel = async (
  userId: string,
  channelType: ChannelType,
  dateRange: DateRange
): Promise<DailyMessageStats[]> => {
  const startDate = dateRange.startDate.toISOString();
  const endDate = dateRange.endDate.toISOString();

  const conversationIds = await getConversationIdsByChannelType(channelType);

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

// Get hourly stats for ALL sessions of a channel type
export const getHourlyStatsForChannel = async (
  userId: string,
  channelType: ChannelType,
  dateRange: DateRange
): Promise<HourlyStats[]> => {
  const startDate = dateRange.startDate.toISOString();
  const endDate = dateRange.endDate.toISOString();

  const conversationIds = await getConversationIdsByChannelType(channelType);

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
