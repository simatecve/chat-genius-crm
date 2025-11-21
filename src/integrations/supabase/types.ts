export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      admin_subscriptions: {
        Row: {
          amount: number
          auto_renew: boolean | null
          billing_cycle: string
          created_at: string
          created_by: string | null
          currency: string
          end_date: string | null
          id: string
          notes: string | null
          payment_method_id: string | null
          plan_id: string
          start_date: string
          status: string
          trial_end_date: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          amount: number
          auto_renew?: boolean | null
          billing_cycle?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          payment_method_id?: string | null
          plan_id: string
          start_date?: string
          status?: string
          trial_end_date?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          auto_renew?: boolean | null
          billing_cycle?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          payment_method_id?: string | null
          plan_id?: string
          start_date?: string
          status?: string
          trial_end_date?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_subscriptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_subscriptions_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_subscriptions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_api_keys: {
        Row: {
          api_key: string
          created_at: string
          id: string
          is_active: boolean
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          is_active?: boolean
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          is_active?: boolean
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_bots: {
        Row: {
          created_at: string
          id: string
          instructions: string
          is_active: boolean
          message_delay: number
          name: string
          updated_at: string
          user_id: string
          whatsapp_connection_id: string | null
          whatsapp_connection_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          instructions: string
          is_active?: boolean
          message_delay?: number
          name: string
          updated_at?: string
          user_id: string
          whatsapp_connection_id?: string | null
          whatsapp_connection_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          instructions?: string
          is_active?: boolean
          message_delay?: number
          name?: string
          updated_at?: string
          user_id?: string
          whatsapp_connection_id?: string | null
          whatsapp_connection_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_bots_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      automated_message_logs: {
        Row: {
          error_message: string | null
          id: string
          instance_name: string | null
          last_retry_at: string | null
          lead_id: string
          message_content: string
          retry_count: number
          scheduled_for: string | null
          sent_at: string
          status: string
          trigger_id: string
          user_id: string
          whatsapp_number: string | null
        }
        Insert: {
          error_message?: string | null
          id?: string
          instance_name?: string | null
          last_retry_at?: string | null
          lead_id: string
          message_content: string
          retry_count?: number
          scheduled_for?: string | null
          sent_at?: string
          status?: string
          trigger_id: string
          user_id: string
          whatsapp_number?: string | null
        }
        Update: {
          error_message?: string | null
          id?: string
          instance_name?: string | null
          last_retry_at?: string | null
          lead_id?: string
          message_content?: string
          retry_count?: number
          scheduled_for?: string | null
          sent_at?: string
          status?: string
          trigger_id?: string
          user_id?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automated_message_logs_trigger_id_fkey"
            columns: ["trigger_id"]
            isOneToOne: false
            referencedRelation: "column_message_triggers"
            referencedColumns: ["id"]
          },
        ]
      }
      column_message_triggers: {
        Row: {
          column_id: string
          created_at: string
          delay_hours: number | null
          id: string
          is_active: boolean
          message_content: string
          message_title: string
          trigger_condition: string
          updated_at: string
          user_id: string
        }
        Insert: {
          column_id: string
          created_at?: string
          delay_hours?: number | null
          id?: string
          is_active?: boolean
          message_content: string
          message_title: string
          trigger_condition?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          column_id?: string
          created_at?: string
          delay_hours?: number | null
          id?: string
          is_active?: boolean
          message_content?: string
          message_title?: string
          trigger_condition?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_list_members: {
        Row: {
          added_at: string
          contact_id: string
          contact_list_id: string
          id: string
        }
        Insert: {
          added_at?: string
          contact_id: string
          contact_list_id: string
          id?: string
        }
        Update: {
          added_at?: string
          contact_id?: string
          contact_list_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_list_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_list_members_contact_list_id_fkey"
            columns: ["contact_list_id"]
            isOneToOne: false
            referencedRelation: "contact_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_lists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contacto_bloqueado_bot: {
        Row: {
          created_at: string
          id: string
          numero: string
          pushname: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          numero: string
          pushname?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          numero?: string
          pushname?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          phone_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          instance_name: string | null
          last_message: string | null
          last_message_at: string | null
          pushname: string | null
          unread_count: number | null
          updated_at: string
          user_id: string | null
          whatsapp_number: string
        }
        Insert: {
          created_at?: string
          id?: string
          instance_name?: string | null
          last_message?: string | null
          last_message_at?: string | null
          pushname?: string | null
          unread_count?: number | null
          updated_at?: string
          user_id?: string | null
          whatsapp_number: string
        }
        Update: {
          created_at?: string
          id?: string
          instance_name?: string | null
          last_message?: string | null
          last_message_at?: string | null
          pushname?: string | null
          unread_count?: number | null
          updated_at?: string
          user_id?: string | null
          whatsapp_number?: string
        }
        Relationships: []
      }
      lead_columns: {
        Row: {
          color: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          column_id: string | null
          company: string | null
          created_at: string
          email: string | null
          id: string
          instancia: string | null
          name: string
          notes: string | null
          phone: string | null
          position: number
          updated_at: string
          user_id: string | null
          value: number | null
        }
        Insert: {
          column_id?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          instancia?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          position?: number
          updated_at?: string
          user_id?: string | null
          value?: number | null
        }
        Update: {
          column_id?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          instancia?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          position?: number
          updated_at?: string
          user_id?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "lead_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      mass_campaigns: {
        Row: {
          attachment_names: string[] | null
          attachment_urls: string[] | null
          campaign_message: string
          contact_list_id: string | null
          created_at: string
          description: string | null
          edit_with_ai: boolean
          id: string
          max_delay: number
          min_delay: number
          name: string
          status: string
          updated_at: string
          user_id: string
          whatsapp_connection_name: string
        }
        Insert: {
          attachment_names?: string[] | null
          attachment_urls?: string[] | null
          campaign_message: string
          contact_list_id?: string | null
          created_at?: string
          description?: string | null
          edit_with_ai?: boolean
          id?: string
          max_delay?: number
          min_delay?: number
          name: string
          status?: string
          updated_at?: string
          user_id: string
          whatsapp_connection_name: string
        }
        Update: {
          attachment_names?: string[] | null
          attachment_urls?: string[] | null
          campaign_message?: string
          contact_list_id?: string | null
          created_at?: string
          description?: string | null
          edit_with_ai?: boolean
          id?: string
          max_delay?: number
          min_delay?: number
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
          whatsapp_connection_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "mass_campaigns_contact_list_id_fkey"
            columns: ["contact_list_id"]
            isOneToOne: false
            referencedRelation: "contact_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_url: string | null
          conversation_id: string | null
          created_at: string
          direction: string
          file_url: string | null
          id: string
          instance_name: string
          is_bot: boolean | null
          message: string | null
          message_type: string | null
          pushname: string | null
          updated_at: string
          user_id: string | null
          whatsapp_number: string
        }
        Insert: {
          attachment_url?: string | null
          conversation_id?: string | null
          created_at?: string
          direction: string
          file_url?: string | null
          id?: string
          instance_name: string
          is_bot?: boolean | null
          message?: string | null
          message_type?: string | null
          pushname?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp_number: string
        }
        Update: {
          attachment_url?: string | null
          conversation_id?: string | null
          created_at?: string
          direction?: string
          file_url?: string | null
          id?: string
          instance_name?: string
          is_bot?: boolean | null
          message?: string | null
          message_type?: string | null
          pushname?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          api_key: string | null
          configuration: Json | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_sandbox: boolean | null
          name: string
          provider: string
          secret_key: string | null
          supported_currencies: string[] | null
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          api_key?: string | null
          configuration?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_sandbox?: boolean | null
          name: string
          provider: string
          secret_key?: string | null
          supported_currencies?: string[] | null
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          api_key?: string | null
          configuration?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_sandbox?: boolean | null
          name?: string
          provider?: string
          secret_key?: string | null
          supported_currencies?: string[] | null
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          plan_id: string | null
          plan_type: string | null
          profile_type: Database["public"]["Enums"]["profile_type"]
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          plan_id?: string | null
          plan_type?: string | null
          profile_type?: Database["public"]["Enums"]["profile_type"]
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          plan_id?: string | null
          plan_type?: string | null
          profile_type?: Database["public"]["Enums"]["profile_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_replies: {
        Row: {
          created_at: string
          id: string
          message: string
          shortcut: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          shortcut?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          shortcut?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_messages: {
        Row: {
          attachment_url: string | null
          created_at: string
          error_message: string | null
          id: string
          instance_name: string
          message: string
          pushname: string | null
          scheduled_for: string
          sent_at: string | null
          status: string
          updated_at: string
          user_id: string
          whatsapp_number: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          instance_name: string
          message: string
          pushname?: string | null
          scheduled_for: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          whatsapp_number: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          instance_name?: string
          message?: string
          pushname?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          whatsapp_number?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_bot_responses: number
          max_contacts: number
          max_conversations: number
          max_device_sessions: number
          max_monthly_campaigns: number
          max_storage_mb: number
          max_whatsapp_connections: number
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_bot_responses: number
          max_contacts: number
          max_conversations?: number
          max_device_sessions?: number
          max_monthly_campaigns: number
          max_storage_mb: number
          max_whatsapp_connections: number
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_bot_responses?: number
          max_contacts?: number
          max_conversations?: number
          max_device_sessions?: number
          max_monthly_campaigns?: number
          max_storage_mb?: number
          max_whatsapp_connections?: number
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_bot_settings: {
        Row: {
          auto_stop_on_human_reply: boolean
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_stop_on_human_reply?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_stop_on_human_reply?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan_id: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_usage: {
        Row: {
          bot_responses_this_month: number
          campaigns_this_month: number
          contacts_used: number
          conversations_used: number
          created_at: string
          device_sessions_used: number
          id: string
          plan_id: string
          storage_used_mb: number
          updated_at: string
          usage_month: string
          user_id: string
          whatsapp_connections_used: number
        }
        Insert: {
          bot_responses_this_month?: number
          campaigns_this_month?: number
          contacts_used?: number
          conversations_used?: number
          created_at?: string
          device_sessions_used?: number
          id?: string
          plan_id: string
          storage_used_mb?: number
          updated_at?: string
          usage_month?: string
          user_id: string
          whatsapp_connections_used?: number
        }
        Update: {
          bot_responses_this_month?: number
          campaigns_this_month?: number
          contacts_used?: number
          conversations_used?: number
          created_at?: string
          device_sessions_used?: number
          id?: string
          plan_id?: string
          storage_used_mb?: number
          updated_at?: string
          usage_month?: string
          user_id?: string
          whatsapp_connections_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_usage_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string
          function_description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          function_description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          function_description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      whatsapp_connections: {
        Row: {
          codigo_qr: string | null
          color: string
          created_at: string
          id: string
          name: string
          phone_number: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          codigo_qr?: string | null
          color: string
          created_at?: string
          id?: string
          name: string
          phone_number: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          codigo_qr?: string | null
          color?: string
          created_at?: string
          id?: string
          name?: string
          phone_number?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_usage_limit: {
        Args: {
          p_requested_amount?: number
          p_resource_type: string
          p_user_id: string
        }
        Returns: boolean
      }
      increment_usage: {
        Args: { p_amount?: number; p_resource_type: string; p_user_id: string }
        Returns: boolean
      }
      is_superadmin: {
        Args: { user_id: string }
        Returns: boolean
      }
      update_expired_subscriptions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      profile_type: "cliente" | "superadmin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      profile_type: ["cliente", "superadmin"],
    },
  },
} as const
