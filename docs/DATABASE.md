# Banco de Dados — Efetiva Gestão

## Convenções

- **IDs:** `uuid` (primary key)
- **Timestamps:** `timestamptz` para eventos
- **Dinheiro:** `numeric(14,4)` (nunca float)
- **Vigências futuras:** `[valid_from, valid_to)` — início inclusivo, fim exclusivo
- **Soft delete:** `status` text com check constraint (quando aplicável)
- **updated_at:** Trigger automático `handle_updated_at()`

## Tabelas (PRC-00)

### organizations
| Coluna | Tipo | Constraints |
|--------|------|------------|
| id | uuid | PK, default uuid_generate_v4() |
| name | text | NOT NULL |
| slug | text | NOT NULL, UNIQUE |
| status | text | NOT NULL, default 'active', CHECK |
| created_at | timestamptz | NOT NULL, default now() |
| updated_at | timestamptz | NOT NULL, trigger |

### legal_entities
| Coluna | Tipo | Constraints |
|--------|------|------------|
| id | uuid | PK |
| organization_id | uuid | FK → organizations, ON DELETE CASCADE |
| legal_name | text | NOT NULL |
| trade_name | text | nullable |
| tax_id | text | nullable |
| status | text | NOT NULL, default 'active' |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL, trigger |

### business_units
| Coluna | Tipo | Constraints |
|--------|------|------------|
| id | uuid | PK |
| organization_id | uuid | FK → organizations, ON DELETE CASCADE |
| legal_entity_id | uuid | FK → legal_entities, ON DELETE CASCADE |
| name | text | NOT NULL |
| code | text | nullable |
| status | text | NOT NULL, default 'active' |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL, trigger |

### profiles
| Coluna | Tipo | Constraints |
|--------|------|------------|
| id | uuid | PK, FK → auth.users(id) |
| full_name | text | nullable |
| status | text | NOT NULL, default 'active' |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL, trigger |

### organization_memberships
| Coluna | Tipo | Constraints |
|--------|------|------------|
| id | uuid | PK |
| organization_id | uuid | FK → organizations |
| user_id | uuid | FK → auth.users |
| status | text | NOT NULL, default 'active', CHECK |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL, trigger |

**Unique:** (organization_id, user_id)

### roles
| Coluna | Tipo | Constraints |
|--------|------|------------|
| id | uuid | PK |
| organization_id | uuid | FK → organizations, nullable |
| code | text | NOT NULL |
| name | text | NOT NULL |
| description | text | nullable |
| is_system | boolean | NOT NULL, default false |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL, trigger |

### permissions
| Coluna | Tipo | Constraints |
|--------|------|------------|
| id | uuid | PK |
| code | text | NOT NULL, UNIQUE |
| name | text | NOT NULL |
| description | text | nullable |
| created_at | timestamptz | NOT NULL |

### role_permissions
| Coluna | Tipo | Constraints |
|--------|------|------------|
| role_id | uuid | FK → roles, ON DELETE CASCADE |
| permission_id | uuid | FK → permissions, ON DELETE CASCADE |

**PK:** (role_id, permission_id)

### membership_roles
| Coluna | Tipo | Constraints |
|--------|------|------------|
| membership_id | uuid | FK → organization_memberships, ON DELETE CASCADE |
| role_id | uuid | FK → roles, ON DELETE CASCADE |

**PK:** (membership_id, role_id)

### audit_logs
| Coluna | Tipo | Constraints |
|--------|------|------------|
| id | uuid | PK |
| organization_id | uuid | FK → organizations, nullable |
| actor_user_id | uuid | FK → auth.users, nullable |
| action | text | NOT NULL |
| entity_type | text | NOT NULL |
| entity_id | uuid | nullable |
| old_data | jsonb | nullable |
| new_data | jsonb | nullable |
| reason | text | nullable |
| request_context | jsonb | nullable |
| created_at | timestamptz | NOT NULL, default now() |

**Append-only:** Triggers impedem UPDATE e DELETE.

## Tabelas (PRC-01 — Catálogo Mestre)

