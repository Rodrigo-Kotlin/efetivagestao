# Roadmap — Efetiva Gestão

## Status Geral

| PRC | Descrição | Status |
|-----|-----------|--------|
| PRC-00 | Bootstrap / Foundation | **COMPLETED** |
| PRC-00B | Infraestrutura Remota (GitHub + Supabase) | **COMPLETED** |
| PRC-01 | Catálogo Mestre | **COMPLETED** |
| PRC-02 | Fornecedores e Mapeamentos | **COMPLETED** |
| PRC-02A | Supplier Security & Integrity Hardening | **COMPLETED** |
| PRC-03 | Custos e Versionamento | **COMPLETED** |
| PRC-03A | Cost Temporal & Financial Integrity Hardening | **COMPLETED** |
| PRC-03B | Temporal Cutover & Migration Reproducibility | **COMPLETED** |
| PRC-04 | Formação de Preço | **COMPLETED** |
| PRC-04A | Pricing Model & Mathematical Rules | **COMPLETED** |
| PRC-04B | Pricing Policy Database, Integrity, RLS & RBAC | **COMPLETED** |
| PRC-04C | Authoritative Pricing Engine & Workflow (RPC) | **COMPLETED** |
| PRC-04D | Pricing Policy UI & Price Simulator | **COMPLETED** |
| PRC-04E | Pricing End-to-End Hardening & Final Verification | **COMPLETED** |
| PRC-05 | Tabelas Comerciais | **COMPLETED** |
| PRC-05A | Commercial Price Table Model & Business Rules | **COMPLETED** |
| PRC-05B | Commercial Price Table Database, Integrity, RLS & RBAC | **COMPLETED** |
| PRC-05C | Commercial Price Workflow, Clone, Publish & Table Resolver | **COMPLETED** |
| PRC-05D | Commercial Price Table UI | **COMPLETED** |
| PRC-05E | Commercial Pricing End-to-End Hardening | **COMPLETED** |
| PRC-06 | Clientes e Exceções | **COMPLETED** |
| PRC-06A | Client Pricing Model & Business Rules | **COMPLETED** |
| PRC-06B | Client Pricing Database, Integrity, RLS & RBAC | **COMPLETED** |
| PRC-06C | Client Assignment/Override Workflow & Component Resolvers | **COMPLETED** |
| PRC-06D | Client Pricing UI | **COMPLETED** |
| PRC-06E | Client Pricing End-to-End Hardening | **COMPLETED** |
| PRC-07 | Motor de Resolução | **IN PROGRESS** |
| PRC-07A | Final Price Resolution Model & Business Rules | **COMPLETED** |
| PRC-07B | Final Price Resolver Backend & Security | **COMPLETED** |
| PRC-07C | Final Price Resolution UI | PAUSED — MVP PIVOT |
| PRC-07D | End-to-End Hardening & Final Verification | PAUSED — MVP PIVOT |
| PRC-08 | Importação | NOT STARTED |
| PRC-09 | Conciliação | NOT STARTED |
| PRC-10 | Inteligência de Mercado | NOT STARTED |
| PRC-11 | Migração do Legado | NOT STARTED |
| PRC-12 | Hardening | NOT STARTED |
| PRC-13 | Homologação | NOT STARTED |
| **MVP-PRICING-00** | **Arquitetura e Simplificação de Produto** | **COMPLETED** |
| **MVP-PRICING-01** | **Navegação Simplificada e UX de Preços** | **DEFINED** |
| **MVP-PRICING-02** | **Entrada de Preço Fornecedor e Comparação de Custos** | **DEFINED** |
| **MVP-PRICING-03** | **Margem Padrão e Tabela de Preços Pesquisável** | **DEFINED** |
| **MVP-PRICING-04** | **Hardening / E2E / QA Responsivo** | **DEFINED** |

## UIX Phases

| Fase | Descrição | Status |
|------|-----------|--------|
| UIX-00 | Design System Bootstrap | **COMPLETED** |
| UIX-01 | Dashboard Migration | **COMPLETED** |
| UIX-02 | Catalog Migration | **COMPLETED** |
| UIX-02R1 | Catalog Refinement | **COMPLETED** |
| UIX-03A | Policies & Simulator | **COMPLETED** |
| UIX-03B | Costs Workflow | **COMPLETED** |
| UIX-03C1 | Suppliers List/Detail | **COMPLETED** |
| UIX-03C2 | Commercial Tables Components | **COMPLETED** |
| UIX-03D1 | Commercial Tables Pages | **COMPLETED — RETAINED** |
| UIX-03D2 | Commercial Version Workspace | **PAUSED — SUPERSEDED BY MVP PIVOT** |

## MVP Pivot

