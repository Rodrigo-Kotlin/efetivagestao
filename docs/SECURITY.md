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

## Secrets

- **NUNCA** commitar service_role key, database password ou API keys privadas
- Apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no frontend
- Variáveis sensíveis ficam apenas no backend/edge functions

## Cache e PWA

- Service worker cacheia apenas recursos estáticos (JS, CSS, HTML, SVG, fontes)
- Dados financeiros, custos e sensíveis NÃO são cacheados pelo service worker
- Política explícita: NetworkFirst para API do Supabase

## Auditoria

- `audit_logs` é append-only (triggers impedem UPDATE/DELETE)
- Registra: actor, ação, entidade, dados antes/depois
- Organização é registrada quando aplicável

## Checklist de Segurança

- [x] RLS ativo em todas as tabelas
- [x] Auth protege rotas privadas
- [x] Service role ausente do frontend
- [x] .env no .gitignore
- [x] .env.example seguro
- [x] audit_logs append-only
- [x] Triggers de updated_at automáticos
- [x] Logger redacta dados sensíveis
