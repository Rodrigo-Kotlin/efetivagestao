-- Migration: 005_core_rls
-- Descrição: Habilitação de RLS e políticas base para todas as tabelas

-- Habilitar RLS em todas as tabelas
alter table public.organizations enable row level security;
alter table public.legal_entities enable row level security;
alter table public.business_units enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.membership_roles enable row level security;
alter table public.audit_logs enable row level security;

-- Helper: verificar membership ativa em uma organização
create or replace function public.is_member_of(org_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.organization_memberships
    where user_id = auth.uid()
      and organization_id = org_id
      and status = 'active'
  );
end;
$$ language plpgsql security definer;

-- profiles: o usuário vê apenas seu próprio perfil
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

-- organizations: o usuário vê organizações das quais é membro
create policy "organizations_select_member"
  on public.organizations for select
  using (public.is_member_of(id));

-- legal_entities: membro da organização pode ver
create policy "legal_entities_select_member"
  on public.legal_entities for select
  using (public.is_member_of(organization_id));

-- business_units: membro da organização pode ver
create policy "business_units_select_member"
  on public.business_units for select
  using (public.is_member_of(organization_id));

-- organization_memberships: membro vê memberships da sua organização
create policy "memberships_select_own_org"
  on public.organization_memberships for select
  using (
    user_id = auth.uid()
    or public.is_member_of(organization_id)
  );

-- roles: membro vê roles globais e da sua organização
create policy "roles_select"
  on public.roles for select
  using (
    organization_id is null
    or public.is_member_of(organization_id)
  );

-- permissions: qualquer membro autenticado pode ver permissões (são apenas catálogo)
create policy "permissions_select_authenticated"
  on public.permissions for select
  using (auth.uid() is not null);

-- role_permissions: seguir lógica da role pai
create policy "role_permissions_select"
  on public.role_permissions for select
  using (
    exists (
      select 1 from public.roles r
      where r.id = role_permissions.role_id
        and (r.organization_id is null or public.is_member_of(r.organization_id))
    )
  );

-- membership_roles: seguir lógica da membership
create policy "membership_roles_select"
  on public.membership_roles for select
  using (
    exists (
      select 1 from public.organization_memberships m
      where m.id = membership_roles.membership_id
        and (m.user_id = auth.uid() or public.is_member_of(m.organization_id))
    )
  );

-- audit_logs: membro vê logs da sua organização; actor vê seus próprios
create policy "audit_logs_select"
  on public.audit_logs for select
  using (
    public.is_member_of(organization_id)
    or actor_user_id = auth.uid()
  );

-- Permissões de INSERT para service role (backend/admin)
-- Policies de INSERT/UPDATE/DELETE ficam com permissões restritas
-- Em produção, usar service_role key ou funções SECURITY DEFINER

-- Inserts em audit_logs: apenas via service_role (sem policy de INSERT pública)
-- Inserts em organizations: apenas via service_role
-- etc.
