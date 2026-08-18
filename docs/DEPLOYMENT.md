# Deploy — Efetiva Gestão

## Pipeline

```
GitHub Push → GitHub Actions (CI) → Build → Deploy
```

## GitHub Actions

CI executa:

1. `npm ci --legacy-peer-deps`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test:run`
5. `npm run build`

Job adicional (`migrations-check`) verifica migrations no Supabase remoto.

Se qualquer etapa falhar, o pipeline falha.

## GitHub Actions Variables

Configurar no repo GitHub > Settings > Secrets and variables > Actions > Variables:

| Variable | Valor |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://scyxgyewdokmsuehgwql.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` (anon key do Supabase) |

**Nota:** Estas são Variables (não Secrets) porque são necessárias no build do browser.

## Supabase Remoto

- **Projeto:** scyxgyewdokmsuehgwql (São Paulo)
- **Supabase CLI:** `supabase link --project-ref scyxgyewdokmsuehgwql`
- **Pooler (IPv4):** `aws-0-sa-east-1.pooler.supabase.com:6543`
- **Migrations:** 001-010 aplicadas remotamente

### Aplicar Migrations

```bash
# Dry-run primeiro
supabase db push --dry-run --db-url "postgresql://postgres.scyxgyewdokmsuehgwql:<SENHA>@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"

# Aplicar
supabase db push --db-url "postgresql://postgres.scyxgyewdokmsuehgwql:<SENHA>@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"
```

## Deploy Frontend

- **Plataforma:** Cloudflare Pages
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Variáveis de ambiente:** Configurar no Cloudflare Pages

## Domínio

Configurar domínio customizado no Cloudflare Pages após deploy.

## Rollback

- Cloudflare Pages mantém versões anteriores
- Reverter para versão anterior via dashboard
- Para rollback de banco: criar migration de correção
