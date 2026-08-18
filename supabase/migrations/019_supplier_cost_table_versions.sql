-- PRC-03: supplier_cost_table_versions — versioned cost snapshots

CREATE TABLE IF NOT EXISTS supplier_cost_table_versions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organizations(id),
  cost_table_id       uuid NOT NULL REFERENCES supplier_cost_tables(id) ON DELETE CASCADE,

  version_number      integer NOT NULL,
  version_label       text,

  source_date         date,

  valid_from          date NOT NULL,
  valid_to            date,

  status              text NOT NULL DEFAULT 'draft'
                      CHECK (status IN (
                        'draft','under_review','approved',
                        'scheduled','active','superseded','cancelled'
                      )),

  source_file_name    text,
  source_file_hash    text,
  source_document_id  uuid,

  notes               text,

  created_by          uuid NOT NULL REFERENCES auth.users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),

  approved_by         uuid REFERENCES auth.users(id),
  approved_at         timestamptz,

  published_by        uuid REFERENCES auth.users(id),
  published_at        timestamptz,

  superseded_at       timestamptz
);

-- Unique version number per cost table
CREATE UNIQUE INDEX idx_sctv_unique_version
  ON supplier_cost_table_versions(cost_table_id, version_number);

-- Validity constraint
ALTER TABLE supplier_cost_table_versions
  ADD CONSTRAINT chk_sctv_validity
  CHECK (valid_to IS NULL OR valid_to > valid_from);

-- Cross-org integrity: cost table must belong to same org
CREATE OR REPLACE FUNCTION fn_sctv_table_same_org()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM supplier_cost_tables
    WHERE id = NEW.cost_table_id
      AND organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'cost_table_id does not belong to organization_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_sctv_table_same_org
  BEFORE INSERT OR UPDATE ON supplier_cost_table_versions
  FOR EACH ROW
  EXECUTE FUNCTION fn_sctv_table_same_org();

-- Overlap protection for active/scheduled versions using daterange + EXCLUDE
-- This prevents two active or scheduled versions from having overlapping validity
CREATE OR REPLACE FUNCTION fn_sctv_overlap_check()
RETURNS trigger AS $$
BEGIN
  -- Only check overlap for active or scheduled statuses
  IF NEW.status IN ('active', 'scheduled') THEN
    IF EXISTS (
      SELECT 1 FROM supplier_cost_table_versions
      WHERE cost_table_id = NEW.cost_table_id
        AND id != NEW.id
        AND status IN ('active', 'scheduled')
        AND (
          (valid_to IS NULL AND NEW.valid_to IS NULL)
          OR (valid_to IS NULL AND NEW.valid_to > valid_from)
          OR (NEW.valid_to IS NULL AND valid_to > NEW.valid_from)
          OR (valid_to > NEW.valid_from AND NEW.valid_to > valid_from)
        )
    ) THEN
      RAISE EXCEPTION 'Overlapping active/scheduled versions are not allowed for the same cost table';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_sctv_overlap_check
  BEFORE INSERT OR UPDATE ON supplier_cost_table_versions
  FOR EACH ROW
  EXECUTE FUNCTION fn_sctv_overlap_check();

-- Version number sequence per cost table
CREATE SEQUENCE IF NOT EXISTS seq_cost_table_version
  OWNED BY supplier_cost_table_versions.version_number;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sctv_org ON supplier_cost_table_versions(organization_id);
CREATE INDEX IF NOT EXISTS idx_sctv_table ON supplier_cost_table_versions(cost_table_id);
CREATE INDEX IF NOT EXISTS idx_sctv_status ON supplier_cost_table_versions(cost_table_id, status);
CREATE INDEX IF NOT EXISTS idx_sctv_validity ON supplier_cost_table_versions(cost_table_id, valid_from, valid_to);
