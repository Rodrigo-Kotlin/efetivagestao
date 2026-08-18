-- Migration: 003_core_rbac
-- Descrição: Criação de roles, permissions, role_permissions e membership_roles

-- roles
create table public.roles (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index roles_organization_idx on public.roles (organization_id);

comment on table public.roles is 'Papéis do sistema. organization_id nulo = papel global.';

create trigger set_updated_at
  before update on public.roles
  for each row execute function public.handle_updated_at();

-- permissions
create table public.permissions (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

comment on table public.permissions is 'Permissões granulares do sistema.';

-- role_permissions
create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

comment on table public.role_permissions is 'Relacionamento role x permission.';

-- membership_roles
create table public.membership_roles (
  membership_id uuid not null references public.organization_memberships(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  primary key (membership_id, role_id)
);

comment on table public.membership_roles is 'Papéis atribuídos a uma membership. Permite múltiplos papéis.';