### catalog_categories
| Coluna | Tipo | Constraints |
|--------|------|------------|
| id | uuid | PK |
| organization_id | uuid | FK → organizations, NOT NULL |
| parent_id | uuid | FK → catalog_categories, nullable |
| code | text | NOT NULL |
| name | text | NOT NULL |
| description | text | nullable |
| sort_order | integer | NOT NULL, default 0 |
| is_active | boolean | NOT NULL, default true |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL, trigger |

**Unique:** (organization_id, code)
**Triggers:** Self-parent check, cross-org parent check, cycle detection (max depth 10), delete-if-children protection, updated_at.

### catalog_items
| Coluna | Tipo | Constraints |
|--------|------|------------|
| id | uuid | PK |
| organization_id | uuid | FK → organizations, NOT NULL |
| code | text | NOT NULL |
| legacy_code | text | nullable |
| item_type | text | NOT NULL, CHECK (8 values) |
| category_id | uuid | FK → catalog_categories, nullable |
| name | text | NOT NULL |
| short_name | text | nullable |
| description | text | nullable |
| commercial_unit | text | NOT NULL |
| execution_type | text | NOT NULL, CHECK (own/outsourced/hybrid) |
| status | text | NOT NULL, default 'draft', CHECK (draft/active/inactive/archived) |
| activated_at | timestamptz | nullable |
| deactivated_at | timestamptz | nullable |
| notes | text | nullable |
| created_by | uuid | FK → auth.users, NOT NULL |
| created_at | timestamptz | NOT NULL |
| updated_by | uuid | FK → auth.users, NOT NULL |
| updated_at | timestamptz | NOT NULL, trigger |
| archived_at | timestamptz | nullable |
| archived_by | uuid | nullable |

**Unique:** (organization_id, code)
**Triggers:** Category same-org check, delete-if-aliases protection, updated_at.
**Indexes:** organization, code, status, type, category, legacy_code, normalized_name.

### catalog_item_aliases
| Coluna | Tipo | Constraints |
|--------|------|------------|
| id | uuid | PK |
| organization_id | uuid | FK → organizations, NOT NULL |
| catalog_item_id | uuid | FK → catalog_items, NOT NULL |
| source_type | text | NOT NULL, CHECK (manual/legacy/internal) |
| original_name | text | NOT NULL |
| normalized_name | text | NOT NULL |
| is_confirmed | boolean | NOT NULL, default true |
| confirmed_by | uuid | FK → auth.users, nullable |
| confirmed_at | timestamptz | nullable |
| created_at | timestamptz | NOT NULL |

**Unique:** (catalog_item_id, normalized_name)
**Triggers:** Item same-org check.

## Tabelas (PRC-02 — Fornecedores e Mapeamentos)

### companies
| Coluna | Tipo | Constraints |
|--------|------|------------|
| id | uuid | PK, default uuid_generate_v4() |
| organization_id | uuid | FK → organizations, NOT NULL |
| legal_name | text | NOT NULL |
| legal_name_normalized | text | NOT NULL |
| trade_name | text | nullable |
| tax_id | text | nullable |
| status | text | NOT NULL, default 'active', CHECK (active/inactive/blocked) |
| created_by | uuid | FK → auth.users, NOT NULL |
| created_at | timestamptz | NOT NULL |
| updated_by | uuid | FK → auth.users, NOT NULL |
| updated_at | timestamptz | NOT NULL, trigger |

**Unique:** (organization_id, tax_id) WHERE tax_id IS NOT NULL AND status = 'active'
**Triggers:** Audit (INSERT/UPDATE/DELETE), updated_at.

### supplier_profiles
| Coluna | Tipo | Constraints |
|--------|------|------------|
| company_id | uuid | PK, FK → companies(id), ON DELETE CASCADE |
| organization_id | uuid | FK → organizations(id), NOT NULL |
| supplier_category | text | NOT NULL, CHECK (5 values) |
| status | text | NOT NULL, default 'active', CHECK (active/inactive/blocked) |
| contract_reference | text | nullable |
| payment_terms | text | nullable |
| notes | text | nullable |
| created_by | uuid | FK → auth.users, NOT NULL |
| created_at | timestamptz | NOT NULL |
| updated_by | uuid | FK → auth.users, NOT NULL |
| updated_at | timestamptz | NOT NULL, trigger |

