-- PRC-02: supplier_catalog_items — mapping between master catalog and supplier nomenclature
-- This is the authoritative source for external naming/code mappings.

CREATE TABLE IF NOT EXISTS supplier_catalog_items (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES organizations(id),

  supplier_company_id   uuid NOT NULL REFERENCES companies(id),
  catalog_item_id       uuid NOT NULL REFERENCES catalog_items(id),

  external_code         text,
  external_name         text NOT NULL,
  normalized_external_name text NOT NULL,
  external_unit         text,

  is_preferred          boolean NOT NULL DEFAULT false,

  status                text NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','inactive','discontinued')),

  valid_from            date,
  valid_to              date,

  notes                 text,

  created_by            uuid NOT NULL REFERENCES auth.users(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_by            uuid NOT NULL REFERENCES auth.users(id),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Vigência constraint: valid_to IS NULL OR valid_to > valid_from
ALTER TABLE supplier_catalog_items
  ADD CONSTRAINT chk_sci_validity
  CHECK (valid_to IS NULL OR valid_to > valid_from);

-- Cross-org integrity: supplier company must belong to same organization
CREATE OR REPLACE FUNCTION fn_sci_company_same_org()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM companies
    WHERE id = NEW.supplier_company_id
      AND organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'supplier_company_id does not belong to organization_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sci_company_same_org
  BEFORE INSERT OR UPDATE ON supplier_catalog_items
  FOR EACH ROW
  EXECUTE FUNCTION fn_sci_company_same_org();

-- Cross-org integrity: catalog item must belong to same organization
CREATE OR REPLACE FUNCTION fn_sci_catalog_item_same_org()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM catalog_items
    WHERE id = NEW.catalog_item_id
      AND organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'catalog_item_id does not belong to organization_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sci_catalog_item_same_org
  BEFORE INSERT OR UPDATE ON supplier_catalog_items
  FOR EACH ROW
  EXECUTE FUNCTION fn_sci_catalog_item_same_org();

-- Preferred constraint: at most one preferred mapping per catalog_item + organization
CREATE UNIQUE INDEX idx_sci_unique_preferred
  ON supplier_catalog_items(catalog_item_id, organization_id)
  WHERE is_preferred = true AND status = 'active';

-- Duplicate detection: same org + supplier + catalog_item + external_code + normalized_external_name
CREATE UNIQUE INDEX idx_sci_no_exact_duplicate
  ON supplier_catalog_items(
    organization_id,
    supplier_company_id,
    catalog_item_id,
    COALESCE(external_code, ''),
    normalized_external_name
  )
  WHERE status IN ('active','inactive');

-- Indexes
CREATE INDEX idx_sci_org ON supplier_catalog_items(organization_id);
CREATE INDEX idx_sci_supplier ON supplier_catalog_items(supplier_company_id);
CREATE INDEX idx_sci_catalog_item ON supplier_catalog_items(catalog_item_id);
CREATE INDEX idx_sci_status ON supplier_catalog_items(organization_id, status);
CREATE INDEX idx_sci_normalized_name ON supplier_catalog_items(organization_id, normalized_external_name);
CREATE INDEX idx_sci_external_code ON supplier_catalog_items(supplier_company_id, external_code)
  WHERE external_code IS NOT NULL;

-- updated_at trigger
CREATE TRIGGER trg_supplier_catalog_items_updated_at
  BEFORE UPDATE ON supplier_catalog_items
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();
