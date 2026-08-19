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

## DEC-012 — Catálogo Genérico em Vez de Tabela Exclusiva de Exames

**Data:** 2026-08-18
**Decisão:** O catálogo mestre suporta múltiplos tipos de item (exames, procedimentos, consultas, pacotes, etc.) em vez de tabela exclusiva de exames.
**Contexto:** A Efetiva comercializa e operacionaliza serviços diversos, não apenas exames laboratoriais. Um catálogo genérico evita reestruturação futura.
**Consequência:** Campo `item_type` com CHECK constraint; prefixos de código variam por tipo; schema preparado para evolução.

## DEC-013 — Identificador Técnico UUID + Código Comercial Estável

**Data:** 2026-08-18
**Decisão:** PK é UUID; código comercial (`EXA-000001`) é atributo único por organização, imutável após ativação.
**Contexto:** UUID evita枚举 de IDs; código comercial é o identificador humano estável para comunicação interna.
**Consequência:** Constraint `unique(organization_id, code)`; código gerado server-side; não editável após ativação.

## DEC-014 — Aliases Separados do Nome Mestre

**Data:** 2026-08-18
**Decisão:** Nomes alternativos ficam em tabela separada (`catalog_item_aliases`) com normalização para busca.
**Contexto:** O mesmo item pode ser chamado de diversas formas (ex: "Hemograma", "Hemograma Completo", "HEMOGRAMA COMPLETO"). Aliases evitam duplicidade e suportam migração de legado.
**Consequência:** Nome mestre é único e imutável para identidade; aliases são auditáveis e indexados por nome normalizado.

## DEC-015 — Geração de Código Server-Side via Sequências PostgreSQL

**Data:** 2026-08-18
**Decisão:** Geração de código usando sequences PostgreSQL (`nextval`) com mapeamento centralizado tipo→prefixo.
**Contexto:** `MAX(code) + 1` sem proteção de concorrência causa race conditions. Sequências são atômicas e concorrente-seguras.
**Consequência:** Função `fn_catalog_next_code(item_type, org_id)`; uma sequence por tipo de item; prefixos centralizados na função `fn_catalog_item_prefix`.

## DEC-016 — Inativação/Arquivamento em Vez de Exclusão Histórica

**Data:** 2026-08-18
**Decisão:** Itens e categorias nunca são excluídos fisicamente quando possuem dependências ou histórico. Utilizar inativação (status) e arquivamento.
**Contexto:** Integridade referencial e histórico de auditoria. Exclusão destrói rastreabilidade.
**Consequência:** Status com lifecycle `draft→active→inactive→archived`; triggers protegem DELETE em categorias com filhos e itens com aliases.

## DEC-017 — Normalização de Texto para Busca e Comparação

**Data:** 2026-08-18
**Decisão:** Função `normalizeText()` centralizada para lowercase, remoção de acentos, colapso de espaços. Preserva texto original no cadastro.
**Contexto:** Busca e detecção de duplicidade exigem comparação consistente independente de caixa, acentos ou espaçamento.
**Consequência:** Normalização aplicada a aliases, busca e detecção de duplicidade; valor original sempre mantido para apresentação.

## DEC-018 — Infraestrutura Remota: GitHub + Supabase