**Triggers:** Organization matches company check, audit, updated_at.

### supplier_catalog_items
| Coluna | Tipo | Constraints |
|--------|------|------------|
| id | uuid | PK, default uuid_generate_v4() |
| organization_id | uuid | FK → organizations, NOT NULL |
| supplier_company_id | uuid | FK → companies, NOT NULL |
| catalog_item_id | uuid | FK → catalog_items, NOT NULL |
| external_code | text | nullable |
| external_name | text | NOT NULL |
| external_name_normalized | text | NOT NULL |
| external_unit | text | nullable |
| is_preferred | boolean | NOT NULL, default false |
| status | text | NOT NULL, default 'active', CHECK (active/inactive) |
| valid_from | date | nullable |
| valid_to | date | nullable |
| notes | text | nullable |
| created_by | uuid | FK → auth.users, NOT NULL |
| created_at | timestamptz | NOT NULL |
| updated_by | uuid | FK → auth.users, NOT NULL |
| updated_at | timestamptz | NOT NULL, trigger |

**Unique:** (supplier_company_id, catalog_item_id, external_unit) WHERE status = 'active'
**Check:** valid_to > valid_from (both not null)
**Check:** external_unit NOT NULL WHEN is_preferred = true
**Triggers:** Company same-org check, catalog item same-org check, unique preferred per supplier+item, audit, updated_at.

### Extensão de catalog_item_aliases (PRC-02)
| Coluna adicional | Tipo | Constraints |
|------------------|------|------------|
| source_company_id | uuid | nullable, FK → companies |
| supplier_catalog_item_id | uuid | nullable, FK → supplier_catalog_items |
| external_code | text | nullable |

**Triggers:** `fn_alias_supplier_source_integrity` valida integridade; proteção de exclusão de mapeamento com alias vinculado.

## Tabelas (PRC-04B - Políticas de Preço)

### pricing_policies

Identidade estável de uma política de preço. Não armazena valores de cálculo (ficam nas versões).

| Coluna | Tipo | Observações |
|--------|------|-------------|
| id | uuid PK | default gen_random_uuid() |
| organization_id | uuid FK → organizations | tenant |
| code | text | UNIQUE (organization_id, code) |
| name | text | |
| description | text | |
| scope_type | text | `default` \| `category` \| `catalog_item` |
| catalog_category_id | uuid FK → catalog_categories | só para scope_type = category |
| catalog_item_id | uuid FK → catalog_items | só para scope_type = catalog_item |
| status | text | `active` \| `inactive` |
| created_by / created_at | uuid FK / timestamptz | |
| updated_by / updated_at | uuid FK / timestamptz | trigger fn_set_updated_at |

**Integridade:** `chk_pp_scope_consistency` (cada scope_type exige exatamente sua coluna-alvo); índices parciais únicos por escopo ativo (`idx_pp_unique_default/category/item`) impedem ambiguidade (1 política ativa por alvo); trigger `fn_pp_scope_same_org` garante que categoria/item pertencem à mesma organização.

### pricing_policy_versions

Regras numéricas versionadas e temporalmente válidas da política. Não persiste preços calculados (PRC-04C/PRC-05).

