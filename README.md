# Efetiva Gestão

Plataforma Integrada de Gestão Empresarial da **Efetiva Segurança e Saúde do Trabalho / Efetiva Saúde**.

## Stack

- **Frontend:** React 19 + TypeScript + Vite
- **PWA:** vite-plugin-pwa
- **UI:** CSS Custom Properties (Design Tokens), Material Design 3 direction
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Deploy:** GitHub + Cloudflare Pages
- **CI:** GitHub Actions

## Início Rápido

```bash
# Instalar dependências
npm install

# Configurar ambiente
cp .env.example .env
# Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY

# Desenvolvimento
npm run dev

# Build
npm run build

# Testes
npm run test:run

# Lint
npm run lint

# Typecheck
npm run typecheck
```

## Estrutura do Projeto

```
src/
  app/          # App root component
  components/   # Componentes reutilizáveis
  features/     # Módulos por domínio
  layouts/      # Layouts de página
  lib/          # Configuração, Supabase client, logger
  hooks/        # Custom hooks
  routes/       # Definição de rotas
  services/     # Serviços externos
  types/        # Tipos TypeScript
  utils/        # Funções utilitárias
  styles/       # Design tokens e estilos globais
  test/         # Setup de testes
supabase/
  migrations/   # Migrations SQL versionadas
  seed/         # Seeds de desenvolvimento
docs/           # Documentação do projeto
```

## Documentação

- [Arquitetura](docs/ARCHITECTURE.md)
- [Banco de Dados](docs/DATABASE.md)
- [Segurança](docs/SECURITY.md)
- [RBAC](docs/RBAC.md)
- [Desenvolvimento](docs/DEVELOPMENT.md)
- [Design System](docs/DESIGN_SYSTEM.md)
- [Deploy](docs/DEPLOYMENT.md)
- [Roadmap](docs/ROADMAP.md)
- [Registro de Decisões](docs/DECISION_REGISTER.md)

## Status

**PRC-00B — Infraestrutura Remota** → `COMPLETED`
- GitHub: Rodrigo-Kotlin/efetivagestao (main)
- Supabase: scyxgyewdokmsuehgwql (São Paulo)
- Migrations: 001-010 aplicadas remotamente
- CI: GitHub Actions (lint, typecheck, test, build)
