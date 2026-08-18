-- PRC-03: supplier_cost_items — individual cost entries per version

CREATE TABLE IF NOT EXISTS supplier_cost_items (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           uuid NOT NULL REFERENCES organizations(id),

  cost_table_version_id     uuid NOT NULL REFERENCES supplier_cost_table_versions(id) ON DELETE CASCADE,

  supplier_catalog_item_id  uuid NOT NULL REFERENCES supplier_catalog_items(id),
  catalog_item_id           uuid NOT NULL REFERENCES catalog_items(id),

  cost_status               text NOT NULL DEFAULT 'not_provided'
                            CHECK (cost_status IN (
                              'provided','not_provided','not_applicable',
                              'awaiting_quote','confirmed_zero','discontinued'
                            )),

  amount                    numeric(14,4)
                            CHECK (
                              (cost_status = 'provided' AND amount IS NOT NULL AND amount >= 0)
                              OR (cost_status = 'confirmed_zero' AND amount = 0)
                              OR (cost_status != 'provided' AND cost_status != 'confirmed_zero')
                            ),

  currency_code             char(3) NOT NULL DEFAULT 'BRL',

  notes                     text,

  created_at                timestamptz NOT NULL DEFAULT now()
);

-- Unique: one cost item per version per supplier catalog item
CREATE UNIQUE INDEX idx_sci_cost_unique_item
  ON supplier_cost_items(cost_table_version_id, supplier_catalog_item_id);

-- Cross-org + integrity: version must belong to same org
CREATE OR REPLACE FUNCTION fn_sci_version_same_org()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM supplier_cost_table_versions
    WHERE id = NEW.cost_table_version_id
      AND organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'cost_table_version_id does not belong to organization_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_sci_version_same_org
  BEFORE INSERT OR UPDATE ON supplier_cost_items
  FOR EACH ROW
  EXECUTE FUNCTION fn_sci_version_same_org();

-- Integrity: supplier_catalog_item must belong to same supplier and catalog item
CREATE OR REPLACE FUNCTION fn_sci_mapping_integrity()
RETURNS trigger AS $$
DECLARE
  v_cost_table_supplier uuid;
  v_cost_table_org      uuid;
BEGIN
  -- Get the supplier and org from the cost table via the version
  SELECT ct.supplier_company_id, ct.organization_id
  INTO v_cost_table_supplier, v_cost_table_org
  FROM supplier_cost_table_versions v
  JOIN supplier_cost_tables ct ON ct.id = v.cost_table_id
  WHERE v.id = NEW.cost_table_version_id;

  -- Validate supplier_catalog_item belongs to same supplier
  IF NOT EXISTS (
    SELECT 1 FROM supplier_catalog_items
    WHERE id = NEW.supplier_catalog_item_id
      AND supplier_company_id = v_cost_table_supplier
      AND catalog_item_id = NEW.catalog_item_id
      AND organization_id = v_cost_table_org
  ) THEN
    RAISE EXCEPTION 'supplier_catalog_item does not match the cost table supplier or catalog_item_id';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_sci_mapping_integrity
  BEFORE INSERT OR UPDATE ON supplier_cost_items
  FOR EACH ROW
  EXECUTE FUNCTION fn_sci_mapping_integrity();

-- Prevent edits to items in active/superseded versions
CREATE OR REPLACE FUNCTION fn_sci_immutable_when_published()
RETURNS trigger AS $$
DECLARE
  v_version_status text;
BEGIN
  SELECT status INTO v_version_status
  FROM supplier_cost_table_versions
  WHERE id = NEW.cost_table_version_id;

  IF v_version_status IN ('active', 'superseded') THEN
    RAISE EXCEPTION 'Cannot modify cost items in active or superseded versions';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_sci_immutable_when_published
  BEFORE UPDATE OR DELETE ON supplier_cost_items
  FOR EACH ROW
  EXECUTE FUNCTION fn_sci_immutable_when_published();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sci_org ON supplier_cost_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_sci_version ON supplier_cost_items(cost_table_version_id);
CREATE INDEX IF NOT EXISTS idx_sci_catalog_item ON supplier_cost_items(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_sci_supplier_catalog_item ON supplier_cost_items(supplier_catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_sci_cost_status ON supplier_cost_items(cost_table_version_id, cost_status);
