# Custos e Versionamento — PRC-03

## Visão Geral

Módulo de gerenciamento de custos de exames e serviços por fornecedor, com versionamento temporal, workflow de aprovação e imutabilidade após publicação.

## Estrutura de Tabelas

```
supplier_cost_tables           — registro de tabelas de custo por fornecedor
  └── supplier_cost_table_versions  — versões com vigência e workflow
        └── supplier_cost_items       — itens de custo por versão
```

## Workflow de Versões

```
draft → under_review → approved → scheduled/active → superseded
                                                   → cancelled
```

- **draft**: versão em criação, itens editáveis
- **under_review**: enviada para revisão (requer pelo menos 1 item)
- **approved**: aprovada por usuário com permissão `pricing.cost.approve`
- **active**: publicada e vigente (valid_from <= today)
- **scheduled**: publicada mas futura (valid_from > today)
- **superseded**: substituída por nova versão publicada
- **cancelled**: cancelada antes da publicação

## Regras de Negócio

- **Custo zero ≠ desconhecido**: `cost_status = 'confirmed_zero'` requer `amount = 0`; `not_provided` é NULL
- **Precisão**: `numeric(14,4)` — nunca float
- **Vigência**: `[valid_from, valid_to)` — início inclusivo, fim exclusivo
- **Imutabilidade**: itens em versões `active` ou `superseded` não podem ser alterados
- **Sobreposição**: apenas 1 versão `active` ou `scheduled` por tabela de custo com vigência sobreposta
- **Resolução**: `fn_resolve_supplier_cost` retorna o custo vigente mais recente para um item (date-driven, inclui versões `scheduled`)
- **Transições de status só via RPC**: nenhum UPDATE direto de `status` é permitido pelo frontend — `fn_submit_cost_version`, `fn_approve_cost_version` e `fn_publish_cost_version` são o único caminho (RLS bloqueia com `app.cost_rpc_active`)

## RPCs

| RPC | Descrição |
|-----|-----------|
| `fn_create_cost_table` | Criar tabela de custo para fornecedor |
| `fn_create_cost_version` | Criar versão (auto-version_number) |
| `fn_submit_cost_version` | Enviar draft para revisão |
| `fn_approve_cost_version` | Aprovar versão em revisão |
| `fn_publish_cost_version` | Publicar versão aprovada |
| `fn_sync_cost_version_status` | Cutover idempotente scheduled → active para uma data de referência |
| `fn_resolve_supplier_cost` | Resolver custo vigente para item |
| `fn_get_version_items` | Listar itens de uma versão |
| `fn_get_cost_stats` | Estatísticas para dashboard |

## Frontend × RPC

A camada de API (`src/features/pricing/costs/api/costs.ts`) expõe apenas funções que chamam as RPCs:

| Função frontend | RPC backend | Permissão exigida |
|-----------------|-------------|-------------------|
| `submitCostVersion` | `fn_submit_cost_version` | `pricing.cost.create` |
| `approveCostVersion` | `fn_approve_cost_version` | `pricing.cost.approve` |
| `publishCostVersion` | `fn_publish_cost_version` | `pricing.cost.publish` |
| `syncCostVersionStatus` | `fn_sync_cost_version_status` | qualquer membro autenticado |

- Hooks `useSubmitCostVersion` / `useApproveCostVersion` / `usePublishCostVersion` / `useSyncCostVersionStatus` em `src/features/pricing/costs/hooks/useCosts.ts` (com estado de loading/erro e guarda anti-duplicidade).
- Botões na página de detalhe da versão dependem de status **e** permissão RBAC (via `can()`); estados `scheduled`/`active`/`superseded`/`cancelled` são somente leitura.
- Erros de RPC são mapeados para mensagens amigáveis (`mapCostWorkflowError`).
- Status canônico: `COST_VERSION_STATUSES` em `src/types/index.ts` (draft, under_review, approved, scheduled, active, superseded, cancelled).

## Permissões

| Permissão | admin | manager | operator | viewer |
|-----------|-------|---------|----------|--------|
| pricing.cost.view | ✓ | ✓ | — | — |
| pricing.cost.create | ✓ | ✓ | — | — |
| pricing.cost.edit | ✓ | ✓ | — | — |
| pricing.cost.approve | ✓ | ✓ | — | — |
| pricing.cost.publish | ✓ | — | — | — |
| pricing.cost.archive | ✓ | — | — | — |

## RLS Policies

- **SELECT**: `is_member_of(org) AND has_permission('pricing.cost.view', org)`
- **INSERT**: `is_member_of(org) AND has_permission('pricing.cost.create', org)`
- **UPDATE**: `is_member_of(org) AND has_permission('pricing.cost.edit', org)`
- **DELETE**: `is_member_of(org) AND has_permission('pricing.cost.archive', org)`

## Rotas

| Rota | Página |
|------|--------|
| `/pricing/costs` | Lista de tabelas de custo |
| `/pricing/costs/new` | Nova tabela de custo |
| `/pricing/costs/:id` | Detalhe da tabela + versões |
| `/pricing/costs/:id/versions/new` | Nova versão |
| `/pricing/costs/versions/:id` | Detalhe da versão + itens |

## Migrations

| # | Descrição |
|---|-----------|
| 018 | supplier_cost_tables + supplier active check |
| 019 | supplier_cost_table_versions + overlap check |
| 020 | supplier_cost_items + immutability + mapping integrity |
| 021 | RLS policies (12 policies) |
| 022 | RBAC permissions (6) + audit triggers + RPCs (8) |
| 023 | Cost integrity hardening (strict cost_status, no direct status UPDATE, EXCLUDE temporal, secure RPCs) |
| 024 | H13 fix — scheduled publish mantém predecessor ativo |
| 025 | Temporal cutover finalization (publish v8, resolver com scheduled, fn_sync_cost_version_status) |
