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

- Código pontual: `pricing.catalog.view`, `pricing.price.publish`
- Catálogo aberto — qualquer autenticado pode listar
- Associação a roles controla acesso

### Memberships

- Um usuário pode ter múltiplas memberships (multi-organização)
- Cada membership pode ter múltiplos roles

## Estado Atual (PRC-00)

### Roles Implementadas

| Code | Nome | Tipo |
|------|------|------|
| admin | Administrador | Global (system) |
| viewer | Visualizador | Global (system) |

### Permissões Implementadas

| Code | Nome |
|------|------|
| system.admin | Administração do Sistema |
| pricing.catalog.view | Visualizar Catálogo |
| pricing.cost.view | Visualizar Custos |
| pricing.price.publish | Publicar Preços |

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
-- Exemplo: policy futura de pricing
create policy "pricing_catalog_view"
  on public.catalog_items for select
  using (
    public.is_member_of(organization_id)
    and exists (
      select 1 from public.organization_memberships m
      join public.membership_roles mr on mr.membership_id = m.id
      join public.role_permissions rp on rp.role_id = mr.role_id
      join public.permissions p on p.id = rp.permission_id
      where m.user_id = auth.uid()
        and p.code = 'pricing.catalog.view'
        and m.status = 'active'
    )
  );
```
