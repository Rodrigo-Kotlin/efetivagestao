# RBAC — Efetiva Gestão

## Modelo

```
User (auth.users)
  ↓
OrganizationMembership (organization_memberships)
  ↓
MembershipRole (membership_roles)
  ↓
Role (roles)
  ↓
RolePermission (role_permissions)
  ↓
Permission (permissions)
```

## Conceitos

### Roles

- **Globais:** `organization_id = null` — valem para todas as organizações
- **Por organização:** `organization_id` preenchido — customizáveis
- **Sistema:** `is_system = true` — não podem ser excluídas

### Permissions

- Código pontual: `pricing.catalog.view`, `pricing.catalog.create`
- Catálogo aberto — qualquer autenticado pode listar
- Associação a roles controla acesso

### Memberships

- Um usuário pode ter múltiplas memberships (multi-organização)
- Cada membership pode ter múltiplos roles

## Roles Implementadas

| Code | Nome | Tipo | Permissões Catálogo |
|------|------|------|---------------------|
| admin | Administrador | Global (system) | Todas |
| manager | Gerente | Global (system) | view, create, edit |
| operator | Operador | Global (system) | view |
| viewer | Visualizador | Global (system) | view |

## Permissões Implementadas

| Code | Nome | Domínio |
|------|------|---------|
| system.admin | Administração do Sistema | Sistema |
| pricing.catalog.view | Visualizar Catálogo | Catálogo |
| pricing.catalog.create | Criar Item do Catálogo | Catálogo |
| pricing.catalog.edit | Editar Item do Catálogo | Catálogo |
| pricing.catalog.archive | Arquivar Item do Catálogo | Catálogo |
| pricing.catalog.manage_categories | Gerenciar Categorias | Catálogo |
| pricing.supplier.view | Visualizar Fornecedores | Fornecedores |
| pricing.supplier.create | Criar Fornecedor | Fornecedores |
| pricing.supplier.edit | Editar Fornecedor | Fornecedores |
| pricing.supplier.delete | Excluir Fornecedor | Fornecedores |
| pricing.supplier.map | Mapear Itens de Fornecedor | Fornecedores |
| pricing.cost.view | Visualizar Custos | Custos (futuro) |
| pricing.price.publish | Publicar Preços | Preços (futuro) |

### Permissões Futuras (NÃO implementadas)

Permissões de outros domínios (CRM, Financeiro, SST, etc.) serão adicionadas quando cada módulo for implementado.

## Uso no Frontend

```tsx
const { can, hasRole } = useAuth();

// UX: ocultar/mostrar elementos
if (can("pricing.catalog.view")) {
  // mostrar link
}

// Isso NÃO substitui RLS
```

## Uso no Banco (RLS)

```sql
-- Helper: verificar permissão
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

-- Exemplo: policy de catálogo
create policy "catalog_items_select"
  on public.catalog_items for select
  using (public.is_member_of(organization_id));

create policy "catalog_items_insert"
  on public.catalog_items for insert
  with check (
    public.has_permission('pricing.catalog.create', organization_id)
  );
```
