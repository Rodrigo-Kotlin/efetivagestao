# Segurança — Efetiva Gestão

## Princípios

1. **Nunca confiar apenas no frontend** — O banco impede acessos não autorizados via RLS
2. **Menor privilégio** — Usuários recebem apenas permissões necessárias
3. **Tenant isolation** — Um usuário só acessa registros de organizações das quais é membro
4. **Append-only audit** — Logs de auditoria não podem ser editados ou excluídos

## Autenticação

- Supabase Auth com sessão persistente
- Login: e-mail + senha
- Auto-refresh de tokens
- Detecção de sessão em URL (callback OAuth futuro)

## Autorização (RBAC)

```
User → Membership → Role → Permission
```

- Roles podem ser globais (system) ou por organização
- Permissions são granulares e codificadas (ex: `pricing.catalog.view`)
- Frontend usa `can()` e `hasRole()` para UX, mas RLS impõe a regra real

## Row Level Security (RLS)

RLS está habilitado em todas as tabelas:

| Tabela | Policy |
|--------|--------|
| profiles | Usuário vê/edita apenas seu perfil |
| organizations | Membro vê organizações que participa |
| legal_entities | Membro da organização pode ver |
| business_units | Membro da organização pode ver |
| organization_memberships | Próprias ou da mesma organização |
| roles | Globais ou da organização |
| permissions | Qualquer autenticado (catálogo) |
| role_permissions | Segue lógica da role |
| membership_roles | Segue lógica da membership |
| audit_logs | Membro da organização ou actor |
| companies | Membro da organização pode ver/inserir/editar/excluir |
| supplier_profiles | Membro da organização pode ver/inserir/editar/excluir |
| supplier_catalog_items | Membro da organização pode ver/inserir/editar/excluir |

## Secrets

- **NUNCA** commitar service_role key, database password ou API keys privadas
- Apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no frontend
- Variáveis sensíveis ficam apenas no backend/edge functions
- `.env.local` está em `.gitignore` — nunca atinge o repositório
- Supabase database password usada apenas via CLI local para `supabase db push`
- CI usa GitHub Actions Variables para valores públicos (URL + anon key)

### Auditoria de Secrets (PRC-00B)

- [x] Zero referências a `service_role` no código fonte
- [x] Zero JWTs hardcoded no código fonte
- [x] `.env.local` gitignored
- [x] Anon key é segura para browser (RLS protege tudo)
- [x] Database password nunca em variáveis de ambiente do frontend

## Cache e PWA

- Service worker cacheia apenas recursos estáticos (JS, CSS, HTML, SVG, fontes)
- Dados financeiros, custos e sensíveis NÃO são cacheados pelo service worker
- Política explícita: NetworkFirst para API do Supabase

## Auditoria

- `audit_logs` é append-only (triggers impedem UPDATE/DELETE)
- `log_audit()` usa `auth.uid()` exclusivamente — never aceita actor do chamador
- REVOKE EXECUTE de PUBLIC/anon/authenticated em `log_audit()`
- Registra: actor (server-derived), ação, entidade, dados antes/depois
- Organização é registrada quando aplicável

## RPC Hardening (PRC-02A)

| RPC | User ID | Permission Check | Supplier Active Check |
|-----|---------|-----------------|----------------------|
| `fn_create_supplier_mapping` | `auth.uid()` | `pricing.supplier.manage_mappings` | `supplier_profiles.status = 'active'` |
| `fn_set_preferred_mapping` | `auth.uid()` | `pricing.supplier.manage_mappings` | `supplier_profiles.status = 'active'` + `mapping.status = 'active'` |

- Frontend não envia `p_user_id` — servidor deriva de `auth.uid()`
- Overloads antigos removidos explicitamente (DROP FUNCTION)
- CHECK constraint `chk_sci_preferred_requires_active` impede preferred+inactive

## Aliases Supplier Integrity (PRC-02A)

`fn_alias_supplier_source_integrity` valida 4 campos:
- `mapping.organization_id = alias.organization_id`
- `mapping.catalog_item_id = alias.catalog_item_id`
- `mapping.supplier_company_id = alias.source_company_id`
- `mapping.id = alias.supplier_catalog_item_id`

Aliases com referências inconsistentes são rejeitados.

## Checklist de Segurança

- [x] RLS ativo em todas as tabelas
- [x] Auth protege rotas privadas
- [x] Service role ausente do frontend
- [x] .env no .gitignore
- [x] .env.example seguro
- [x] audit_logs append-only
- [x] Triggers de updated_at automáticos
- [x] Logger redacta dados sensíveis
- [x] .env.local gitignored
- [x] Zero service_role no frontend
- [x] CI usa Variables (não Secrets) para valores públicos
