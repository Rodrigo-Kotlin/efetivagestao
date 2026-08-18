-- Migration: 009_catalog_code_generation
-- Descrição: Sequências e função para geração segura de código do catálogo

-- ============================================================
-- Prefix mapping via sequences per item_type
-- ============================================================
-- Sequences are schema-scoped. We create one per item_type prefix.
-- Format: <PREFIX>-<6 digits>, e.g. EXA-000001

create sequence if not exists public.catalog_seq_laboratory_exam start with 1;
create sequence if not exists public.catalog_seq_complementary_exam start with 1;
create sequence if not exists public.catalog_seq_radiology start with 1;
create sequence if not exists public.catalog_seq_clinical_procedure start with 1;
create sequence if not exists public.catalog_seq_evaluation start with 1;
create sequence if not exists public.catalog_seq_consultation start with 1;
create sequence if not exists public.catalog_seq_package start with 1;
create sequence if not exists public.catalog_seq_other_service start with 1;

-- ============================================================
-- Helper: item_type → prefix mapping
-- ============================================================
create or replace function public.fn_catalog_item_prefix(p_item_type text)
returns text as $$
begin
  return case p_item_type
    when 'laboratory_exam'      then 'EXA'
    when 'complementary_exam'   then 'EXC'
    when 'radiology'            then 'RAD'
    when 'clinical_procedure'   then 'PROC'
    when 'evaluation'           then 'AVL'
    when 'consultation'         then 'CONS'
    when 'package'              then 'PAC'
    when 'other_service'        then 'SRV'
    else 'SRV'
  end;
end;
$$ language plpgsql immutable;

-- ============================================================
-- Helper: sequence name from item_type
-- ============================================================
create or replace function public.fn_catalog_seq_name(p_item_type text)
returns text as $$
begin
  return 'catalog_seq_' || p_item_type;
end;
$$ language plpgsql immutable;

-- ============================================================
-- Main: generate next catalog code (concurrent-safe via sequences)
-- ============================================================
create or replace function public.fn_catalog_next_code(p_item_type text, p_org_id uuid)
returns text as $$
declare
  prefix text;
  seq_name text;
  next_val bigint;
  code text;
begin
  prefix := public.fn_catalog_item_prefix(p_item_type);
  seq_name := public.fn_catalog_seq_name(p_item_type);

  -- nextval is atomic and concurrent-safe
  next_val := nextval(seq_name);

  code := prefix || '-' || lpad(next_val::text, 6, '0');
  return code;
end;
$$ language plpgsql;
