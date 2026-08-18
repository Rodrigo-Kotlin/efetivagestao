-- Migration: 007_catalog_tables
-- Descrição: Tabelas do catálogo mestre — categorias, itens e aliases

-- ============================================================
-- catalog_categories
-- ============================================================
create table public.catalog_categories (
  id             uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  parent_id      uuid null references public.catalog_categories(id),
  code           text not null,
  name           text not null,
  description    text null,
  sort_order     integer not null default 0,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint catalog_categories_org_code_unique
    unique (organization_id, code)
);

create index idx_catalog_categories_org
  on public.catalog_categories (organization_id);

create index idx_catalog_categories_parent
  on public.catalog_categories (parent_id);

create index idx_catalog_categories_org_parent
  on public.catalog_categories (organization_id, parent_id);

-- Prevent self-referencing parent
create or replace function public.fn_catalog_category_no_self_parent()
returns trigger as $$
begin
  if NEW.parent_id = NEW.id then
    raise exception 'Categoria não pode ser pai de si mesma';
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger trg_catalog_category_no_self_parent
  before insert or update on public.catalog_categories
  for each row execute function public.fn_catalog_category_no_self_parent();

-- Prevent cross-organization parent
create or replace function public.fn_catalog_category_parent_same_org()
returns trigger as $$
declare
  parent_org uuid;
begin
  if NEW.parent_id is not null then
    select organization_id into parent_org
    from public.catalog_categories
    where id = NEW.parent_id;

    if parent_org is null then
      raise exception 'Categoria pai não encontrada';
    end if;

    if parent_org != NEW.organization_id then
      raise exception 'Categoria pai pertence a outra organização';
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger trg_catalog_category_parent_same_org
  before insert or update on public.catalog_categories
  for each row execute function public.fn_catalog_category_parent_same_org();

-- Prevent hierarchy cycles (max depth 10)
create or replace function public.fn_catalog_category_no_cycle()
returns trigger as $$
declare
  current_id uuid;
  depth integer := 0;
  max_depth constant integer := 10;
begin
  if NEW.parent_id is null then
    return NEW;
  end if;

  current_id := NEW.parent_id;
  while current_id is not null and depth < max_depth loop
    if current_id = NEW.id then
      raise exception 'Ciclo detectado na hierarquia de categorias';
    end if;

    select parent_id into current_id
    from public.catalog_categories
    where id = current_id;

    depth := depth + 1;
  end loop;

  return NEW;
end;
$$ language plpgsql;

create trigger trg_catalog_category_no_cycle
  before insert or update on public.catalog_categories
  for each row execute function public.fn_catalog_category_no_cycle();

-- Auto-update updated_at
create or replace function public.fn_set_updated_at()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

create trigger trg_catalog_categories_updated_at
  before update on public.catalog_categories
  for each row execute function public.fn_set_updated_at();

-- Soft-delete prevention: block DELETE if category has children
create or replace function public.fn_catalog_category_no_delete_if_children()
returns trigger as $$
begin
  if exists (
    select 1 from public.catalog_categories
    where parent_id = OLD.id
  ) then
    raise exception 'Não é possível excluir categoria que possui subcategorias. Inative-a ao invés.';
  end if;
  return OLD;
end;
$$ language plpgsql;

create trigger trg_catalog_category_no_delete_if_children
  before delete on public.catalog_categories
  for each row execute function public.fn_catalog_category_no_delete_if_children();

-- ============================================================
-- catalog_items
-- ============================================================
create table public.catalog_items (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  code            text not null,
  legacy_code     text null,
  item_type       text not null
                    check (item_type in (
                      'laboratory_exam',
                      'complementary_exam',
                      'radiology',
                      'clinical_procedure',
                      'evaluation',
                      'consultation',
                      'package',
                      'other_service'
                    )),
  category_id     uuid null references public.catalog_categories(id),
  name            text not null,
  short_name      text null,
  description     text null,
  commercial_unit text not null,
  execution_type  text not null
                    check (execution_type in ('own', 'outsourced', 'hybrid')),
  status          text not null default 'draft'
                    check (status in ('draft', 'active', 'inactive', 'archived')),
  activated_at    timestamptz null,
  deactivated_at  timestamptz null,
  notes           text null,
  created_by      uuid not null references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_by      uuid not null references auth.users(id),
  updated_at      timestamptz not null default now(),
  archived_at     timestamptz null,
  archived_by     uuid null,

  constraint catalog_items_org_code_unique
    unique (organization_id, code)
);

