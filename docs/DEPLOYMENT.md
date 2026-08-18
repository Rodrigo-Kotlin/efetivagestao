# Deploy — Efetiva Gestão

## Pipeline

```
GitHub Push → GitHub Actions → Build → Deploy
```

## GitHub Actions

CI executa:

1. `npm install`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test:run`
5. `npm run build`

Se qualquer etapa falhar, o pipeline falha.

## Deploy Frontend

- **Plataforma:** Cloudflare Pages
- **Build command:** `npm run build`
- **Output directory:** `dist`

## Variáveis de Ambiente (Produção)

Configurar no Cloudflare Pages:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**NUNCA** colocar service_role key ou database password no frontend.

## Supabase (Produção)

- Criar projeto no Supabase
- Aplicar migrations:
  ```bash
  supabase db push
  ```
- Gerar tipos:
  ```bash
  npx supabase gen types typescript --project-id <ref> > src/types/database.ts
  ```

## Domínio

Configurar domínio customizado no Cloudflare Pages após deploy.

## Rollback

- Cloudflare Pages mantém versões anteriores
- Reverter para versão anterior via dashboard
- Para rollback de banco: criar migration de correção
