-- PRC-03: RLS policies for cost tables, versions, and items

-- ============================================================
-- supplier_cost_tables
-- ============================================================
ALTER TABLE supplier_cost_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY sct_select ON supplier_cost_tables
  FOR SELECT USING (
    is_member_of(organization_id)
    AND has_permission('pricing.cost.view', organization_id)
  );

CREATE POLICY sct_insert ON supplier_cost_tables
  FOR INSERT WITH CHECK (
    is_member_of(organization_id)
    AND has_permission('pricing.cost.create', organization_id)
  );

CREATE POLICY sct_update ON supplier_cost_tables
  FOR UPDATE USING (
    is_member_of(organization_id)
    AND has_permission('pricing.cost.edit', organization_id)
  );

CREATE POLICY sct_delete ON supplier_cost_tables
  FOR DELETE USING (
    is_member_of(organization_id)
    AND has_permission('pricing.cost.archive', organization_id)
  );

-- ============================================================
-- supplier_cost_table_versions
-- ============================================================
ALTER TABLE supplier_cost_table_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY sctv_select ON supplier_cost_table_versions
  FOR SELECT USING (
    is_member_of(organization_id)
    AND has_permission('pricing.cost.view', organization_id)
  );

CREATE POLICY sctv_insert ON supplier_cost_table_versions
  FOR INSERT WITH CHECK (
    is_member_of(organization_id)
    AND has_permission('pricing.cost.create', organization_id)
  );

CREATE POLICY sctv_update ON supplier_cost_table_versions
  FOR UPDATE USING (
    is_member_of(organization_id)
    AND has_permission('pricing.cost.edit', organization_id)
  );

CREATE POLICY sctv_delete ON supplier_cost_table_versions
  FOR DELETE USING (
    is_member_of(organization_id)
    AND has_permission('pricing.cost.archive', organization_id)
  );

-- ============================================================
-- supplier_cost_items
-- ============================================================
ALTER TABLE supplier_cost_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY sci_cost_select ON supplier_cost_items
  FOR SELECT USING (
    is_member_of(organization_id)
    AND has_permission('pricing.cost.view', organization_id)
  );

CREATE POLICY sci_cost_insert ON supplier_cost_items
  FOR INSERT WITH CHECK (
    is_member_of(organization_id)
    AND has_permission('pricing.cost.create', organization_id)
  );

CREATE POLICY sci_cost_update ON supplier_cost_items
  FOR UPDATE USING (
    is_member_of(organization_id)
    AND has_permission('pricing.cost.edit', organization_id)
  );

CREATE POLICY sci_cost_delete ON supplier_cost_items
  FOR DELETE USING (
    is_member_of(organization_id)
    AND has_permission('pricing.cost.archive', organization_id)
  );