| Coluna | Tipo | Observações |
|--------|------|-------------|
| id | uuid PK | |
| organization_id | uuid FK → organizations | tenant |
| pricing_policy_id | uuid FK → pricing_policies | |
| version_number | integer | > 0; UNIQUE (pricing_policy_id, version_number) |
| valid_from / valid_to | date | vigência `[valid_from, valid_to)` |
| status | text | draft \| under_review \| approved \| scheduled \| active \| superseded \| cancelled |
| pricing_method | text | `target_margin` \| `markup` \| `fixed_price` |
| target_margin_rate | numeric(9,6) | só para target_margin; [0, 1) |
| markup_rate | numeric(9,6) | só para markup; >= 0 |
| fixed_price | numeric(14,4) | só para fixed_price; >= 0 |
| minimum_margin_rate | numeric(9,6) | NULL ou [0, 1) |
| maximum_discount_rate | numeric(9,6) | NULL ou [0, 1] |
| rounding_mode | text | `none` \| `nearest` \| `up` \| `down` |
| rounding_step | numeric(12,4) | obrigatório se rounding_mode != none |
| approved_by / approved_at | uuid / timestamptz | |
| published_by / published_at | uuid / timestamptz | |
| superseded_by / superseded_at | uuid / timestamptz | |

**Integridade:** `chk_ppv_method_integrity` (cada método aceita somente sua própria taxa); `chk_ppv_min_margin`; `chk_ppv_max_discount`; `chk_ppv_rounding`; `chk_ppv_validity`; EXCLUDE temporal `chk_ppv_no_overlap` (GiST, `daterange('[)')`, DEFERRABLE) sobre versões active/scheduled da mesma política; triggers: cross-org (`fn_ppv_policy_same_org`), transição de status (`fn_ppv_validate_status_transition`, gate `app.pricing_rpc_active`), imutabilidade de publicados/aprovados (`fn_ppv_protect_published_fields`), bloqueio de hard delete de versões não-draft (`fn_ppv_delete_guard`).

### pricing_policy_components

Componentes adicionais de custo da versão de política.

| Coluna | Tipo | Observações |
|--------|------|-------------|
| id | uuid PK | |
| organization_id | uuid FK → organizations | tenant |
| pricing_policy_version_id | uuid FK → pricing_policy_versions | |
| name | text | |
| component_type | text | `fixed` \| `percentage_of_base_cost` |
| fixed_amount | numeric(14,4) | só para fixed; >= 0 |
| rate | numeric(9,6) | só para percentage_of_base_cost; >= 0 (sem limite superior em v1) |
| created_by / created_at | uuid / timestamptz | |
| updated_by / updated_at | uuid / timestamptz | |

**Integridade:** `chk_ppc_type_integrity` (cada tipo aceita somente seu campo); trigger cross-org (`fn_ppc_version_same_org`); trigger `fn_ppc_parent_draft` (somente versões draft aceitam componentes); hard delete protegido em versões não-draft.

## Tabelas (PRC-05B — Tabelas Comerciais de Preço)

### commercial_price_tables

Identidade estável de uma tabela comercial. Não armazena preços (ficam nas versões/itens).

| Coluna | Tipo | Observações |
|--------|------|-------------|
| id | uuid PK | default gen_random_uuid() |
| organization_id | uuid FK → organizations | tenant |
| code | text | UNIQUE (organization_id, code) |
| code_normalized | text | UNIQUE (organization_id, code_normalized); via fn_normalize_commercial_code |
| name | text | |
| description | text | nullable |
| status | text | `active` \| `inactive` |
| created_by / created_at | uuid FK / timestamptz | actor server-derived |
| updated_by / updated_at | uuid FK / timestamptz | trigger fn_set_updated_at |

**Integridade:** normalização via `fn_normalize_commercial_code` (case/acento/espaço, implementada com `chr()` por segurança de encoding); código imutável após existir versão/histórico (`fn_cpt_code_normalize`).

### commercial_price_table_versions

Versões temporalmente válidas com lifecycle próprio.

| Coluna | Tipo | Observações |
|--------|------|-------------|
| id | uuid PK | |
| organization_id | uuid FK → organizations | tenant |
| commercial_price_table_id | uuid FK → commercial_price_tables | |
| version_number | integer | > 0; UNIQUE (commercial_price_table_id, version_number) |
| version_label | text | nullable |
| valid_from / valid_to | date | vigência `[valid_from, valid_to)` |
| status | text | draft \| under_review \| approved \| scheduled \| active \| superseded \| cancelled |
| notes | text | nullable |
| created_by / created_at | uuid / timestamptz | |
| approved_by / approved_at | uuid / timestamptz | |
| published_by / published_at | uuid / timestamptz | |
| superseded_by / superseded_at | uuid / timestamptz | |

