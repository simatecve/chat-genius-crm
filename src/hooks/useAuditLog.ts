import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCallback } from 'react';

type ActionType = 
  | 'message_sent'
  | 'message_deleted'
  | 'login'
  | 'logout'
  | 'config_changed'
  | 'ai_agent_created'
  | 'ai_agent_updated'
  | 'ai_agent_deleted'
  | 'campaign_sent'
  | 'lead_created'
  | 'lead_moved'
  | 'lead_deleted'
  | 'contact_created'
  | 'contact_updated'
  | 'contact_deleted'
  | 'whatsapp_connected'
  | 'whatsapp_disconnected'
  | 'user_created'
  | 'user_deleted'
  | 'settings_updated';

type EntityType = 
  | 'message'
  | 'conversation'
  | 'lead'
  | 'contact'
  | 'ai_agent'
  | 'campaign'
  | 'whatsapp_connection'
  | 'telegram_bot'
  | 'twilio_connection'
  | 'user'
  | 'settings';

interface AuditLogEntry {
  action_type: ActionType;
  entity_type?: EntityType;
  entity_id?: string;
  details?: Record<string, unknown>;
}

export const useAuditLog = () => {
  const { user } = useAuth();

  const logAction = useCallback(async (
    actionType: ActionType,
    entityType?: EntityType,
    entityId?: string,
    details?: Record<string, unknown>
  ) => {
    if (!user?.id) {
      console.warn('[AuditLog] No user logged in, skipping audit log');
      return;
    }

    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action_type: actionType,
          entity_type: entityType,
          entity_id: entityId,
          details: details as any,
          user_agent: navigator.userAgent
        });

      if (error) {
        console.error('[AuditLog] Error logging action:', error);
      } else {
        console.log('[AuditLog] Action logged:', actionType, entityType, entityId);
      }
    } catch (err) {
      console.error('[AuditLog] Exception logging action:', err);
    }
  }, [user?.id]);

  const logBatch = useCallback(async (entries: AuditLogEntry[]) => {
    if (!user?.id) {
      console.warn('[AuditLog] No user logged in, skipping audit log');
      return;
    }

    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert(
          entries.map(entry => ({
            user_id: user.id,
            action_type: entry.action_type,
            entity_type: entry.entity_type,
            entity_id: entry.entity_id,
            details: entry.details as any,
            user_agent: navigator.userAgent
          }))
        );

      if (error) {
        console.error('[AuditLog] Error logging batch actions:', error);
      }
    } catch (err) {
      console.error('[AuditLog] Exception logging batch actions:', err);
    }
  }, [user?.id]);

  return { logAction, logBatch };
};

// Standalone function for use outside React components
export const logAuditAction = async (
  userId: string,
  actionType: ActionType,
  entityType?: EntityType,
  entityId?: string,
  details?: Record<string, unknown>
) => {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId,
        details: details as any,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server'
      });

    if (error) {
      console.error('[AuditLog] Error logging action:', error);
    }
  } catch (err) {
    console.error('[AuditLog] Exception logging action:', err);
  }
};
