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
      catalog_categories: {
        Row: {
          id: string;
          organization_id: string;
          parent_id: string | null;
          code: string;
          name: string;
          description: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          parent_id?: string | null;
          code: string;
          name: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          organization_id?: string;
          parent_id?: string | null;
          code?: string;
          name?: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      catalog_items: {
        Row: {
          id: string;
          organization_id: string;
          code: string;
          legacy_code: string | null;
          item_type: string;
          category_id: string | null;
          name: string;
          short_name: string | null;
          description: string | null;
          commercial_unit: string;
          execution_type: string;
          status: string;
          activated_at: string | null;
          deactivated_at: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_by: string;
          updated_at: string;
          archived_at: string | null;
          archived_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          code?: string;
          legacy_code?: string | null;
          item_type: string;
          category_id?: string | null;
          name: string;
          short_name?: string | null;
          description?: string | null;
          commercial_unit: string;
          execution_type: string;
          status?: string;
          activated_at?: string | null;
          deactivated_at?: string | null;
          notes?: string | null;
          created_by: string;
          created_at?: string;
          updated_by: string;
          updated_at?: string;
          archived_at?: string | null;
          archived_by?: string | null;
        };
        Update: {
          organization_id?: string;
          code?: string;
          legacy_code?: string | null;
          item_type?: string;
          category_id?: string | null;
          name?: string;
          short_name?: string | null;
          description?: string | null;
          commercial_unit?: string;
          execution_type?: string;
          status?: string;
          activated_at?: string | null;
          deactivated_at?: string | null;
          notes?: string | null;
          updated_by?: string;
          updated_at?: string;
          archived_at?: string | null;
          archived_by?: string | null;
        };
      };
      catalog_item_aliases: {
        Row: {
          id: string;
          organization_id: string;
          catalog_item_id: string;
          source_type: string;
          original_name: string;
          normalized_name: string;
          source_company_id: string | null;
          supplier_catalog_item_id: string | null;
          external_code: string | null;
          is_confirmed: boolean;
          confirmed_by: string | null;
          confirmed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          catalog_item_id: string;
          source_type: string;
          original_name: string;
          normalized_name: string;
          source_company_id?: string | null;
          supplier_catalog_item_id?: string | null;
          external_code?: string | null;
          is_confirmed?: boolean;
          confirmed_by?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
        };
        Update: {
          organization_id?: string;
          catalog_item_id?: string;
          source_type?: string;
          original_name?: string;
          normalized_name?: string;
          source_company_id?: string | null;
          supplier_catalog_item_id?: string | null;
          external_code?: string | null;
          is_confirmed?: boolean;
          confirmed_by?: string | null;
          confirmed_at?: string | null;
        };
      };
      companies: {
        Row: {
          id: string;
          organization_id: string;
          legal_name: string;
          trade_name: string | null;
          tax_id: string | null;
          tax_id_normalized: string | null;
          status: string;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_by: string;
          updated_at: string;
          archived_at: string | null;
          archived_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          legal_name: string;
          trade_name?: string | null;
          tax_id?: string | null;
          tax_id_normalized?: string | null;
          status?: string;
          notes?: string | null;
          created_by: string;
          created_at?: string;
          updated_by: string;
          updated_at?: string;
          archived_at?: string | null;
          archived_by?: string | null;
        };
        Update: {
          organization_id?: string;
          legal_name?: string;
          trade_name?: string | null;
          tax_id?: string | null;
          tax_id_normalized?: string | null;
          status?: string;
          notes?: string | null;
          updated_by?: string;
          updated_at?: string;
          archived_at?: string | null;
          archived_by?: string | null;
        };
      };
      supplier_profiles: {
        Row: {
          company_id: string;
          organization_id: string;
          supplier_category: string;
          status: string;
          contract_reference: string | null;
          payment_terms: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_by: string;
          updated_at: string;
        };
        Insert: {
          company_id: string;
          organization_id: string;
          supplier_category: string;
          status?: string;
          contract_reference?: string | null;
          payment_terms?: string | null;
          notes?: string | null;
          created_by: string;
          created_at?: string;
          updated_by: string;
          updated_at?: string;
        };
        Update: {
          organization_id?: string;
          supplier_category?: string;
          status?: string;
          contract_reference?: string | null;
          payment_terms?: string | null;
          notes?: string | null;
          updated_by?: string;
          updated_at?: string;
        };
      };
      supplier_catalog_items: {
        Row: {
          id: string;
          organization_id: string;
          supplier_company_id: string;
          catalog_item_id: string;
          external_code: string | null;
          external_name: string;
          normalized_external_name: string;
          external_unit: string | null;
          is_preferred: boolean;
          status: string;
          valid_from: string | null;
          valid_to: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_by: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          supplier_company_id: string;
          catalog_item_id: string;
          external_code?: string | null;
          external_name: string;
          normalized_external_name: string;
          external_unit?: string | null;
          is_preferred?: boolean;
          status?: string;
          valid_from?: string | null;
          valid_to?: string | null;
          notes?: string | null;
          created_by: string;
          created_at?: string;
          updated_by: string;
          updated_at?: string;
        };
        Update: {
          organization_id?: string;
          supplier_company_id?: string;
          catalog_item_id?: string;
          external_code?: string | null;
          external_name?: string;
          normalized_external_name?: string;
          external_unit?: string | null;
          is_preferred?: boolean;
          status?: string;
          valid_from?: string | null;
          valid_to?: string | null;
          notes?: string | null;
          updated_by?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