**Integridade:** `chk_cptv_version_number`; `chk_cptv_validity`; **EXCLUDE temporal `chk_cptv_no_overlap`** (GiST, `daterange('[)')`) sobre versões active/scheduled (adjacência permitida); triggers cross-org (`fn_cptv_table_same_org`), actor (`fn_cptv_actor`), transição de status (`fn_cptv_validate_status_transition`, gate `app.commercial_price_rpc_active` NULL-safe + completude ≥1 item), imutabilidade de não-draft (`fn_cptv_protect_published_fields`), hard delete só de draft (`fn_cptv_delete_guard`), **parent-active guard forward `fn_cptv_parent_active`** (PRC-05C — inactive parent não recebe versão via RPC nem DML).

### commercial_price_items

UM item de catálogo + UM preço explícito + UMA versão de tabela.

| Coluna | Tipo | Observações |
|--------|------|-------------|
| id | uuid PK | |
| organization_id | uuid FK → organizations | tenant |
| commercial_price_table_version_id | uuid FK → commercial_price_table_versions | |
| catalog_item_id | uuid FK → catalog_items | UNIQUE (version_id, catalog_item_id) |
| price_amount | numeric(14,4) | >= 0 (ZERO permitido) |
| currency | char(3) | CHECK = 'BRL' (v1) |
| item_code_snapshot / item_name_snapshot / item_type_snapshot | text | snapshot do catálogo, server-derived |
| origin_type | text | `manual` \| `pricing_engine` |
| source_commercial_price_item_id | uuid FK → commercial_price_items | linhagem same-table |
| Proveniência `source_*` | — | nullable p/ manual; obrigatória p/ engine (chk_cpi_engine_provenance) |
| pricing_snapshot | jsonb | opcional; resultado autoritativo na criação |
| created_by / created_at | uuid / timestamptz | |
| updated_by / updated_at | uuid / timestamptz | |

**Integridade:** `chk_cpi_price_amount` (>= 0); `chk_cpi_currency`; `chk_cpi_engine_provenance`; `idx_cpi_unique_item`; triggers cross-org: versão (`fn_cpi_version_same_org`), catálogo ativo e same-org (`fn_cpi_catalog_item_active`), snapshot (`fn_cpi_catalog_snapshot`), custo/política de origem (pertencimento e correspondência tabela↔versão), linhagem same-table (`fn_cpi_lineage_same_table`); imutabilidade em versões não-draft (`fn_cpi_immutable_when_published`); **engine provenance guard forward `fn_cpi_engine_provenance_guard`** (PRC-05C — DML direto de `origin_type='pricing_engine'` é bloqueado sem o gate `app.commercial_price_rpc_active`).

### commercial_price_exceptions

Registro de exceção comercial auditável (append-only).

| Coluna | Tipo | Observações |
|--------|------|-------------|
| id | uuid PK | |
| organization_id | uuid FK → organizations | tenant |
| commercial_price_table_version_id | uuid FK → commercial_price_table_versions | |
| commercial_price_item_id | uuid FK → commercial_price_items | |
| violation_code | text | CHECK (BELOW_COST \| BELOW_MINIMUM_MARGIN \| COMMERCIAL_DEVIATION) |
| status | text | `requested` \| `approved` \| `denied` |
| reason | text | |
| requested_by / requested_at | uuid / timestamptz | actor server-derived |
| decided_by / decided_at | uuid / timestamptz | |

**Integridade:** `idx_cpe_unique_item_code` (sem duplicata item+violation); cross-org (`fn_cpe_integrity`); transição de status com gate `app.commercial_price_rpc_active` + permissão `exception_approve` (`fn_cpe_status_transition`); **append-only** (`fn_cpe_delete_guard`; sem policy de DELETE → RLS bloqueia); **parent-editable guard forward `fn_cpe_parent_editable`** (PRC-05C — novas exceções bloqueadas para versões em `scheduled|active|superseded|cancelled`).

