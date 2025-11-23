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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_agents: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          max_tokens: number | null
          model: string | null
          name: string
          system_prompt: string
          temperature: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_tokens?: number | null
          model?: string | null
          name: string
          system_prompt: string
          temperature?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_tokens?: number | null
          model?: string | null
          name?: string
          system_prompt?: string
          temperature?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_api_keys: {
        Row: {
          api_key: string
          created_at: string | null
          id: string
          is_active: boolean | null
          provider: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provider: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provider?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      automated_message_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          last_retry_at: string | null
          lead_id: string | null
          message_content: string
          phone_number: string
          retry_count: number | null
          scheduled_for: string
          sent_at: string | null
          status: string | null
          trigger_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_retry_at?: string | null
          lead_id?: string | null
          message_content: string
          phone_number: string
          retry_count?: number | null
          scheduled_for: string
          sent_at?: string | null
          status?: string | null
          trigger_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_retry_at?: string | null
          lead_id?: string | null
          message_content?: string
          phone_number?: string
          retry_count?: number | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string | null
          trigger_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automated_message_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automated_message_logs_trigger_id_fkey"
            columns: ["trigger_id"]
            isOneToOne: false
            referencedRelation: "column_message_triggers"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_sends: {
        Row: {
          campaign_id: string
          contact_id: string | null
          contact_name: string | null
          created_at: string | null
          error_message: string | null
          id: string
          message_sent: string
          phone_number: string
          sent_at: string | null
          status: string
          user_id: string
          was_personalized: boolean | null
        }
        Insert: {
          campaign_id: string
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          message_sent: string
          phone_number: string
          sent_at?: string | null
          status?: string
          user_id: string
          was_personalized?: boolean | null
        }
        Update: {
          campaign_id?: string
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          message_sent?: string
          phone_number?: string
          sent_at?: string | null
          status?: string
          user_id?: string
          was_personalized?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "mass_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_sends_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      column_message_triggers: {
        Row: {
          column_id: string
          created_at: string | null
          delay_hours: number | null
          id: string
          is_active: boolean | null
          message_content: string
          message_title: string
          trigger_condition: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          column_id: string
          created_at?: string | null
          delay_hours?: number | null
          id?: string
          is_active?: boolean | null
          message_content: string
          message_title: string
          trigger_condition: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          column_id?: string
          created_at?: string | null
          delay_hours?: number | null
          id?: string
          is_active?: boolean | null
          message_content?: string
          message_title?: string
          trigger_condition?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_triggers_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "lead_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_details: {
        Row: {
          agent_id: string | null
          birth_date: string | null
          conversation_id: string | null
          created_at: string | null
          funnel_stage: string | null
          gender: string | null
          id: string
          notes: string | null
          origin: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          birth_date?: string | null
          conversation_id?: string | null
          created_at?: string | null
          funnel_stage?: string | null
          gender?: string | null
          id?: string
          notes?: string | null
          origin?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string | null
          birth_date?: string | null
          conversation_id?: string | null
          created_at?: string | null
          funnel_stage?: string | null
          gender?: string | null
          id?: string
          notes?: string | null
          origin?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_details_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_list_members: {
        Row: {
          added_at: string | null
          contact_id: string
          contact_list_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          added_at?: string | null
          contact_id: string
          contact_list_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          added_at?: string | null
          contact_id?: string
          contact_list_id?: string
          created_at?: string | null
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
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contact_sales: {
        Row: {
          amount: number
          contact_detail_id: string | null
          created_at: string | null
          description: string | null
          id: string
          sale_date: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          contact_detail_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          sale_date?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          contact_detail_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          sale_date?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_sales_contact_detail_id_fkey"
            columns: ["contact_detail_id"]
            isOneToOne: false
            referencedRelation: "contact_details"
            referencedColumns: ["id"]
          },
        ]
      }
      contacto_bloqueado_bot: {
        Row: {
          created_at: string | null
          id: string
          numero: string
          pushname: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          numero: string
          pushname?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          numero?: string
          pushname?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          address: string | null
          birth_date: string | null
          company: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          gender: string | null
          id: string
          is_blocked: boolean | null
          last_name: string | null
          name: string
          notes: string | null
          origin: string | null
          phone_number: string
          tags: string[] | null
          updated_at: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          is_blocked?: boolean | null
          last_name?: string | null
          name: string
          notes?: string | null
          origin?: string | null
          phone_number: string
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          is_blocked?: boolean | null
          last_name?: string | null
          name?: string
          notes?: string | null
          origin?: string | null
          phone_number?: string
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          contact_name: string | null
          created_at: string | null
          id: string
          last_message: string | null
          last_message_time: string | null
          lead_id: string | null
          phone_number: string
          pushname: string | null
          status: string | null
          unread_count: number | null
          updated_at: string | null
          user_id: string
          whatsapp_number: string | null
        }
        Insert: {
          contact_name?: string | null
          created_at?: string | null
          id?: string
          last_message?: string | null
          last_message_time?: string | null
          lead_id?: string | null
          phone_number: string
          pushname?: string | null
          status?: string | null
          unread_count?: number | null
          updated_at?: string | null
          user_id: string
          whatsapp_number?: string | null
        }
        Update: {
          contact_name?: string | null
          created_at?: string | null
          id?: string
          last_message?: string | null
          last_message_time?: string | null
          lead_id?: string | null
          phone_number?: string
          pushname?: string | null
          status?: string | null
          unread_count?: number | null
          updated_at?: string | null
          user_id?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          receiver_id: string
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id: string
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id?: string
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      lead_columns: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          position: number
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          position: number
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          position?: number
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_columns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          bot_active: boolean | null
          column_id: string
          company: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          position: number
          updated_at: string | null
          user_id: string
          value: number | null
        }
        Insert: {
          bot_active?: boolean | null
          column_id: string
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone: string
          position: number
          updated_at?: string | null
          user_id: string
          value?: number | null
        }
        Update: {
          bot_active?: boolean | null
          column_id?: string
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          position?: number
          updated_at?: string | null
          user_id?: string
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
          campaign_message: string | null
          contact_list_id: string | null
          created_at: string | null
          description: string | null
          edit_with_ai: boolean | null
          id: string
          max_delay: number | null
          message: string
          min_delay: number | null
          name: string
          scheduled_at: string | null
          sent_count: number | null
          status: string | null
          total_count: number | null
          updated_at: string | null
          user_id: string
          whatsapp_connection_id: string | null
          whatsapp_connection_name: string | null
        }
        Insert: {
          attachment_names?: string[] | null
          attachment_urls?: string[] | null
          campaign_message?: string | null
          contact_list_id?: string | null
          created_at?: string | null
          description?: string | null
          edit_with_ai?: boolean | null
          id?: string
          max_delay?: number | null
          message: string
          min_delay?: number | null
          name: string
          scheduled_at?: string | null
          sent_count?: number | null
          status?: string | null
          total_count?: number | null
          updated_at?: string | null
          user_id: string
          whatsapp_connection_id?: string | null
          whatsapp_connection_name?: string | null
        }
        Update: {
          attachment_names?: string[] | null
          attachment_urls?: string[] | null
          campaign_message?: string | null
          contact_list_id?: string | null
          created_at?: string | null
          description?: string | null
          edit_with_ai?: boolean | null
          id?: string
          max_delay?: number | null
          message?: string
          min_delay?: number | null
          name?: string
          scheduled_at?: string | null
          sent_count?: number | null
          status?: string | null
          total_count?: number | null
          updated_at?: string | null
          user_id?: string
          whatsapp_connection_id?: string | null
          whatsapp_connection_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mass_campaigns_contact_list_id_fkey"
            columns: ["contact_list_id"]
            isOneToOne: false
            referencedRelation: "contact_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mass_campaigns_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_url: string | null
          content: string
          conversation_id: string
          created_at: string | null
          direction: string
          file_url: string | null
          id: string
          is_bot: boolean | null
          message: string | null
          message_type: string | null
          metadata: Json | null
          status: string | null
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          content: string
          conversation_id: string
          created_at?: string | null
          direction: string
          file_url?: string | null
          id?: string
          is_bot?: boolean | null
          message?: string | null
          message_type?: string | null
          metadata?: Json | null
          status?: string | null
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string | null
          direction?: string
          file_url?: string | null
          id?: string
          is_bot?: boolean | null
          message?: string | null
          message_type?: string | null
          metadata?: Json | null
          status?: string | null
          user_id?: string
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
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          provider: string
          secret_key: string | null
          supported_currencies: string[] | null
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          api_key?: string | null
          configuration?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          provider: string
          secret_key?: string | null
          supported_currencies?: string[] | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          api_key?: string | null
          configuration?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          provider?: string
          secret_key?: string | null
          supported_currencies?: string[] | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      payment_plans: {
        Row: {
          billing_period: string
          created_at: string | null
          currency: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          limits: Json | null
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          billing_period: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          limits?: Json | null
          name: string
          price: number
          updated_at?: string | null
        }
        Update: {
          billing_period?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          limits?: Json | null
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          price: number
          stock: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          price?: number
          stock?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          price?: number
          stock?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          plan_id: string | null
          plan_type: string | null
          profile_type: Database["public"]["Enums"]["profile_type"] | null
          updated_at: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          plan_id?: string | null
          plan_type?: string | null
          profile_type?: Database["public"]["Enums"]["profile_type"] | null
          updated_at?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          plan_id?: string | null
          plan_type?: string | null
          profile_type?: Database["public"]["Enums"]["profile_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "payment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_replies: {
        Row: {
          attachment_urls: string[] | null
          created_at: string | null
          hotkey: string | null
          id: string
          message: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attachment_urls?: string[] | null
          created_at?: string | null
          hotkey?: string | null
          id?: string
          message: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attachment_urls?: string[] | null
          created_at?: string | null
          hotkey?: string | null
          id?: string
          message?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          product_id: string
          quantity: number
          sale_date: string
          seller_id: string
          total_amount: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          product_id: string
          quantity: number
          sale_date?: string
          seller_id: string
          total_amount?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          product_id?: string
          quantity?: number
          sale_date?: string
          seller_id?: string
          total_amount?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_messages: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          lead_id: string
          message_content: string
          phone_number: string
          retry_count: number | null
          scheduled_for: string
          sent_at: string | null
          status: string | null
          trigger_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          lead_id: string
          message_content: string
          phone_number: string
          retry_count?: number | null
          scheduled_for: string
          sent_at?: string | null
          status?: string | null
          trigger_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string
          message_content?: string
          phone_number?: string
          retry_count?: number | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string | null
          trigger_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_messages_trigger_id_fkey"
            columns: ["trigger_id"]
            isOneToOne: false
            referencedRelation: "column_message_triggers"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_tracking: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          period_end: string
          period_start: string
          resource_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          period_end: string
          period_start: string
          resource_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          period_end?: string
          period_start?: string
          resource_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_bot_settings: {
        Row: {
          auto_stop_on_human_reply: boolean | null
          bot_enabled: boolean
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_stop_on_human_reply?: boolean | null
          bot_enabled?: boolean
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_stop_on_human_reply?: boolean | null
          bot_enabled?: boolean
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string | null
          end_date: string | null
          external_subscription_id: string | null
          id: string
          payment_provider: string | null
          plan_id: string
          start_date: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          external_subscription_id?: string | null
          id?: string
          payment_provider?: string | null
          plan_id: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          external_subscription_id?: string | null
          id?: string
          payment_provider?: string | null
          plan_id?: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "payment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_usage: {
        Row: {
          bot_responses_this_month: number | null
          campaigns_this_month: number | null
          contacts_used: number | null
          conversations_used: number | null
          created_at: string | null
          device_sessions_used: number | null
          id: string
          storage_used_mb: number | null
          updated_at: string | null
          usage_month: string
          user_id: string
          whatsapp_connections_used: number | null
        }
        Insert: {
          bot_responses_this_month?: number | null
          campaigns_this_month?: number | null
          contacts_used?: number | null
          conversations_used?: number | null
          created_at?: string | null
          device_sessions_used?: number | null
          id?: string
          storage_used_mb?: number | null
          updated_at?: string | null
          usage_month: string
          user_id: string
          whatsapp_connections_used?: number | null
        }
        Update: {
          bot_responses_this_month?: number | null
          campaigns_this_month?: number | null
          contacts_used?: number | null
          conversations_used?: number | null
          created_at?: string | null
          device_sessions_used?: number | null
          id?: string
          storage_used_mb?: number | null
          updated_at?: string | null
          usage_month?: string
          user_id?: string
          whatsapp_connections_used?: number | null
        }
        Relationships: []
      }
      whatsapp_connections: {
        Row: {
          created_at: string | null
          default_column_id: string | null
          id: string
          name: string | null
          phone_number: string
          qr_code: string | null
          session_data: Json | null
          status: string | null
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          default_column_id?: string | null
          id?: string
          name?: string | null
          phone_number: string
          qr_code?: string | null
          session_data?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          default_column_id?: string | null
          id?: string
          name?: string | null
          phone_number?: string
          qr_code?: string | null
          session_data?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_connections_default_column_id_fkey"
            columns: ["default_column_id"]
            isOneToOne: false
            referencedRelation: "lead_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string | null
          id: string
          name: string
          position: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          position?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          position?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_usage: {
        Args: { p_amount?: number; p_resource_type: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "superadmin" | "admin" | "user" | "cashier"
      profile_type: "superadmin" | "client"
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
      app_role: ["superadmin", "admin", "user", "cashier"],
      profile_type: ["superadmin", "client"],
    },
  },
} as const
