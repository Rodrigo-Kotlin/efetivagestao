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
- **Resolução**: `fn_resolve_supplier_cost` retorna o custo vigente mais recente para um item

## RPCs

| RPC | Descrição |
|-----|-----------|
| `fn_create_cost_table` | Criar tabela de custo para fornecedor |
| `fn_create_cost_version` | Criar versão (auto-version_number) |
| `fn_submit_cost_version` | Enviar draft para revisão |
| `fn_approve_cost_version` | Aprovar versão em revisão |
| `fn_publish_cost_version` | Publicar versão aprovada |
| `fn_resolve_supplier_cost` | Resolver custo vigente para item |
| `fn_get_version_items` | Listar itens de uma versão |
| `fn_get_cost_stats` | Estatísticas para dashboard |

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
