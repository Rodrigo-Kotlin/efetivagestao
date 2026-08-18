-- PRC-02: supplier_profiles — extension of companies for supplier role
-- A company becomes a supplier when a supplier_profile is created.

CREATE TABLE IF NOT EXISTS supplier_profiles (
  company_id        uuid PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  supplier_category text NOT NULL
                    CHECK (supplier_category IN (
                      'laboratory','imaging','clinic',
                      'professional_service','other'
                    )),

  status            text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','inactive','blocked')),

  contract_reference text,
  payment_terms      text,
  notes              text,

  created_by         uuid NOT NULL REFERENCES auth.users(id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_by         uuid NOT NULL REFERENCES auth.users(id),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Ensure supplier_profiles.organization_id matches the parent company
CREATE OR REPLACE FUNCTION fn_supplier_org_matches_company()
RETURNS trigger AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM (
    SELECT organization_id FROM companies WHERE id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'supplier_profiles.organization_id must match companies.organization_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_supplier_org_matches_company
  BEFORE INSERT OR UPDATE ON supplier_profiles
  FOR EACH ROW
  EXECUTE FUNCTION fn_supplier_org_matches_company();

-- Indexes
CREATE INDEX idx_supplier_profiles_org ON supplier_profiles(organization_id);
CREATE INDEX idx_supplier_profiles_category ON supplier_profiles(organization_id, supplier_category);
CREATE INDEX idx_supplier_profiles_status ON supplier_profiles(organization_id, status);

-- updated_at trigger
CREATE TRIGGER trg_supplier_profiles_updated_at
  BEFORE UPDATE ON supplier_profiles
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();
