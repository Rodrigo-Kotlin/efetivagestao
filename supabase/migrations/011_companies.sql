-- PRC-02: companies — corporate registry for external entities
-- Companies represent external entities the organization relates to.
-- Not to be confused with legal_entities (internal PJ).

CREATE TABLE IF NOT EXISTS companies (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id),

  legal_name        text NOT NULL,
  trade_name        text,

  tax_id            text,
  tax_id_normalized text,

  status            text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','inactive','archived')),

  notes             text,

  created_by        uuid NOT NULL REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid NOT NULL REFERENCES auth.users(id),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  archived_at       timestamptz,
  archived_by       uuid REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_companies_org ON companies(organization_id);
CREATE INDEX idx_companies_status ON companies(organization_id, status);
CREATE INDEX idx_companies_tax_id ON companies(organization_id, tax_id_normalized)
  WHERE tax_id_normalized IS NOT NULL;
CREATE INDEX idx_companies_name ON companies(organization_id, lower(legal_name));

-- Unique active tax_id per organization (partial unique index)
CREATE UNIQUE INDEX idx_companies_unique_active_tax_id
  ON companies(organization_id, tax_id_normalized)
  WHERE tax_id_normalized IS NOT NULL AND status = 'active';

-- updated_at trigger
CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();
