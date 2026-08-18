-- PRC-02: RLS policies for companies, supplier_profiles, supplier_catalog_items

-- ============================================================
-- companies
-- ============================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY companies_select ON companies
  FOR SELECT USING (
    is_member_of(organization_id)
    AND has_permission('core.company.view', organization_id)
  );

CREATE POLICY companies_insert ON companies
  FOR INSERT WITH CHECK (
    is_member_of(organization_id)
    AND has_permission('core.company.create', organization_id)
  );

CREATE POLICY companies_update ON companies
  FOR UPDATE USING (
    is_member_of(organization_id)
    AND has_permission('core.company.edit', organization_id)
  );

CREATE POLICY companies_delete ON companies
  FOR DELETE USING (
    is_member_of(organization_id)
    AND has_permission('core.company.archive', organization_id)
  );

-- ============================================================
-- supplier_profiles
-- ============================================================
ALTER TABLE supplier_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY supplier_profiles_select ON supplier_profiles
  FOR SELECT USING (
    is_member_of(organization_id)
    AND has_permission('pricing.supplier.view', organization_id)
  );

CREATE POLICY supplier_profiles_insert ON supplier_profiles
  FOR INSERT WITH CHECK (
    is_member_of(organization_id)
    AND has_permission('pricing.supplier.create', organization_id)
  );

CREATE POLICY supplier_profiles_update ON supplier_profiles
  FOR UPDATE USING (
    is_member_of(organization_id)
    AND has_permission('pricing.supplier.edit', organization_id)
  );

CREATE POLICY supplier_profiles_delete ON supplier_profiles
  FOR DELETE USING (
    is_member_of(organization_id)
    AND has_permission('pricing.supplier.archive', organization_id)
  );

-- ============================================================
-- supplier_catalog_items
-- ============================================================
ALTER TABLE supplier_catalog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY sci_select ON supplier_catalog_items
  FOR SELECT USING (
    is_member_of(organization_id)
    AND has_permission('pricing.supplier.view', organization_id)
  );

CREATE POLICY sci_insert ON supplier_catalog_items
  FOR INSERT WITH CHECK (
    is_member_of(organization_id)
    AND has_permission('pricing.supplier.manage_mappings', organization_id)
  );

CREATE POLICY sci_update ON supplier_catalog_items
  FOR UPDATE USING (
    is_member_of(organization_id)
    AND has_permission('pricing.supplier.manage_mappings', organization_id)
  );

CREATE POLICY sci_delete ON supplier_catalog_items
  FOR DELETE USING (
    is_member_of(organization_id)
    AND has_permission('pricing.supplier.manage_mappings', organization_id)
  );
