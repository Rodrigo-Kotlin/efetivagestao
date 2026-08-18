# Catálogo Mestre — Documentação do Módulo

## Visão Geral

O Catálogo Mestre é a fonte única de identidade dos serviços comercializados ou operacionalizados pela Efetiva. Ele suporta:

- Exames laboratoriais
- Exames complementares
- Radiologia
- Consultas
- Procedimentos
- Avaliações
- Pacotes
- Outros serviços

## Arquitetura

```
features/pricing/
├── catalog/
│   ├── api/
│   │   └── catalog.ts          # Todas as chamadas Supabase do domínio
│   ├── components/
│   │   ├── CatalogList.tsx      # Listagem com busca, filtros, paginação
│   │   ├── CatalogForm.tsx      # Formulário de criação/edição
│   │   ├── CatalogDetail.tsx    # Detalhe com abas (Geral, Aliases, Histórico)
│   │   ├── AliasManager.tsx     # Gerenciamento de aliases
│   │   └── CategoryManager.tsx  # Gerenciamento de categorias
│   ├── hooks/
│   │   ├── useCatalog.ts        # Hooks de items, stats, mutations
│   │   ├── useCategories.ts     # Hooks de categorias
│   │   └── useAliases.ts        # Hooks de aliases
│   ├── schemas/
│   │   └── validation.ts        # Validação de formulário
│   └── __tests__/
│       └── validation.test.ts   # Testes de validação
├── pages/
│   ├── PricingDashboard.tsx     # Dashboard /pricing
│   ├── CatalogPage.tsx          # Listagem /pricing/catalog
│   ├── CatalogNewPage.tsx       # Novo item /pricing/catalog/new
│   ├── CatalogDetailPage.tsx    # Detalhe /pricing/catalog/:id
│   ├── CatalogEditPage.tsx      # Edição /pricing/catalog/:id/edit
│   └── CategoriesPage.tsx       # Categorias /pricing/categories
└── __tests__/
    ├── PricingDashboard.test.tsx
    └── CatalogList.test.tsx
```

## Rotas

| Rota | Descrição | Permissão |
|------|-----------|-----------|
| `/pricing` | Dashboard do módulo | pricing.catalog.view |
| `/pricing/catalog` | Listagem de itens | pricing.catalog.view |
| `/pricing/catalog/new` | Novo item | pricing.catalog.create |
| `/pricing/catalog/:id` | Detalhe do item | pricing.catalog.view |
| `/pricing/catalog/:id/edit` | Editar item | pricing.catalog.edit |
| `/pricing/categories` | Gerenciar categorias | pricing.catalog.view |

## Geração de Código

Código comercial gerado server-side via PostgreSQL sequences:

| Tipo | Prefixo | Exemplo |
|------|---------|---------|
| laboratory_exam | EXA | EXA-000001 |
| complementary_exam | EXC | EXC-000001 |
| radiology | RAD | RAD-000001 |
| clinical_procedure | PROC | PROC-000001 |
| evaluation | AVL | AVL-000001 |
| consultation | CONS | CONS-000001 |
| package | PAC | PAC-000001 |
| other_service | SRV | SRV-000001 |

## Detecção de Duplicidade

Ao cadastrar ou editar item, verifica:
- Nome normalizado (exact match)
- Código
- Código legado
- Similaridade por substring

## Auditoria

Ações auditadas:
- `catalog.category.created/updated/deactivated`
- `catalog.item.created/updated/activated/deactivated/archived`
- `catalog.alias.created/updated/deleted`

## RLS

- **Leitura:** `is_member_of(organization_id)`
- **Escrita:** `has_permission('pricing.catalog.create/edit', organization_id)`
- **Categorias:** `has_permission('pricing.catalog.manage_categories', organization_id)`
- Cross-tenant impossível via triggers + RLS
