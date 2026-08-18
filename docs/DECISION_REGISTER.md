# Registro de Decisões — Efetiva Gestão

## DEC-001 — Novo Projeto Independente

**Data:** 2026-08-18
**Decisão:** Criar novo projeto independente denominado "Efetiva Gestão".
**Contexto:** Plataforma integrada de gestão empresarial da Efetiva.
**Consequência:** Repositório separado, sem acoplamento com outros sistemas.

## DEC-002 — Frontend React + TypeScript + Vite

**Data:** 2026-08-18
**Decisão:** Utilizar React 19, TypeScript strict, Vite como bundler.
**Contexto:** Frontend SPA moderno, tipado, com build rápido.
**Consequência:** Ecossistema React, tipagem forte, HMR rápido.

## DEC-003 — Backend Supabase/PostgreSQL

**Data:** 2026-08-18
**Decisão:** Backend via Supabase (PostgreSQL + Auth + Storage).
**Contexto:** Necessidade de banco relacional robusto com auth integrado.
**Consequência:** Menos infraestrutura自己管理, dependência do Supabase.

## DEC-004 — Arquitetura Tenant-Ready

**Data:** 2026-08-18
**Decisão:** Arquitetura multi-organização desde o início, mas sem complexidade SaaS desnecessária.
**Contexto:** Uso inicial apenas pela Efetiva, mas preparado para evolução.
**Consequência:** Tabelas com organization_id, membership, RLS por organização.

## DEC-005 — RBAC + RLS

**Data:** 2026-08-18
**Decisão:** Modelo RBAC (roles, permissions) + Row Level Security no PostgreSQL.
**Contexto:** Segurança deve ser imposta pelo banco, não apenas pelo frontend.
**Consequência:** Dupla camada: frontend UX + backend enforcement.

## DEC-006 — UUID como PK

**Data:** 2026-08-18
**Decisão:** Usar UUID como identificador técnico principal em todas as tabelas.
**Contexto:** Segurança, distribuição,避免 conflitos.
**Consequência:** Códigos comerciais (EXA-000001) são atributos, não PKs.

## DEC-007 — Valores Monetários numeric(14,4)

**Data:** 2026-08-18
**Decisão:** Usar `numeric(14,4)` para valores monetários no PostgreSQL.
**Contexto:** Precisão financeira, evitar erros de ponto flutuante.
**Consequência:** Nunca usar float para dinheiro.

## DEC-008 — Vigências [valid_from, valid_to)

**Data:** 2026-08-18
**Decisão:** Intervalos de vigência seguem padrão `[valid_from, valid_to)` — início inclusivo, fim exclusivo.
**Contexto:** Padronizar versionamento de preços e contratos.
**Consequência:** Consistência em consultas temporais.

## DEC-009 — Versões Comerciais Imutáveis

**Data:** 2026-08-18
**Decisão:** Tabelas comerciais publicadas devem ser imutáveis.
**Contexto:** Integridade de preços publicados a clientes.
**Consequência:** Versionamento por criação de nova versão, não edição.

## DEC-010 — Primeiro Domínio: Catálogo, Custos e Preços

**Data:** 2026-08-18
**Decisão:** O primeiro módulo funcional será Catálogo, Custos e Preços.
**Contexto:** Necessidade central do negócio.
**Consequência:** PRC-01 a PRC-10 dedicados a este domínio.

## DEC-011 — Dados Clínicos Fora do Core

**Data:** 2026-08-18
**Decisão:** Dados clínicos sensíveis não pertencem ao Core geral.
**Contexto**: Proteção de dados sensíveis, LGPD.
**Consequência:** Módulo Clínica com isolamento próprio.