**Data:** 2026-08-22
**Decisão:** Simplificação da superfície de UX do módulo de Precificação para 4 áreas visíveis (Fornecedores, Exames, Custos & Comparativo, Tabela de Preços). Backend avançado permanece intacto e oculto.

MVP Phases:

| Fase | Escopo | Status |
|------|--------|--------|
| MVP-PRICING-00 | Arquitetura e Simplificação de Produto | **COMPLETED** |
| MVP-PRICING-01 | Navegação Simplificada e UX de Preços | DEFINIDO (futuro) |
| MVP-PRICING-02 | Entrada de Preço Fornecedor e Comparação de Custos | DEFINIDO (futuro) |
| MVP-PRICING-03 | Margem Padrão e Tabela de Preços Pesquisável | DEFINIDO (futuro) |
| MVP-PRICING-04 | Hardening / E2E / QA Responsivo | DEFINIDO (futuro) |

Referência: `docs/PRICING_MVP.md` · `docs/DECISION_REGISTER.md` (DEC-068..DEC-074)

## Primeiro Domínio Funcional

**Catálogo, Custos e Preços** (PRC-01 a PRC-10)

Controla:
- Catálogo mestre de exames e serviços
- Fornecedores
- Códigos e nomenclaturas externas
- Custos versionados
- Formação de preços
- Margens e markup
- Tabelas comerciais
- Preços específicos por cliente
- Importação de tabelas
- Conciliação de faturamento de fornecedores
- Inteligência de mercado
- Auditoria

## Checkpoints

| Checkpoint | PRC | Status |
|-----------|-----|--------|
| FOUNDATION_READY | PRC-00 | Atingido |
| CATALOG_READY | PRC-01 | Atingido |
| SUPPLIER_MAPPING_VERIFIED | PRC-02A | Atingido |
| COST_INTEGRITY_VERIFIED | PRC-03A | Atingido |
| SUPPLIER_COSTS_VERIFIED | PRC-03B | Atingido |
| PRICING_MODEL_DEFINED | PRC-04A | Atingido |
| PRICING_POLICY_SCHEMA_VERIFIED | PRC-04B | Atingido |
| PRICING_ENGINE_CORE_VERIFIED | PRC-04C | Atingido |
| PRICING_POLICY_UI_VERIFIED | PRC-04D | Atingido |
| PRICING_ENGINE_VERIFIED | PRC-04E | Atingido |
| COMMERCIAL_PRICING_MODEL_DEFINED | PRC-05A | Atingido |
| COMMERCIAL_PRICE_SCHEMA_VERIFIED | PRC-05B | Atingido |
| COMMERCIAL_PRICE_CORE_VERIFIED | PRC-05C | Atingido |
| COMMERCIAL_PRICE_UI_VERIFIED | PRC-05D | Atingido |
| COMMERCIAL_PRICING_VERIFIED | PRC-05E | Atingido |
| CLIENT_PRICING_MODEL_DEFINED | PRC-06A | Atingido |
| CLIENT_PRICING_SCHEMA_VERIFIED | PRC-06B | Atingido |
| CLIENT_PRICING_CORE_VERIFIED | PRC-06C | Atingido |
| CLIENT_PRICING_UI_VERIFIED | PRC-06D | Atingido |
| CLIENT_PRICING_VERIFIED | PRC-06E | Atingido |
| FINAL_PRICE_RESOLUTION_MODEL_DEFINED | PRC-07A | Atingido |
| FINAL_PRICE_RESOLVER_VERIFIED | PRC-07B | Atingido |
| UIX-03D1_VERIFIED | UIX-03D1 | Atingido |
| MVP_ARCHITECTURE_DEFINED | MVP-PRICING-00 | Atingido |

## Gate de Continuidade

| Item | Status |
|------|--------|
| PRC-06 | COMPLETED |
| PRC-06E | COMPLETED — 10/10 suítes executadas contra o Supabase remoto |
| CLIENT_PRICING_VERIFIED | ATINGIDO |
| PRC-07 | IN PROGRESS |
| PRC-07A | COMPLETED |
| FINAL_PRICE_RESOLUTION_MODEL_DEFINED | ATINGIDO |
| PRC-07B | COMPLETED — migration 041; 11/11 suítes remotas FULL PASS |
| FINAL_PRICE_RESOLVER_VERIFIED | ATINGIDO |
| PRC-07C | PAUSED — MVP PIVOT |
| UIX-03D1 | COMPLETED — RETAINED |
| UIX-03D2 | PAUSED — SUPERSEDED BY MVP PIVOT |
| MVP-PRICING-00 | COMPLETED — Architecture only |
| READY FOR MVP-PRICING-01 | YES |
