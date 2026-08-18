export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          status?: string;
          updated_at?: string;
        };
      };
      legal_entities: {
        Row: {
          id: string;
          organization_id: string;
          legal_name: string;
          trade_name: string | null;
          tax_id: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          legal_name: string;
          trade_name?: string | null;
          tax_id?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          organization_id?: string;
          legal_name?: string;
          trade_name?: string | null;
          tax_id?: string | null;
          status?: string;
          updated_at?: string;
        };
      };
      business_units: {
        Row: {
          id: string;
          organization_id: string;
          legal_entity_id: string;
          name: string;
          code: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          legal_entity_id: string;
          name: string;
          code?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          organization_id?: string;
          legal_entity_id?: string;
          name?: string;
          code?: string | null;
          status?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string | null;
          status?: string;
          updated_at?: string;
        };
      };
      organization_memberships: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          organization_id?: string;
          user_id?: string;
          status?: string;
          updated_at?: string;
        };
      };
      roles: {
        Row: {
          id: string;
          organization_id: string | null;
          code: string;
          name: string;
          description: string | null;
          is_system: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          code: string;
          name: string;
          description?: string | null;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          organization_id?: string | null;
          code?: string;
          name?: string;
          description?: string | null;
          is_system?: boolean;
          updated_at?: string;
        };
      };
      permissions: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          code?: string;
          name?: string;
          description?: string | null;
        };
      };
      role_permissions: {
        Row: {
          role_id: string;
          permission_id: string;
        };
        Insert: {
          role_id: string;
          permission_id: string;
        };
        Update: {
          role_id?: string;
          permission_id?: string;
        };
      };
      membership_roles: {
        Row: {
          membership_id: string;
          role_id: string;
        };
        Insert: {
          membership_id: string;
          role_id: string;
        };
        Update: {
          membership_id?: string;
          role_id?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          organization_id: string | null;
          actor_user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          old_data: Json | null;
          new_data: Json | null;
          reason: string | null;
          request_context: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          actor_user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          old_data?: Json | null;
          new_data?: Json | null;
          reason?: string | null;
          request_context?: Json | null;
          created_at?: string;
        };
        Update: {
          organization_id?: string | null;
          actor_user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          old_data?: Json | null;
          new_data?: Json | null;
          reason?: string | null;
          request_context?: Json | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
