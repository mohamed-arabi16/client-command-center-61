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
      activities: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          date: string
          deliverable_type: string | null
          description: string
          id: string
          type: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          date?: string
          deliverable_type?: string | null
          description: string
          id?: string
          type: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          date?: string
          deliverable_type?: string | null
          description?: string
          id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_time_logs: {
        Row: {
          ai_assisted_hours: number | null
          ai_tools_used: string[] | null
          client_id: string
          created_at: string | null
          id: string
          manual_hours: number | null
          month_date: string
          notes: string | null
          tasks_completed: number | null
          time_saved_hours: number | null
          updated_at: string | null
        }
        Insert: {
          ai_assisted_hours?: number | null
          ai_tools_used?: string[] | null
          client_id: string
          created_at?: string | null
          id?: string
          manual_hours?: number | null
          month_date: string
          notes?: string | null
          tasks_completed?: number | null
          time_saved_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          ai_assisted_hours?: number | null
          ai_tools_used?: string[] | null
          client_id?: string
          created_at?: string | null
          id?: string
          manual_hours?: number | null
          month_date?: string
          notes?: string | null
          tasks_completed?: number | null
          time_saved_hours?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_time_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_feedback: {
        Row: {
          client_id: string
          created_at: string
          feedback_by: string
          feedback_text: string
          id: string
          post_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          feedback_by: string
          feedback_text: string
          id?: string
          post_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          feedback_by?: string
          feedback_text?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_feedback_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_feedback_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "content_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      business_metrics: {
        Row: {
          average_star_rating: number | null
          booking_form_submissions: number | null
          client_id: string
          created_at: string | null
          dm_appointment_requests: number | null
          follower_count: number | null
          gmb_call_clicks: number | null
          gmb_direction_clicks: number | null
          gmb_website_clicks: number | null
          id: string
          link_in_bio_clicks: number | null
          metric_date: string
          new_reviews_count: number | null
          post_saves: number | null
          post_shares: number | null
          updated_at: string | null
          video_views: number | null
        }
        Insert: {
          average_star_rating?: number | null
          booking_form_submissions?: number | null
          client_id: string
          created_at?: string | null
          dm_appointment_requests?: number | null
          follower_count?: number | null
          gmb_call_clicks?: number | null
          gmb_direction_clicks?: number | null
          gmb_website_clicks?: number | null
          id?: string
          link_in_bio_clicks?: number | null
          metric_date: string
          new_reviews_count?: number | null
          post_saves?: number | null
          post_shares?: number | null
          updated_at?: string | null
          video_views?: number | null
        }
        Update: {
          average_star_rating?: number | null
          booking_form_submissions?: number | null
          client_id?: string
          created_at?: string | null
          dm_appointment_requests?: number | null
          follower_count?: number | null
          gmb_call_clicks?: number | null
          gmb_direction_clicks?: number | null
          gmb_website_clicks?: number | null
          id?: string
          link_in_bio_clicks?: number | null
          metric_date?: string
          new_reviews_count?: number | null
          post_saves?: number | null
          post_shares?: number | null
          updated_at?: string | null
          video_views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "business_metrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_users: {
        Row: {
          client_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          average_customer_value: number | null
          business_type: string | null
          contract_type: string
          created_at: string
          estimated_close_rate: number | null
          facebook_page_id: string | null
          id: string
          instagram_access_token: string | null
          instagram_bio: string | null
          instagram_business_account_id: string | null
          instagram_follower_count: number | null
          instagram_handle: string | null
          instagram_profile_pic_url: string | null
          instagram_scraped_at: string | null
          instagram_url: string | null
          logo_url: string | null
          name: string
          payment_terms: Json | null
          primary_goal: string | null
          primary_lead_source: string | null
          start_date: string
          status: Database["public"]["Enums"]["client_status"]
          total_contract_value: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          average_customer_value?: number | null
          business_type?: string | null
          contract_type: string
          created_at?: string
          estimated_close_rate?: number | null
          facebook_page_id?: string | null
          id?: string
          instagram_access_token?: string | null
          instagram_bio?: string | null
          instagram_business_account_id?: string | null
          instagram_follower_count?: number | null
          instagram_handle?: string | null
          instagram_profile_pic_url?: string | null
          instagram_scraped_at?: string | null
          instagram_url?: string | null
          logo_url?: string | null
          name: string
          payment_terms?: Json | null
          primary_goal?: string | null
          primary_lead_source?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["client_status"]
          total_contract_value?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          average_customer_value?: number | null
          business_type?: string | null
          contract_type?: string
          created_at?: string
          estimated_close_rate?: number | null
          facebook_page_id?: string | null
          id?: string
          instagram_access_token?: string | null
          instagram_bio?: string | null
          instagram_business_account_id?: string | null
          instagram_follower_count?: number | null
          instagram_handle?: string | null
          instagram_profile_pic_url?: string | null
          instagram_scraped_at?: string | null
          instagram_url?: string | null
          logo_url?: string | null
          name?: string
          payment_terms?: Json | null
          primary_goal?: string | null
          primary_lead_source?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["client_status"]
          total_contract_value?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      content_posts: {
        Row: {
          approved_at: string | null
          auto_approve_at: string | null
          caption: string
          client_id: string
          created_at: string
          created_by: string
          deliverable_id: string | null
          id: string
          media_urls: string[]
          platforms: string[]
          published_at: string | null
          scheduled_time: string | null
          status: Database["public"]["Enums"]["content_post_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          auto_approve_at?: string | null
          caption: string
          client_id: string
          created_at?: string
          created_by: string
          deliverable_id?: string | null
          id?: string
          media_urls?: string[]
          platforms: string[]
          published_at?: string | null
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["content_post_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          auto_approve_at?: string | null
          caption?: string
          client_id?: string
          created_at?: string
          created_by?: string
          deliverable_id?: string | null
          id?: string
          media_urls?: string[]
          platforms?: string[]
          published_at?: string | null
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["content_post_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_posts_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "deliverables"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverables: {
        Row: {
          billing_period: string | null
          client_id: string
          completed: number
          created_at: string
          id: string
          period: string | null
          proposal_id: string | null
          total: number
          type: string
          updated_at: string
        }
        Insert: {
          billing_period?: string | null
          client_id: string
          completed?: number
          created_at?: string
          id?: string
          period?: string | null
          proposal_id?: string | null
          total: number
          type: string
          updated_at?: string
        }
        Update: {
          billing_period?: string | null
          client_id?: string
          completed?: number
          created_at?: string
          id?: string
          period?: string | null
          proposal_id?: string | null
          total?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverables_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverables_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_reports: {
        Row: {
          ai_analysis: string | null
          client_id: string
          created_at: string
          generated_at: string
          id: string
          period_end: string
          period_start: string
          summary: Json | null
        }
        Insert: {
          ai_analysis?: string | null
          client_id: string
          created_at?: string
          generated_at?: string
          id?: string
          period_end: string
          period_start: string
          summary?: Json | null
        }
        Update: {
          ai_analysis?: string | null
          client_id?: string
          created_at?: string
          generated_at?: string
          id?: string
          period_end?: string
          period_start?: string
          summary?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_catalog: {
        Row: {
          category: string
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          notes: string | null
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          notes?: string | null
          unit_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          notes?: string | null
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      proposal_items: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          price_at_sale: number
          proposal_id: string
          quantity: number
          service_id: string | null
          service_name: string
          service_name_en: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          id?: string
          price_at_sale: number
          proposal_id: string
          quantity: number
          service_id?: string | null
          service_name: string
          service_name_en?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          price_at_sale?: number
          proposal_id?: string
          quantity?: number
          service_id?: string | null
          service_name?: string
          service_name_en?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "pricing_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          total_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          total_value: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          total_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      proposals: {
        Row: {
          accepted_at: string | null
          ai_tools_used: string[] | null
          client_address: string | null
          client_contact_person: string | null
          client_email: string | null
          client_id: string | null
          client_name: string
          client_phone: string | null
          contract_duration: string
          contract_end_date: string | null
          contract_number: string | null
          contract_start_date: string | null
          converted_to_client_id: string | null
          created_at: string
          discount_amount: number | null
          discount_percentage: number | null
          explicit_boundaries: Json | null
          id: string
          instagram_url: string | null
          line_items: Json
          notes: string | null
          package_tier: string | null
          payment_schedule: Json | null
          payment_terms: Json | null
          proposal_type: string
          sent_at: string | null
          share_token: string | null
          status: string
          subtotal_before_discount: number | null
          total_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          ai_tools_used?: string[] | null
          client_address?: string | null
          client_contact_person?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name: string
          client_phone?: string | null
          contract_duration?: string
          contract_end_date?: string | null
          contract_number?: string | null
          contract_start_date?: string | null
          converted_to_client_id?: string | null
          created_at?: string
          discount_amount?: number | null
          discount_percentage?: number | null
          explicit_boundaries?: Json | null
          id?: string
          instagram_url?: string | null
          line_items?: Json
          notes?: string | null
          package_tier?: string | null
          payment_schedule?: Json | null
          payment_terms?: Json | null
          proposal_type?: string
          sent_at?: string | null
          share_token?: string | null
          status?: string
          subtotal_before_discount?: number | null
          total_value?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          ai_tools_used?: string[] | null
          client_address?: string | null
          client_contact_person?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string
          client_phone?: string | null
          contract_duration?: string
          contract_end_date?: string | null
          contract_number?: string | null
          contract_start_date?: string | null
          converted_to_client_id?: string | null
          created_at?: string
          discount_amount?: number | null
          discount_percentage?: number | null
          explicit_boundaries?: Json | null
          id?: string
          instagram_url?: string | null
          line_items?: Json
          notes?: string | null
          package_tier?: string | null
          payment_schedule?: Json | null
          payment_terms?: Json | null
          proposal_type?: string
          sent_at?: string | null
          share_token?: string | null
          status?: string
          subtotal_before_discount?: number | null
          total_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_converted_to_client_id_fkey"
            columns: ["converted_to_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      roi_estimates: {
        Row: {
          average_customer_value: number | null
          client_id: string
          created_at: string | null
          estimated_conversions: number | null
          estimated_revenue: number | null
          id: string
          metric_id: string | null
          month_date: string
          package_investment: number | null
          roi_percentage: number | null
          total_leads: number | null
          updated_at: string | null
        }
        Insert: {
          average_customer_value?: number | null
          client_id: string
          created_at?: string | null
          estimated_conversions?: number | null
          estimated_revenue?: number | null
          id?: string
          metric_id?: string | null
          month_date: string
          package_investment?: number | null
          roi_percentage?: number | null
          total_leads?: number | null
          updated_at?: string | null
        }
        Update: {
          average_customer_value?: number | null
          client_id?: string
          created_at?: string | null
          estimated_conversions?: number | null
          estimated_revenue?: number | null
          id?: string
          metric_id?: string | null
          month_date?: string
          package_investment?: number | null
          roi_percentage?: number | null
          total_leads?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roi_estimates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roi_estimates_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "business_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      shareable_links: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_active: boolean
          last_accessed: string | null
          token: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_accessed?: string | null
          token: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_accessed?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "shareable_links_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      template_items: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          quantity: number
          service_name: string
          service_name_en: string | null
          template_id: string
          unit_price: number
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          id?: string
          quantity: number
          service_name: string
          service_name_en?: string | null
          template_id: string
          unit_price: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          quantity?: number
          service_name?: string
          service_name_en?: string | null
          template_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "proposal_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      todos: {
        Row: {
          client_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string
          id: string
          priority: Database["public"]["Enums"]["priority_level"]
          title: string
          updated_at: string
        }
        Insert: {
          client_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date: string
          id?: string
          priority?: Database["public"]["Enums"]["priority_level"]
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string
          id?: string
          priority?: Database["public"]["Enums"]["priority_level"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "todos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_contract_number: {
        Args: { p_client_id: string }
        Returns: string
      }
      get_client_by_share_token: {
        Args: { share_token: string }
        Returns: {
          contract_type: string
          id: string
          logo_url: string
          name: string
          start_date: string
          status: Database["public"]["Enums"]["client_status"]
          total_contract_value: number
        }[]
      }
      get_proposal_by_share_token: {
        Args: { share_token: string }
        Returns: {
          accepted_at: string
          client_address: string
          client_contact_person: string
          client_email: string
          client_id: string
          client_name: string
          client_phone: string
          contract_duration: string
          contract_end_date: string
          contract_number: string
          contract_start_date: string
          created_at: string
          discount_amount: number
          discount_percentage: number
          id: string
          instagram_url: string
          notes: string
          payment_schedule: Json
          payment_terms: Json
          proposal_type: string
          sent_at: string
          status: string
          subtotal_before_discount: number
          total_value: number
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          check_role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      client_status: "active" | "paused" | "completed"
      content_post_status:
        | "draft"
        | "pending_approval"
        | "revisions"
        | "approved"
        | "published"
      priority_level: "high" | "medium" | "low"
      user_role: "admin" | "user"
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
      client_status: ["active", "paused", "completed"],
      content_post_status: [
        "draft",
        "pending_approval",
        "revisions",
        "approved",
        "published",
      ],
      priority_level: ["high", "medium", "low"],
      user_role: ["admin", "user"],
    },
  },
} as const
