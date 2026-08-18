# Desenvolvimento — Efetiva Gestão

## Pré-requisitos

- Node.js >= 20
- npm >= 10
- Git

## Setup

```bash
git clone <repo-url>
cd efetivagestao
npm install
cp .env.example .env
# Preencher variáveis de ambiente
npm run dev
```

## Scripts

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento Vite |
| `npm run build` | Build de produção (tsc + vite build) |
| `npm run preview` | Preview do build |
| `npm run lint` | Lint com oxlint |
| `npm run typecheck` | Verificação de tipos TypeScript |
| `npm run test` | Testes com Vitest (watch mode) |
| `npm run test:run` | Testes execução única |
| `npm run test:coverage` | Testes com cobertura |

## Variáveis de Ambiente

| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| VITE_SUPABASE_URL | URL do projeto Supabase | Sim |
| VITE_SUPABASE_ANON_KEY | Chave pública (anon) do Supabase | Sim |

**NUNCA** commitar `.env`. Apenas `.env.example` vai para o repositório.

## Convenções

### Código

- TypeScript strict mode
- Sem `any` sem justificativa
- Nomes em `camelCase` para variáveis/funções
- Nomes em `PascalCase` para componentes/types
- Arquivos de componentes em `PascalCase.tsx`
- Arquivos utilitários em `camelCase.ts`

### Componentes

- Funções anônimas: `export function ComponentName()`
- Props como `interface` ou `type`
- Um componente por arquivo
- Estilos inline com CSS Custom Properties

### Database

- Migrations versionadas em `supabase/migrations/`
- Nome: `XXX_description.sql`
- IDs: UUID
- Timestamps: timestamptz
- Dinheiro: numeric(14,4)

## Supabase Local

```bash
# Instalar CLI
npm i -g supabase

# Iniciar
supabase start

# Gerar tipos
npx supabase gen types typescript --local > src/types/database.ts
```

## Estrutura de Testes

```
src/
  test/setup.ts              # Setup global
  pages/__tests__/           # Testes de páginas
  components/__tests__/      # Testes de componentes
  lib/__tests__/             # Testes de utilitários
```

### Testes de Segurança (RLS)

Testes de RLS devem ser executados contra banco local ou de teste:

```bash
# Requer Supabase local rodando
supabase test db
```
