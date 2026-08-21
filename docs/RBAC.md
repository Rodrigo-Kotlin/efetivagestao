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
| pricing.cost.view | Visualizar Custos | Custos |
| pricing.cost.create | Criar Tabelas e Versões de Custo | Custos |
| pricing.cost.edit | Editar Itens de Custo | Custos |
| pricing.cost.approve | Aprovar Versões de Custo | Custos |
| pricing.cost.publish | Publicar Versões de Custo | Custos |
| pricing.cost.archive | Arquivar Tabelas de Custo | Custos |
| pricing.policy.view | Visualizar Políticas de Preço | Políticas de Preço |
| pricing.policy.create | Criar Políticas de Preço | Políticas de Preço |
| pricing.policy.edit | Editar Políticas de Preço | Políticas de Preço |
| pricing.policy.review | Revisar Políticas de Preço | Políticas de Preço |
| pricing.policy.approve | Aprovar Políticas de Preço | Políticas de Preço |
| pricing.policy.publish | Publicar Políticas de Preço | Políticas de Preço |
| pricing.calculate | Calcular/Simular Preços | Precificação |
| pricing.commercial.view | Visualizar Tabelas Comerciais | Tabelas Comerciais (PRC-05B) |
| pricing.commercial.create | Criar Tabelas Comerciais | Tabelas Comerciais (PRC-05B) |
| pricing.commercial.edit | Editar Tabelas Comerciais | Tabelas Comerciais (PRC-05B) |
| pricing.commercial.review | Revisar Tabelas Comerciais | Tabelas Comerciais (PRC-05B) |
| pricing.commercial.approve | Aprovar Tabelas Comerciais | Tabelas Comerciais (PRC-05B) |
| pricing.commercial.publish | Publicar Tabelas Comerciais | Tabelas Comerciais (PRC-05B) |
| pricing.commercial.exception_approve | Aprovar Exceções Comerciais | Tabelas Comerciais (PRC-05B) |

> O placeholder anterior `pricing.price.publish` foi substituído pelo conjunto `pricing.commercial.*` (decisão PRC-05A — `docs/COMMERCIAL_PRICE_TABLES.md` seção 42).

### Políticas de Preço × Papéis (PRC-04B/C)

| Papel | view | create | edit | review | approve | publish | calculate |
|-------|------|--------|------|--------|---------|---------|-----------|
| admin | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| manager | ✔ | ✔ | ✔ | ✔ | ✔ | — | ✔ |
| operator | — | — | — | — | — | — | ✔ |
| viewer | — | — | — | — | — | — | — |

`pricing.policy.publish` é exclusivo do admin (consistente com `pricing.cost.publish`); operator/viewer não têm permissões de política de preço.
`pricing.calculate` permite executar cálculos/simulações de preço sem necessidade de permissão para criar/publicar políticas.

### Tabelas Comerciais × Papéis (PRC-05B/PRC-05C — IMPLEMENTADO)

| Papel | view | create | edit | review | approve | publish | exception_approve |
|-------|------|--------|------|--------|---------|---------|-------------------|
| admin | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| manager | ✔ | ✔ | ✔ | ✔ | ✔ | — | — |
| operator | ✔ | — | — | — | — | — | — |
| viewer | ✔ | — | — | — | — | — | — |

Mapeamentos reais verificados no banco (migration 033): **admin = 7** permissões · **manager = 5** (sem `publish`, sem `exception_approve`) · **operator = 1** (`view`) · **viewer = 1** (`view`).

Cada permissão é verificada dentro de cada RPC SECURITY DEFINER (não apenas em RLS). O conjunto ativo continua sendo `pricing.commercial.*` após PRC-05C.

> O placeholder legado `pricing.price.publish` **permanece no banco com 0 mapeamentos** (kept para retrocompatibilidade de lookup, marcado como deprecado). Nenhum role possui essa permissão; o conjunto ativo é `pricing.commercial.*`.

### Precificação por Cliente × Papéis (PRC-06B/PRC-06C — IMPLEMENTADO)

Permissões implementadas na migration 038:

| Code | Responsabilidade |
|------|------------------|
| `pricing.client.view` | Visualizar perfis cliente, atribuições e overrides; executar resolvers de componente |
| `pricing.client.create` | Criar perfil cliente (status inicial active) e atribuições/overrides em draft |
| `pricing.client.edit` | Editar perfil/status e registros draft; excluir draft seguro |
| `pricing.client.review` | Submeter, retornar para draft e cancelar under_review |
| `pricing.client.approve` | Aprovar atribuições e overrides |
| `pricing.client.publish` | Publicar e operar cutover temporal |

| Papel | view | create | edit | review | approve | publish |
|-------|------|--------|------|--------|---------|---------|
| admin | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| manager | ✔ | ✔ | ✔ | ✔ | ✔ | — |
| operator | ✔ | — | — | — | — | — |
| viewer | ✔ | — | — | — | — | — |

`pricing.client.publish` é exclusivo do admin, consistente com `pricing.cost.publish`, `pricing.policy.publish` e `pricing.commercial.publish`.

Não haverá `pricing.client.override_approve` em v1: o override é a própria exceção negociada (DEC-059), e `pricing.client.approve` aprova ambos os workflows. Isso não reutiliza `pricing.commercial.exception_approve`, que pertence às violações internas de tabelas PRC-05.

Mapeamentos remotos verificados: **admin = 6**, **manager = 5** (sem publish), **operator = 1** e **viewer = 1**. `pricing.client.override_approve` não foi criada. RLS está ativo nas três entidades; as 16 RPCs públicas PRC-06C revalidam membership e a permissão exata, com ator derivado de `auth.uid()`.

| Operação/Transição | Permissão PRC-06 |
|--------------------|------------------|
| Criar perfil ou draft | `pricing.client.create` |
| Alterar perfil/status, editar/excluir draft, cancelar draft | `pricing.client.edit` |
| Submeter, retornar under_review para draft, cancelar under_review | `pricing.client.review` |
| Aprovar ou cancelar approved | `pricing.client.approve` |
| Publicar, executar cutover e supersessão controlada | `pricing.client.publish` |

Exibir razão social/nome fantasia exige também `core.company.view`; `pricing.client.view` sozinho autoriza apenas a projeção mínima do componente. Capturar baseline exige `pricing.client.edit`, `pricing.client.view` e `pricing.commercial.view`. Toda transição é RPC-only, com gate de banco NULL-safe; nenhum mapeamento autoriza UPDATE direto de status.

## Composição de Permissões — PRC-07

Executar o resolver final exige cumulativamente, na mesma organização:

```text
pricing.client.view
AND pricing.commercial.view
```

PRC-07B deverá revalidar membership e ambas as permissões dentro da RPC `SECURITY DEFINER`. PRC-07C poderá espelhar o mesmo AND apenas para UX; ocultar ação na UI não substitui autorização backend.

O contrato compõe permissões existentes: nenhuma permission row ou role mapping é criada em PRC-07A. Custom roles precisam possuir ambas. Roles padrão já possuem as capacidades de visualização conforme os mapeamentos PRC-05/06 atuais. `pricing.calculate` não é exigida porque resolução final seleciona snapshots comerciais publicados e não calcula/simula preço. `core.company.view` continua necessário somente para enriquecimento com nomes corporativos, ausente do payload mínimo.

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
