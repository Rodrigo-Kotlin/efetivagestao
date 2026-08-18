-- Migration: 010_catalog_rbac
-- Descrição: Permissões e roles do catálogo mestre (idempotente)

-- ============================================================
-- New permissions for catalog CRUD
-- ============================================================
insert into public.permissions (code, name, description)
values
  ('pricing.catalog.create', 'Criar Item do Catálogo', 'Criar novos itens e categorias no catálogo'),
  ('pricing.catalog.edit', 'Editar Item do Catálogo', 'Editar itens, categorias e aliases do catálogo'),
  ('pricing.catalog.archive', 'Arquivar Item do Catálogo', 'Arquivar e inativar itens do catálogo'),
  ('pricing.catalog.manage_categories', 'Gerenciar Categorias', 'Criar, editar, reorganizar e excluir categorias')
on conflict (code) do nothing;

-- ============================================================
-- Role: admin — all catalog permissions
-- ============================================================
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.code = 'admin'
  and p.code in (
    'pricing.catalog.view',
    'pricing.catalog.create',
    'pricing.catalog.edit',
    'pricing.catalog.archive',
    'pricing.catalog.manage_categories'
  )
on conflict do nothing;

-- ============================================================
-- Role: org_admin — all catalog permissions (org-scoped roles)
-- Note: org_admin may be created per-organization; seed handles system roles.
-- For system-level role 'admin', permissions are already assigned above.
-- Additional org-scoped roles will be created per-org at runtime.
-- ============================================================

-- ============================================================
-- Role: manager — view, create, edit
-- ============================================================
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.code = 'manager'
  and p.code in (
    'pricing.catalog.view',
    'pricing.catalog.create',
    'pricing.catalog.edit'
  )
on conflict do nothing;

-- Create manager role if it doesn't exist
insert into public.roles (id, code, name, description, is_system, organization_id)
values
  ('00000000-0000-0000-0000-000000000012', 'manager', 'Gerente', 'Gerente com acesso a criação e edição', true, null)
on conflict (id) do update set name = excluded.name;

-- Re-run manager permissions after ensuring role exists
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.code = 'manager'
  and p.code in (
    'pricing.catalog.view',
    'pricing.catalog.create',
    'pricing.catalog.edit'
  )
on conflict do nothing;

-- ============================================================
-- Role: operator — view only
-- ============================================================
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.code = 'operator'
  and p.code = 'pricing.catalog.view'
on conflict do nothing;

-- Create operator role if it doesn't exist
insert into public.roles (id, code, name, description, is_system, organization_id)
values
  ('00000000-0000-0000-0000-000000000013', 'operator', 'Operador', 'Operador com acesso somente leitura', true, null)
on conflict (id) do update set name = excluded.name;

-- Re-run operator permissions after ensuring role exists
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.code = 'operator'
  and p.code = 'pricing.catalog.view'
on conflict do nothing;

-- ============================================================
-- Role: viewer — view only (backward compatible with existing viewer role)
-- ============================================================
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.code = 'viewer'
  and p.code = 'pricing.catalog.view'
on conflict do nothing;