## Tabelas (PRC-06B — Precificação por Cliente)

### client_profiles

Papel cliente de uma empresa existente; não duplica identidade corporativa.

| Coluna | Tipo | Observações |
|--------|------|-------------|
| company_id | uuid PK/FK → companies | `ON DELETE RESTRICT`; pode coexistir com supplier_profiles |
| organization_id | uuid FK → organizations | tenant; FK composta com company |
| status | text | `active` \| `inactive` \| `blocked`; INSERT força `active` |
| commercial_notes / status_reason | text | status_reason muda somente com status sob gate |
| created_by / created_at | uuid / timestamptz | server-derived |
| updated_by / updated_at | uuid / timestamptz | server-derived |

**Integridade:** empresa ativa para criação/reativação; organização da empresa obrigatoriamente igual; status direto bloqueado pelo gate NULL-safe; perfil com atribuição/override não pode ser excluído.

### client_commercial_table_assignments

Atribuição temporal do cliente à identidade estável de tabela comercial.

| Coluna | Tipo | Observações |
|--------|------|-------------|
| id | uuid PK | default gen_random_uuid() |
| organization_id | uuid FK | tenant |
| client_company_id | uuid FK → client_profiles | `ON DELETE RESTRICT` |
| commercial_price_table_id | uuid FK → commercial_price_tables | tabela estável, não versão |
| status | text | draft \| under_review \| approved \| scheduled \| active \| superseded \| cancelled |
| valid_from / valid_to | date | `[valid_from, valid_to)` |
| contract_reference / notes | text | opcionais |
| atores/timestamps | uuid / timestamptz | criação, atualização e workflow server-derived |

**Integridade:** INSERT somente draft; empresa/perfil/tabela ativos e same-org; FK composta contra drift de tenant; EXCLUDE GiST `active|scheduled` por organização+cliente (adjacência permitida); grafo de status sob `app.client_pricing_rpc_active`; fechamento `valid_to` somente monotônico; não-draft imutável; hard-delete somente draft.

### client_price_overrides

Preço explícito negociado por cliente+item, independente da tabela base.

| Coluna | Tipo | Observações |
|--------|------|-------------|
| id | uuid PK | default gen_random_uuid() |
| organization_id / client_company_id / catalog_item_id | uuid FK | relações same-org e `ON DELETE RESTRICT` |
| price_amount | numeric(14,4) | >= 0; zero é valor válido |
| currency | char(3) | somente BRL |
| reason | text | obrigatório, não vazio/whitespace |
| status | text | mesmo lifecycle das atribuições |
| valid_from / valid_to | date | `[valid_from, valid_to)` |
| item_*_snapshot | text | código/nome/tipo derivados do catálogo |
| source_* | date/uuid/numeric | baseline opcional all-or-none |
| atores/timestamps | uuid / timestamptz | server-derived |

**Integridade:** INSERT somente draft; item/cliente ativos e same-org; EXCLUDE GiST `active|scheduled` por organização+cliente+item; snapshots não confiados ao caller; proveniência não nula exige gate e comprova atribuição aplicável, tabela/versão/item/data/catálogo/valor exatos por triggers + FKs compostas; não-draft e histórico imutáveis; hard-delete somente draft.

### Segurança e workflow PRC-06B/PRC-06C

RLS nas três tabelas: `view` para SELECT, `create` para INSERT e `edit` para UPDATE/DELETE, sempre com membership. As RPCs PRC-06C revalidam membership e a permissão exata de edit/review/approve/publish, derivam o ator de `auth.uid()` e abrem somente o gate transacional `app.client_pricing_rpc_active`. Auditoria registra eventos `pricing.client.profile.*`, `pricing.client.assignment.*` e `pricing.client.override.*` com ator derivado.

