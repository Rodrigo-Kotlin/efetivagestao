-- Migration: 008_catalog_rls
-- Descrição: RLS e políticas de segurança para as tabelas do catálogo

-- Helper: verificar se usuário tem permissão na organização
create or replace function public.has_permission(permission_code text, org_id uuid)
returns boolean as $$
begin
  return exists (
    select 1
    from public.organization_memberships m
    join public.membership_roles mr on mr.membership_id = m.id
    join public.role_permissions rp on rp.role_id = mr.role_id
    join public.permissions p on p.id = rp.permission_id
    where m.user_id = auth.uid()
      and m.organization_id = org_id
      and m.status = 'active'
      and p.code = permission_code
  );
end;
$$ language plpgsql security definer;

-- ============================================================
-- catalog_categories RLS
-- ============================================================
alter table public.catalog_categories enable row level security;

-- SELECT: member of organization
create policy "catalog_categories_select"
  on public.catalog_categories for select
  using (public.is_member_of(organization_id));

-- INSERT: requires pricing.catalog.manage_categories or pricing.catalog.create
create policy "catalog_categories_insert"
  on public.catalog_categories for insert
  with check (
    public.has_permission('pricing.catalog.manage_categories', organization_id)
    or public.has_permission('pricing.catalog.create', organization_id)
  );

-- UPDATE: requires pricing.catalog.manage_categories or pricing.catalog.edit
create policy "catalog_categories_update"
  on public.catalog_categories for update
  using (
    public.has_permission('pricing.catalog.manage_categories', organization_id)
    or public.has_permission('pricing.catalog.edit', organization_id)
  );

-- DELETE: requires pricing.catalog.manage_categories
create policy "catalog_categories_delete"
  on public.catalog_categories for delete
  using (
    public.has_permission('pricing.catalog.manage_categories', organization_id)
  );

-- ============================================================
-- catalog_items RLS
-- ============================================================
alter table public.catalog_items enable row level security;

-- SELECT: member of organization
create policy "catalog_items_select"
  on public.catalog_items for select
  using (public.is_member_of(organization_id));

-- INSERT: requires pricing.catalog.create
create policy "catalog_items_insert"
  on public.catalog_items for insert
  with check (
    public.has_permission('pricing.catalog.create', organization_id)
  );

-- UPDATE: requires pricing.catalog.edit
create policy "catalog_items_update"
  on public.catalog_items for update
  using (
    public.has_permission('pricing.catalog.edit', organization_id)
  );

-- DELETE: requires pricing.catalog.archive (soft-delete only, but protect hard-delete)
create policy "catalog_items_delete"
  on public.catalog_items for delete
  using (
    public.has_permission('pricing.catalog.archive', organization_id)
  );

-- ============================================================
-- catalog_item_aliases RLS
-- ============================================================
alter table public.catalog_item_aliases enable row level security;

-- SELECT: member of organization
create policy "catalog_aliases_select"
  on public.catalog_item_aliases for select
  using (public.is_member_of(organization_id));

-- INSERT: requires pricing.catalog.edit (aliases managed with item)
create policy "catalog_aliases_insert"
  on public.catalog_item_aliases for insert
  with check (
    public.has_permission('pricing.catalog.edit', organization_id)
  );

-- UPDATE: requires pricing.catalog.edit
create policy "catalog_aliases_update"
  on public.catalog_item_aliases for update
  using (
    public.has_permission('pricing.catalog.edit', organization_id)
  );

-- DELETE: requires pricing.catalog.edit
create policy "catalog_aliases_delete"
  on public.catalog_item_aliases for delete
  using (
    public.has_permission('pricing.catalog.edit', organization_id)
  );
