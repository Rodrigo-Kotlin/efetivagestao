-- Migration: 002_core_memberships
-- Descrição: Criação de profiles e organization_memberships

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Perfil do usuário vinculado ao auth.users.';

create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- organization_memberships
create table public.organization_memberships (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index membership_org_user_idx on public.organization_memberships (organization_id, user_id);
create index membership_user_idx on public.organization_memberships (user_id);

comment on table public.organization_memberships is 'Vincula usuários a organizações. Permite multi-organização.';

create trigger set_updated_at
  before update on public.organization_memberships
  for each row execute function public.handle_updated_at();