**Data:** 2026-08-18
**Decisão:** Conectar o projeto ao GitHub (Rodrigo-Kotlin/efetivagestao, branch main) e Supabase remoto (scyxgyewdokmsuehgwql) via CLI, sem Docker local.
**Contexto:** PRC-00B — infraestrutura remota necessária para CI, deploy e colaboração. Conexão direta ao Postgres (IPv6) indisponível; utilizar connection pooler (IPv4, porta 6543).
**Consequência:**
- GitHub Actions CI: lint, typecheck, test, build, migration check
- Supabase link via `supabase link --project-ref scyxgyewdokmsuehgwql`
- Migrations aplicadas remotamente via `supabase db push --db-url <pooler-url>`
- `.env.local` configurado com URL e anon key reais (gitignored)
- Anon key segura: exposta apenas no browser, não em repositório
- Database password nunca commitada; usada apenas via CLI local
- CI usa GitHub Actions Variables (não Secrets) para `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (valores públicos para o browser)

## DEC-019 — Empresas como Entidade Base dos Fornecedores

**Data:** 2026-08-18
**Decisão:** Tabela `companies` é a entidade base; fornecedor é uma empresa com `supplier_profile` associado.
**Contexto:** PRC-02 — Fornecedores e Mapeamentos. Uma empresa pode ser fornecedor ou não; o perfil de fornecedor é uma extensão opcional com categoria, contrato e pagamento.
**Consequência:** `companies` armazena dados cadastrais (razão social, CNPJ); `supplier_profiles` extende com role de fornecedor; `supplier_catalog_items` mapeia itens do catálogo ao código externo do fornecedor.

## DEC-020 — Mapeamento Fornecedor↔Item via RPC

**Data:** 2026-08-18
**Decisão:** Criação e preferência de mapeamentos via funções RPC (`fn_create_supplier_mapping`, `fn_set_preferred_mapping`) em vez de inserts diretos.
**Contexto:** Mapeamentos têm regras de negócio complexas: máximo um preferido por fornecedor+item, unicidade por fornecedor+item+unidade, vigências não sobrepostas. RPCs garantem atomicidade e validação server-side.
**Consequência:** UI chama RPCs; funções executam com privilégio DEFINER para contornar RLS em inserts transacionais; auditoria automática via triggers.

## DEC-021 — Aliases de Catálogo Estendidos para Fornecedores

**Data:** 2026-08-18
**Decisão:** Extensão de `catalog_item_aliases` com colunas `source_company_id`, `supplier_catalog_item_id` e `external_code`.
**Contexto:** PRC-02 — aliases podem originar-se de fornecedores (via mapeamento), não apenas de migração manual ou legado. Colunas nullable mantêm retrocompatibilidade.
**Consequência:** Função `fn_alias_supplier_source_integrity` valida integridade; trigger impede exclusão de mapeamento com alias vinculado; 3 novos valores de `source_type` ('supplier_*, 'supplier_unknown').

## DEC-022 — Server-Derived Actor Identity em Auditoria

**Data:** 2026-08-18
**Decisão:** `log_audit()` derivou actor_user_id exclusivamente de `auth.uid()`, nunca de parâmetro fornecido pelo chamador.
**Contexto:** PRC-02A — hardness de segurança. A função anterior aceitava `p_actor_user_id` como parâmetro, permitindo falsificação de ator por qualquer chamada direta.
**Consequência:** REVOKE EXECUTE de PUBLIC/anon/authenticated na função; triggers continuam funcionando via SECURITY DEFINER; overload antigo (7 params) removido explicitamente.

## DEC-023 — Server-Derived User ID em RPCs de Mapeamento

**Data:** 2026-08-18
**Decisão:** `fn_create_supplier_mapping` e `fn_set_preferred_mapping` derivam `auth.uid()` internamente; parâmetro `p_user_id` removido da assinatura.
**Contexto:** PRC-02A — o frontend não deve enviar identidade de usuário para funções server-side. O servidor é a fonte de verdade para identidade.
**Consequência:** created_by/updated_by/confirmed_by são derivados de `auth.uid()`; overloads antigos (12 params e 2 params) removidos explicitamente; frontend atualizado para nova assinatura.

## DEC-024 — Supplier Ativo Obrigatório para Mapeamento

**Data:** 2026-08-18
**Decisão:** Apenas fornecedores com `supplier_profiles.status = 'active'` podem receber mapeamentos ou serem definidos como preferidos.
**Contexto:** PRC-02A — integridade de dados. Fornecedores inativos ou bloqueados não devem participar de mapeamentos ativos.
**Consequência:** `fn_create_supplier_mapping` valida `supplier_profiles.status = 'active'`; `fn_set_preferred_mapping` valida status do mapping E do supplier; CHECK constraint `chk_sci_preferred_requires_active` impede `is_preferred=true` com `status != 'active'`.

## DEC-025 — Integridade Referencial Completa de Aliases

**Data:** 2026-08-18
**Decisão:** `fn_alias_supplier_source_integrity` valida integralmente: mapping existe, organization_id confere, catalog_item_id confere, source_company_id confere.
**Contexto:** PRC-02A — aliases de fornecedor devem referenciar mapeamentos consistentes. Validação parcial (apenas company_id) era insuficiente.
**Consequência:** Trigger valida 4 campos contra a tabela `supplier_catalog_items` em uma única consulta; aliases com referências inconsistentes são rejeitados com erro claro.

## DEC-026 — Tabelas de Custo com Versionamento Temporal

**Data:** 2026-08-18
**Decisão:** Custos de fornecedores são gerenciados via tabelas versionadas com vigência `[from, to)` e workflow draft→under_review→approved→scheduled→active→superseded.
**Contexto:** PRC-03 — custos devem ser imutáveis após publicação, com suporte a comparação entre versões e resolução temporal automática.
**Consequência:** 3 tabelas (`supplier_cost_tables`, `supplier_cost_table_versions`, `supplier_cost_items`), 10 RPCs, 12 políticas RLS, 6 permissões, proteção de sobreposição de vigência, imutabilidade de itens publicados.

## DEC-027 — Session Variable RPC Signal

**Data:** 2026-08-18
**Decisão:** Usar `set_config('app.cost_rpc_active', 'true', true)` como sinal de que uma mudança de status vem de uma RPC autorizada, em vez de criar triggers duplicados ou modifier security.
**Contexto:** PRC-03A — triggers BEFORE UPDATE precisam distinguir entre UPDATEs diretos (bloqueados) e UPDATEs vindos de RPCs (permitidos). A variável de sessão é transaction-scoped e requer auth context.
**Consequência:** `fn_validate_version_transition` e `fn_sctv_protect_published_fields` verificam `current_setting('app.cost_rpc_active', true) = 'true'`; todas as RPCs de status definem a flag antes de UPDATEs; RPCs são SECURITY DEFINER com search_path = public.

## DEC-028 — H13: Two-Statement Publish for Scheduled Versions

**Data:** 2026-08-18
**Decisão:** Publicação de versões scheduled usa duas statements UPDATE separadas em vez de uma multi-row UPDATE ou SET CONSTRAINTS DEFERRED.
**Contexto:** PRC-03A H13 — o EXCLUDE constraint GiST (`chk_sctv_no_overlap`) com partial WHERE clause checa por statement end. Multi-row UPDATE causa false-positive porque o processamento de rows é não-determinístico; SET CONSTRAINTS DEFERRED não funciona para EXCLUDE constraints no PostgreSQL. Solução: Statement 1 supersede TODAS outras active/scheduled (removendo-as do WHERE clause do EXCLUDE); Statement 2 publica a nova versão (única row no WHERE clause → sem overlap).
**Consequência:** `fn_publish_cost_version` sempre supersede primeiramente todas as versões concorrentes, depois publica; validade do predecessor é fechada apenas quando `v_valid_from > valid_from` para evitar ranges inválidos. **Refinado pelo DEC-029 (PRC-03B):** no caso de publicação futura, o predecessor NÃO é mais superseded — apenas seu `valid_to` é fechado, e a EXCLUDE passa por adjacência de ranges.

## DEC-029 — Temporal Cutover Semantics (PRC-03B)

**Data:** 2026-08-18
**Decisão:** Publicação futura mantém o predecessor ACTIVE com `valid_to` fechado na data de início da nova versão; resolução temporal é date-driven (inclui versões `scheduled`); ativação do schedule é feita por RPC idempotente `fn_sync_cost_version_status`.
**Contexto:** PRC-03B — finalizar semântica temporal e reprodutibilidade de migração. Publicar uma versão futura B não deve "remover" o custo corrente A antes do tempo: A permanece `active` com range `[A.valid_from, B.valid_from)` e B torna-se `scheduled` `[B.valid_from, ∞)`. Ranges adjacentes não se sobrepõem, satisfazendo a EXCLUDE `chk_sctv_no_overlap` sem superseder A.
**Consequência:**
- `fn_publish_cost_version` (v8): para `valid_from > current_date` → fecha `valid_to` do predecessor active, supersede apenas versões scheduled sobrepostas e publica como `scheduled`; para `valid_from <= current_date` → comportamento anterior (supersede todas, publica `active`).
- `fn_resolve_supplier_cost` (v2): filtro de status passa a incluir `'scheduled'` — resolução é por data (`reference_date >= valid_from`), não por status. `resolve(B.valid_from)` retorna B mesmo antes do cutover.
- `fn_sync_cost_version_status` (novo): RPC SECURITY DEFINER idempotente que ativa versões scheduled cujo range cobre `p_reference_date` (default `current_date`) e supersede o predecessor. Pode ser chamado por cron/agendador repetidamente; segunda chamada retorna 0.
- Migração 025: DDL/RPC idempotente que leva qualquer banco no estado 023/024 ao estado final; migrations 001-024 permanecem imutáveis.

## DEC-030 — Frontend Version Workflow via RPCs (PRC-03B)

**Data:** 2026-08-19
**Decisão:** O frontend não executa UPDATE direto de `status` em `supplier_cost_table_versions`. Todas as transições do workflow (submit/approve/publish) são feitas exclusivamente pelas RPCs `fn_submit_cost_version`, `fn_approve_cost_version` e `fn_publish_cost_version` via `supabase.rpc(...)`, sem fabricar `approved_by`/`published_by`/`status` no cliente.
**Contexto:** PRC-03B — a integração frontend×backend estava desalinhada: a página de detalhe da versão chamava `updateCostTableVersionStatus` (UPDATE direto), o que é bloqueado pelos triggers do PRC-03A (`fn_validate_version_transition`, sinal `app.cost_rpc_active`). O caminho correto já existia no backend desde a 022/023.
**Consequência:**
- `updateCostTableVersionStatus` foi removida; novas funções de API (`submitCostVersion`, `approveCostVersion`, `publishCostVersion`, `syncCostVersionStatus`) encapsulam as RPCs; erros mapeados por `mapCostWorkflowError` para mensagens amigáveis.
- Hooks explícitos `useSubmitCostVersion`/`useApproveCostVersion`/`usePublishCostVersion`/`useSyncCostVersionStatus` com estado loading/erro e guarda anti-duplicidade; a página refaz o fetch após mutação bem-sucedida (estado autoritativo do servidor).
- Botões de ação dependem de status **e** permissão RBAC (`pricing.cost.create` para submit, `pricing.cost.approve` para approve, `pricing.cost.publish` para publish); `scheduled`/`active`/`superseded`/`cancelled` são somente leitura.
- Status canônico consolidado em `COST_VERSION_STATUSES` (7 estados); `VERSION_STATUSES`/`VersionStatus` duplicados (com `expired` inexistente) foram removidos.
- Testes UI-WF01..06 cobrem submit/approve/publish via RPC, bloqueio por permissão, erro amigável e refetch pós-mutação.