create index idx_catalog_items_org
  on public.catalog_items (organization_id);

create index idx_catalog_items_code
  on public.catalog_items (organization_id, code);

create index idx_catalog_items_status
  on public.catalog_items (organization_id, status);

create index idx_catalog_items_type
  on public.catalog_items (organization_id, item_type);

create index idx_catalog_items_category
  on public.catalog_items (category_id);

create index idx_catalog_items_legacy_code
  on public.catalog_items (organization_id, legacy_code)
  where legacy_code is not null;

-- Normalized name index for search
create index idx_catalog_items_name_normalized
  on public.catalog_items (
    organization_id,
    lower(regexp_replace(regexp_replace(name, '\s+', ' ', 'g'), '^\s+|\s+$', '', 'g'))
  );

-- Auto-update updated_at
create trigger trg_catalog_items_updated_at
  before update on public.catalog_items
  for each row execute function public.fn_set_updated_at();

-- Prevent category from different organization
create or replace function public.fn_catalog_item_category_same_org()
returns trigger as $$
declare
  cat_org uuid;
begin
  if NEW.category_id is not null then
    select organization_id into cat_org
    from public.catalog_categories
    where id = NEW.category_id;

    if cat_org is null then
      raise exception 'Categoria não encontrada';
    end if;

    if cat_org != NEW.organization_id then
      raise exception 'Categoria pertence a outra organização';
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger trg_catalog_item_category_same_org
  before insert or update on public.catalog_items
  for each row execute function public.fn_catalog_item_category_same_org();

-- Prevent deletion of items with aliases
create or replace function public.fn_catalog_item_no_delete_if_aliases()
returns trigger as $$
begin
  if exists (
    select 1 from public.catalog_item_aliases
    where catalog_item_id = OLD.id
  ) then
    raise exception 'Não é possível excluir item com aliases associados';
  end if;
  return OLD;
end;
$$ language plpgsql;

create trigger trg_catalog_item_no_delete_if_aliases
  before delete on public.catalog_items
  for each row execute function public.fn_catalog_item_no_delete_if_aliases();

-- ============================================================
-- catalog_item_aliases
-- ============================================================
create table public.catalog_item_aliases (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id),
  catalog_item_id  uuid not null references public.catalog_items(id),
  source_type      text not null
                     check (source_type in ('manual', 'legacy', 'internal')),
  original_name    text not null,
  normalized_name  text not null,
  is_confirmed     boolean not null default true,
  confirmed_by     uuid null references auth.users(id),
  confirmed_at     timestamptz null,
  created_at       timestamptz not null default now(),

  constraint catalog_item_aliases_item_unique
    unique (catalog_item_id, normalized_name)
);

create index idx_catalog_aliases_org
  on public.catalog_item_aliases (organization_id);

create index idx_catalog_aliases_item
  on public.catalog_item_aliases (catalog_item_id);

create index idx_catalog_aliases_normalized
  on public.catalog_item_aliases (organization_id, normalized_name);

-- Prevent alias for item from different organization
create or replace function public.fn_catalog_alias_item_same_org()
returns trigger as $$
declare
  item_org uuid;
begin
  select organization_id into item_org
  from public.catalog_items
  where id = NEW.catalog_item_id;

  if item_org is null then
    raise exception 'Item do catálogo não encontrado';
  end if;

  if item_org != NEW.organization_id then
    raise exception 'Item pertence a outra organização';
  end if;

  return NEW;
end;
$$ language plpgsql;

create trigger trg_catalog_alias_item_same_org
  before insert or update on public.catalog_item_aliases
  for each row execute function public.fn_catalog_alias_item_same_org();
