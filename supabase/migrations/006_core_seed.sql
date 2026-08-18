-- Migration: 006_core_seed
-- Descrição: Seed inicial para ambiente de desenvolvimento
-- ATENÇÃO: Este seed é idempotente e seguro para execução repetida

-- Organization: EFETIVA
insert into public.organizations (id, name, slug, status)
values (
  '00000000-0000-0000-0000-000000000001',
  'EFETIVA',
  'efetiva',
  'active'
)
on conflict (id) do update set name = excluded.name;

-- Legal Entity: Efetiva Segurança e Saúde do Trabalho
insert into public.legal_entities (id, organization_id, legal_name, trade_name, status)
values (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Efetiva Segurança e Saúde do Trabalho',
  'Efetiva SST',
  'active'
)
on conflict (id) do update set legal_name = excluded.legal_name;

-- Legal Entity: Efetiva Saúde
insert into public.legal_entities (id, organization_id, legal_name, trade_name, status)
values (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'Efetiva Saúde',
  'Efetiva Saúde',
  'active'
)
on conflict (id) do update set legal_name = excluded.legal_name;

-- Roles globais do sistema
insert into public.roles (id, code, name, description, is_system, organization_id)
values
  ('00000000-0000-0000-0000-000000000010', 'admin', 'Administrador', 'Acesso total ao sistema', true, null),
  ('00000000-0000-0000-0000-000000000011', 'viewer', 'Visualizador', 'Acesso somente leitura', true, null)
on conflict (id) do update set name = excluded.name;

-- Permissões base (início da fundação, sem exaurir domínios futuros)
insert into public.permissions (code, name, description)
values
  ('system.admin', 'Administração do Sistema', 'Acesso administrativo completo'),
  ('pricing.catalog.view', 'Visualizar Catálogo', 'Visualizar itens do catálogo de preços'),
  ('pricing.cost.view', 'Visualizar Custos', 'Visualizar custos de exames e serviços'),
  ('pricing.price.publish', 'Publicar Preços', 'Publicar e gerenciar tabelas de preços')
on conflict (code) do nothing;

-- Vincular permissão de admin à role admin
insert into public.role_permissions (role_id, permission_id)
select
  '00000000-0000-0000-0000-000000000010',
  id
from public.permissions
where code = 'system.admin'
on conflict do nothing;
