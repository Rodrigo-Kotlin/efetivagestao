# Arquitetura — Efetiva Gestão

## Visão do Sistema

Efetiva Gestão é uma plataforma integrada de gestão empresarial projetada para uso interno da Efetiva, com arquitetura tenant-ready para evolução futura.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19, TypeScript, Vite |
| PWA | vite-plugin-pwa, Workbox |
| UI | CSS Custom Properties, Design Tokens |
| Backend | Supabase (PostgreSQL, Auth, Storage) |
| Deploy | GitHub Actions → Cloudflare Pages |

## Camadas

```
┌─────────────────────────────┐
│         Presentation        │
│  React components, pages    │
├─────────────────────────────┤
│          Features           │
│  Domain modules (pricing,   │
│  crm, finance, etc.)        │
├─────────────────────────────┤
│       Infrastructure        │
│  Supabase client, auth,     │
│  config, logger             │
├─────────────────────────────┤
│          Database           │
│  PostgreSQL + RLS           │
└─────────────────────────────┘
```

## Tenant-Ready

O sistema nasce preparado para múltiplas organizações:

- `organizations` — entidade raiz
- `legal_entities` — pessoas jurídicas
- `business_units` — unidades de negócio
- `organization_memberships` — vincula usuários a organizações

A primera organização criada é "EFETIVA".

## Domínios Futuros

```
features/
  core/       # Autenticação, perfil, configurações base
  crm/        # Clientes e contatos
  commercial/ # Propostas e contratos
  pricing/    # Catálogo, custos, preços (PRC-01+)
  clinic/     # Atendimentos clínicos
  finance/    # Financeiro
  operations/ # Operações
  hr/         # RH
  sst/        # Segurança do Trabalho
```

## Limites Atuais (PRC-00)

- Apenas estrutura e fundação
- Nenhuma funcionalidade de negócio implementada
- Login básico com Supabase Auth
- Home com cards de módulos
- Placeholder para /pricing

## Decisões de Design

- Ver [DECISION_REGISTER.md](DECISION_REGISTER.md)
