-- PRC-03: supplier_cost_tables — cost table registry per supplier

CREATE TABLE IF NOT EXISTS supplier_cost_tables (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organizations(id),
  supplier_company_id uuid NOT NULL REFERENCES companies(id),

  code                text NOT NULL,
  name                text NOT NULL,
  description         text,

  status              text NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','inactive','archived')),

  created_by          uuid NOT NULL REFERENCES auth.users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_by          uuid NOT NULL REFERENCES auth.users(id),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  archived_at         timestamptz,
  archived_by         uuid REFERENCES auth.users(id)
);

-- Unique code per supplier per organization
CREATE UNIQUE INDEX idx_sct_unique_code
  ON supplier_cost_tables(organization_id, supplier_company_id, code)
  WHERE status != 'archived';

-- Cross-org integrity: supplier must have active supplier_profile
CREATE OR REPLACE FUNCTION fn_sct_supplier_is_active()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM supplier_profiles
    WHERE company_id = NEW.supplier_company_id
      AND organization_id = NEW.organization_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'supplier_company_id must have an active supplier_profile in this organization';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_sct_supplier_is_active
  BEFORE INSERT OR UPDATE ON supplier_cost_tables
  FOR EACH ROW
  EXECUTE FUNCTION fn_sct_supplier_is_active();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sct_org ON supplier_cost_tables(organization_id);
CREATE INDEX IF NOT EXISTS idx_sct_supplier ON supplier_cost_tables(supplier_company_id);
CREATE INDEX IF NOT EXISTS idx_sct_status ON supplier_cost_tables(organization_id, status);

-- updated_at trigger
CREATE TRIGGER trg_supplier_cost_tables_updated_at
  BEFORE UPDATE ON supplier_cost_tables
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();
