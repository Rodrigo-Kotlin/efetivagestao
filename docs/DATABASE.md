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

## Migrations

| # | Arquivo | Descrição |
|---|---------|-----------|
| 001 | 001_core_organizations | organizations, legal_entities, business_units, trigger updated_at |
| 002 | 002_core_memberships | profiles, organization_memberships |
| 003 | 003_core_rbac | roles, permissions, role_permissions, membership_roles |
| 004 | 004_core_audit | audit_logs com append-only |
| 005 | 005_core_rls | RLS habilitado + policies base |
| 006 | 006_core_seed | Seed: EFETIVA, roles globais, permissões base |

## Geração de Tipos TypeScript

```bash
npx supabase gen types typescript --local > src/types/database.ts
```

Ou em produção:

```bash
npx supabase gen types typescript --project-id <ref> > src/types/database.ts
```
