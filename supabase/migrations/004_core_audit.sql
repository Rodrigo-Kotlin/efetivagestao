-- Migration: 004_core_audit
-- Descrição: Criação de audit_logs para rastreabilidade

create table public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references public.organizations(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  reason text,
  request_context jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_organization_idx on public.audit_logs (organization_id);
create index audit_logs_actor_idx on public.audit_logs (actor_user_id);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

comment on table public.audit_logs is 'Log de auditoria append-only. Rastreabilidade de ações.';

-- Impedir UPDATE e DELETE em audit_logs
create or replace function public.prevent_audit_modification()
returns trigger as $$
begin
  raise exception 'audit_logs é append-only. Não é permitido UPDATE ou DELETE.';
end;
$$ language plpgsql;

create trigger audit_logs_no_update
  before update on public.audit_logs
  for each row execute function public.prevent_audit_modification();

create trigger audit_logs_no_delete
  before delete on public.audit_logs
  for each row execute function public.prevent_audit_modification();
