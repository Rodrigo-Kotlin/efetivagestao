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

## Geração de Tipos TypeScript

```bash
npx supabase gen types typescript --local > src/types/database.ts
```

Ou em produção:

```bash
npx supabase gen types typescript --project-id <ref> > src/types/database.ts
```
