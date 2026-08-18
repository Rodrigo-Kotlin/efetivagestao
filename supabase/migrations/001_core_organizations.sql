-- Migration: 001_core_organizations
-- Descrição: Criação da tabela organizations e estrutura base de legal_entities e business_units

create extension if not exists "uuid-ossp";

-- organizations
create table public.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index organizations_slug_idx on public.organizations (slug);

comment on table public.organizations is 'Organizações/empresas do sistema. Base para multi-tenant.';

-- legal_entities
create table public.legal_entities (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  legal_name text not null,
  trade_name text,
  tax_id text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index legal_entities_organization_idx on public.legal_entities (organization_id);

comment on table public.legal_entities is 'Pessoas jurídicas vinculadas a uma organização.';

-- business_units
create table public.business_units (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  legal_entity_id uuid not null references public.legal_entities(id) on delete cascade,
  name text not null,
  code text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index business_units_organization_idx on public.business_units (organization_id);
create index business_units_legal_entity_idx on public.business_units (legal_entity_id);

comment on table public.business_units is 'Unidades de negócio dentro de uma pessoa jurídica.';

-- Trigger para updated_at automático
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on public.organizations
  for each row execute function public.handle_updated_at();

create trigger set_updated_at
  before update on public.legal_entities
  for each row execute function public.handle_updated_at();

create trigger set_updated_at
  before update on public.business_units
  for each row execute function public.handle_updated_at();
