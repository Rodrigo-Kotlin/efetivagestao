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
| PRC-07 | Motor de Resolução | NOT STARTED |
| PRC-08 | Importação | NOT STARTED |
| PRC-09 | Conciliação | NOT STARTED |
| PRC-10 | Inteligência de Mercado | NOT STARTED |
| PRC-11 | Migração do Legado | NOT STARTED |
| PRC-12 | Hardening | NOT STARTED |
| PRC-13 | Homologação | NOT STARTED |

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
