-- PRC-02A fix: DROP old function overloads that CREATE OR REPLACE cannot remove

-- Drop old 7-param log_audit with actor_user_id
DROP FUNCTION IF EXISTS log_audit(uuid, uuid, text, text, uuid, jsonb, jsonb);

-- Drop old 12-param fn_create_supplier_mapping with p_user_id
DROP FUNCTION IF EXISTS fn_create_supplier_mapping(uuid, uuid, uuid, text, text, text, text, boolean, date, date, text, uuid);

-- Drop old 2-param fn_set_preferred_mapping with p_user_id
DROP FUNCTION IF EXISTS fn_set_preferred_mapping(uuid, uuid);