Publicação e sync mantêm timelines `[valid_from, valid_to)` de atribuição e override; resolvers selecionam componentes `active|scheduled|superseded` por data sem compor preço final. A captura de proveniência resolve a atribuição e o item da tabela autoritativamente e congela o grupo `source_*` no draft.

## Resolver Final (PRC-07B)

PRC-07B não adiciona tabelas. A migration 041 cria somente a RPC read-only:

```text
fn_resolve_final_client_price(uuid, uuid, uuid, date DEFAULT current_date) → jsonb
```

A função compõe `fn_resolve_client_price_override`, `fn_resolve_client_table_assignment` e `fn_resolve_commercial_table_price` no mesmo snapshot, com precedência `CLIENT_OVERRIDE > ASSIGNED_COMMERCIAL_TABLE`. Não executa DML, sync, auditoria, cálculo financeiro nem SQL temporal direto.

Segurança: `SECURITY DEFINER`, `STABLE`, `SET search_path = public`, EXECUTE revogado de PUBLIC/anon e concedido a authenticated. Antes de qualquer componente, exige `auth.uid()`, membership e a conjunção `pricing.client.view AND pricing.commercial.view`. Nenhuma permissão ou role mapping novo foi criado.

## Migrations

| # | Arquivo | Descrição |
|---|---------|-----------|
| 001 | 001_core_organizations | organizations, legal_entities, business_units, trigger updated_at |
| 002 | 002_core_memberships | profiles, organization_memberships |
| 003 | 003_core_rbac | roles, permissions, role_permissions, membership_roles |
| 004 | 004_core_audit | audit_logs com append-only |
| 005 | 005_core_rls | RLS habilitado + policies base |
| 006 | 006_core_seed | Seed: EFETIVA, roles globais, permissões base |
| 007 | 007_catalog_tables | catalog_categories, catalog_items, catalog_item_aliases + triggers |
| 008 | 008_catalog_rls | RLS policies para tabelas do catálogo + has_permission() helper |
| 009 | 009_catalog_code_generation | Sequências + fn_catalog_next_code() para geração segura de código |
| 010 | 010_catalog_rbac | Permissões catálogo + seeds para roles admin/manager/operator/viewer |
| 011 | 011_companies | companies — entidade base para fornecedores |
| 012 | 012_supplier_profiles | supplier_profiles — extensão de company para role de fornecedor |
| 013 | 013_supplier_catalog_items | supplier_catalog_items — mapeamentos fornecedor↔item + constraints |
| 014 | 014_supplier_rls | RLS policies para companies, supplier_profiles, supplier_catalog_items |
| 015 | 015_supplier_rbac | RBAC + audit triggers + alias extension + RPCs + log_audit() |
| 016 | 016_supplier_security_hardening | Server-derived auth.uid(), REVOKE EXECUTE, CHECK preferred, hardened alias integrity |
| 017 | 017_drop_old_function_overloads | Drop old function overloads (7-param log_audit, 12-param create_mapping, 2-param set_preferred) |
| 018 | 018_supplier_cost_tables | supplier_cost_tables — registro de tabelas de custo por fornecedor |
| 019 | 019_supplier_cost_table_versions | supplier_cost_table_versions — versões com vigência, workflow, overlap check |
| 020 | 020_supplier_cost_items | supplier_cost_items — itens de custo por versão, cost_status CHECK, imutabilidade |
| 021 | 021_cost_rls | RLS policies para tabelas de custo (4 policies × 3 tabelas) |
| 022 | 022_cost_rbac_and_rpcs | Permissões pricing.cost.*, audit triggers, 10 RPCs |
| 023 | 023_cost_integrity_hardening | Restrição estrita de cost_status, imutabilidade RLS (app.cost_rpc_active), bloqueio de UPDATE direto de status, EXCLUDE temporal, RPCs seguras (submit/approve/publish) |
| 024 | 024_h13_fix_scheduled_publish | Fix H13 (semantic doc): publicação scheduled mantém predecessor active |
| 025 | 025_cost_temporal_cutover_finalization | Semântica temporal final: publish v8 (predecessor ativo até início da nova versão), resolver inclui 'scheduled', RPC idempotente fn_sync_cost_version_status |
| 026 | 026_pricing_policy_schema | pricing_policies, pricing_policy_versions, pricing_policy_components + constraints de integridade, escopo, método, temporal (EXCLUDE GiST) e triggers cross-org/status/imutabilidade/hard-delete |
| 027 | 027_pricing_policy_security | Permissões pricing.policy.* (6), mapeamentos RBAC, RLS (12 policies), audit triggers |
| 028 | 028_pricing_policy_workflow_rpcs | Permissão pricing.calculate, RBAC mappings, RPCs de workflow: create policy/version, component writes, submit/approve/cancel/return-to-draft, publish, sync cutover |
| 029 | 029_pricing_engine | Motor de precificação autoritativo: fn_resolve_pricing_policy (resolução por precedência de escopo), fn_calculate_price (cálculo numérico interno), fn_simulate_price (RPC pública de orquestração) |
| 032 | 032_commercial_price_schema | commercial_price_tables, commercial_price_table_versions, commercial_price_items, commercial_price_exceptions + normalizador de código (chr-safe), integridade cross-org, EXCLUDE temporal, gate de workflow NULL-safe, snapshots/proveniência/linhagem, imutabilidade, hard-delete guards, índices |
| 033 | 033_commercial_price_security | Permissões pricing.commercial.* (7), mapeamentos RBAC (admin 7 / manager 5 / operator 1 / viewer 1), RLS (12 policies), audit triggers, revokes de helpers internos (PUBLIC/anon) |
| 034 | 034_commercial_price_workflow | Forward integrity hardening (parent-active, engine provenance guard, exception parent-state); RPCs de workflow: tabela (create/update/status), versão (concurrency-safe), itens (manual/engine/clone/bulk), exceções (request/decide), workflow (submit/return/approve/cancel), validador de publicação, publish + sync cutover |
| 035 | 035_commercial_price_resolver | `fn_resolve_commercial_table_price` — RPC de resolução table-specific com status machine-readable (`RESOLVED`/`TABLE_NOT_FOUND`/`VERSION_NOT_FOUND`/`PRICE_NOT_FOUND`), tie-break determinístico, zero vs missing, histórico de tabela inativa, proveniência completa + exceções aprovadas |
| 036 | 036_commercial_price_resolver_valid_to_fix | Fix forward-only do predicado temporal do resolver (035): `v_valid_to` (variável não atribuída) → `v.valid_to` (coluna) no `WHERE (v.valid_to IS NULL OR v.valid_to > p_reference_date)`, corrigindo resolução de versões anteriores/sucessoras sem alterar contrato/grants |
| 037 | 037_client_pricing_schema | `client_profiles`, atribuições e overrides; FKs compostas same-org/RESTRICT, actors/snapshots server-derived, gate NULL-safe, lifecycle/imutabilidade/delete guards, proveniência confiável, GiST temporal, RLS fail-closed |
| 038 | 038_client_pricing_security | Seis permissões `pricing.client.*`, mapeamentos 6/5/1/1, 12 policies RLS, policy restritiva de audit payload, audit triggers e hardening de privilégios |
| 039 | 039_client_pricing_workflow | 14 RPCs autoritativas: status de perfil, workflows de atribuição/override, publicação temporal concorrente, sync idempotente e captura confiável de proveniência |
| 040 | 040_client_pricing_resolvers | Resolvers isolados de atribuição de tabela e override por cliente+item, com resolução atual/futura/histórica, zero explícito, desempate determinístico e payload de proveniência |
| 041 | 041_final_price_resolver | `fn_resolve_final_client_price` — composição final read-only e determinística; override antes de tabela atribuída, zero autoritativo, mapeamentos de ausência, validação defensiva dos componentes e segurança por conjunção das permissões de view existentes |

## Geração de Tipos TypeScript

```bash
npx supabase gen types typescript --local > src/types/database.ts
```

Ou em produção:

```bash
npx supabase gen types typescript --project-id <ref> > src/types/database.ts
```
