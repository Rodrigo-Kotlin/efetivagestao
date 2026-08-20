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

## DEC-031 — Fórmulas Canônicas de Margem e Markup (PRC-04)

**Data:** 2026-08-19
**Decisão:** Margem é calculada sobre o preço (`margin_rate = (price - total_cost) / price`, `price = total_cost / (1 - margin_rate)`, `0 <= margin_rate < 1`); markup é calculado sobre o custo (`markup_rate = (price - total_cost) / total_cost`, `price = total_cost * (1 + markup_rate)`, `markup_rate >= 0`).
**Contexto:** PRC-04A — formação de preço. Margem e markup não são sinônimos; 20% de margem (custo 80 → 100) ≠ 20% de markup (custo 80 → 96). O motor de precificação e todos os artefatos (banco, RPC, frontend, rótulos, testes, docs) devem manter a distinção.
**Consequência:** Documentado em `docs/PRICING_ENGINE.md` (seção 4); PRC-04B implementa as fórmulas em RPC autoritativa e valida as entradas (`INVALID_MARGIN`, `INVALID_MARKUP`).

## DEC-032 — Aritmética Autoritativa em PostgreSQL numeric (PRC-04)

**Data:** 2026-08-19
**Decisão:** Todo cálculo financeiro autoritativo usa PostgreSQL `numeric`; jamais float. Frontend JavaScript só para preview temporário de UX; resultado validado/persistido vem da RPC PostgreSQL.
**Contexto:** PRC-04A — precisão financeira. Custos já usam `numeric(14,4)`.
**Consequência:** Recomendação de precisão: montantes/custos `numeric(14,4)`; taxas (fração decimal) `numeric(9,6)`; passos de arredondamento `numeric(12,4)`; percentuais derivados na apresentação. Nenhuma migration criada nesta fase.

## DEC-033 — Custo Sempre Resolvido por fn_resolve_supplier_cost (PRC-04)

**Data:** 2026-08-19
**Decisão:** O custo-base do motor de preço origina-se exclusivamente de `fn_resolve_supplier_cost(org, supplier_company, catalog_item, cost_reference_date)`. Proibida qualquer outra fonte independente de custo.
**Contexto:** PRC-04A — baseline não-negociável. O resolver já é a fonte autoritativa verificada (PRC-03B), com resolução temporal, mapping e versionamento.
**Consequência:** O motor repassa a data de referência ao resolver e usa apenas linhas `resolution_status = 'CONFIRMED'`; nunca decide por conta própria qual versão de custo usar.

## DEC-034 — Custo Desconhecido Bloqueia Cálculo Normal (PRC-04)

**Data:** 2026-08-19
**Decisão:** Se o resolver retornar `COST_NOT_CONFIRMED`, o motor não calcula preço normal a partir de zero, NULL convertido, último custo conhecido sem proveniência ou fallback de frontend. Resposta: `PRICE_NOT_CALCULABLE`/`COST_NOT_CONFIRMED`.
**Contexto:** PRC-04A — `UNKNOWN COST != ZERO`. `confirmed_zero` é custo confirmado válido e não é desconhecido.
**Consequência:** Regra crítica preservada no spec (`docs/PRICING_ENGINE.md` seção 11); PRC-04B a implementa na RPC.

## DEC-035 — Arredondamento Antes da Validação Final de Margem (PRC-04)

**Data:** 2026-08-19
**Decisão:** O arredondamento (NONE/NEAREST/UP/DOWN + passo) ocorre após a fórmula de precificação e antes das validações finais; margem e markup são recalculados com o `final_price`.
**Contexto:** PRC-04A — o preço comercialmente exibido é o arredondado; validar margem sobre valor não arredondado causaria falsos OK/false violations.
**Consequência:** A ordem do pipeline (seção 17) e o modelo de violações (BELOW_COST/BELOW_MINIMUM_MARGIN) são avaliados sobre o preço final.

## DEC-036 — Preço Calculado Separado do Preço Comercial Publicado (PRC-04)

**Data:** 2026-08-19
**Decisão:** `CALCULATED PRICE != PUBLISHED COMMERCIAL PRICE`. O PRC-04 produz preço calculado/simulado; o PRC-05 publica tabelas comerciais com vigência de venda.
**Contexto:** PRC-04A — fronteira de escopo. Evitar confusão conceitual entre motor de precificação e gestão de tabelas comerciais.
**Consequência:** Nenhuma persistência de preço comercial no PRC-04; simulações não são persistidas automaticamente; a separação é refletida em banco, RPC, frontend, rótulos, testes e documentação.

## DEC-037 — Versionamento de Política de Preço (PRC-04)

**Data:** 2026-08-19
**Decisão:** Políticas de preço usam o mesmo lifecycle do domínio de custos: `draft → under_review → approved → scheduled/active → superseded/cancelled`, com vigência `[valid_from, valid_to)` e versões ativas/aprovadas imutáveis.
**Contexto:** PRC-04A — coerência conceitual e reuso de RPCs/telas de workflow existentes; não confundir versão de política com versão de tabela comercial.
**Consequência:** Entidades conceituais `pricing_policies`, `pricing_policy_versions`, `pricing_policy_components`; resolução por data de referência incluindo `scheduled`.

## DEC-038 — Componentes Percentuais Não Circulares (PRC-04)

**Data:** 2026-08-19
**Decisão:** Em v1, componentes percentuais de custo usam base não circular (`base_cost` ou subtotal já resolvido); proibido percentual sobre o preço final de venda; sem motor tributário/fiscal.
**Contexto:** PRC-04A — evitar fórmulas circulares (`price depende de imposto; imposto depende de price`) e simplificar o modelo inicial.
**Consequência:** Tipos de componente FIXED e PERCENTAGE_OF_BASE_COST; total_cost = base + fixos + percentuais; cada componente rastreável no breakdown.

## DEC-039 — Alocação Automática de version_number Adiada para o Workflow RPC (PRC-04B)

**Data:** 2026-08-19
**Decisão:** No schema de política de preço (PRC-04B), `pricing_policy_versions.version_number` é obrigatório e único por política (`UNIQUE (pricing_policy_id, version_number)`), mas a alocação automática do número da versão fica adiada para as RPCs de workflow do PRC-04C. Nenhum trigger do schema (inclusive `fn_ppv_validate_status_transition`) atribui `version_number` automaticamente.
**Contexto:** PRC-04B — no domínio de custos, `fn_create_cost_version` (022) atribui o `version_number` automaticamente. Para políticas de preço, o escopo do PRC-04B é o modelo de dados confiável (integridade/RLS/RBAC); as RPCs de criação/transição de versão pertencem ao PRC-04C. Antecipar a alocação agora exigiria decidir o contrato das RPCs antes da fase de engine.
**Consequência:** O schema garante apenas integridade (obrigatoriedade via NOT NULL + unicidade); o cliente/API deve informar `version_number` ao criar uma versão até o PRC-04C introduzir as RPCs de workflow; a transição de status é validada por trigger com gate `app.pricing_rpc_active`.

## DEC-040 — pricing.calculate Permission Separated from Policy Management (PRC-04C)

**Data:** 2026-08-19
**Decisão:** Cálculo/simulação de preço usa permissão `pricing.calculate` separada das permissões de gestão de política (`pricing.policy.create/edit/publish`). Um usuário pode calcular preços sem necessariamente ter permissão para criar ou publicar políticas.
**Contexto:** PRC-04C — separação de responsabilidades. Operadores precisam simular preços diariamente; apenas gestores/admins devem criar/publicar políticas. Exigir `pricing.policy.publish` para calcular seria excessivo.
**Consequência:** `pricing.calculate` concedida a admin, manager e operator; `pricing.policy.publish` mantida exclusiva para admin; `fn_simulate_price` verifica `pricing.calculate` independente das permissões de política.

## DEC-041 — Pure Calculation vs Orchestration RPC (PRC-04C)

**Data:** 2026-08-19
**Decisão:** O motor de precificação é dividido em duas funções: `fn_calculate_price` (camada matemática pura, interna, não concedida a usuários autenticados) e `fn_simulate_price` (orquestração pública que autentica, valida, resolve custo/política e chama o calculador). A função interna não realiza resolução de custo ou política.
**Contexto:** PRC-04C — auditabilidade e segurança. Separar cálculo puro de orquestração facilita testes unitários do math layer e expõe menos superfície de ataque. A função pública não persiste preço comercial (PRC-05 boundary).
**Consequência:** `fn_calculate_price` é REVOKE de PUBLIC/anon/authenticated; `fn_simulate_price` é a única entrada pública; proveniência completa é construída na camada de orquestração.

## DEC-042 — Dedicated E2E Test Identity Standardization (PRC-04C)

**Data:** 2026-08-19
**Decisão:** Testes remotos E2E usam variáveis de ambiente canônicas `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD` e `VITE_SUPABASE_ANON_KEY`. Fallback para `PRC03A_TEST_EMAIL`/`PRC03A_TEST_PASSWORD` é mantido por retrocompatibilidade. Novos testes não devem criar nomes de variáveis específicos de fase.
**Contexto:** PRC-04C — a conta de teste canônica deve ser identificável e reutilizável entre fases. Criar variáveis de ambiente por fase (PRC03A_*, PRC04B_*) causa fragmentação e dificulta manutenção.
**Consequência:** Testes verificam `E2E_TEST_EMAIL` primeiro, fallback para `PRC03A_TEST_EMAIL`; se ambas ausentes, reportam `E2E TEST USER: USER ACTION REQUIRED`; credenciais nunca são commitadas ou expostas.

## DEC-043 — Simulation Non-Persistence (PRC-04C)

**Data:** 2026-08-19
**Decisão:** `fn_simulate_price` calcula preços autoritativos mas NÃO persiste resultados em nenhuma tabela. Simulações são Stateless — cada chamada recalcula do zero. Persistência de preços comerciais pertence exclusivamente ao PRC-05.
**Contexto:** PRC-04C — fronteira de escopo. Persistir cada simulação criaria volume desnecessário de registros e confundiria o conceito de "preço calculado" com "preço publicado". Auditoria de simulações importantes pode ser implementada no futuro se necessário.
**Consequência:** Nenhuma tabela de persistência de simulação é criada; resultado retornado como JSONB volatile; decision logico futuramente pode adicionar audit_logs para mutações de workflow (já existentes via triggers 027).

## DEC-044 — Concurrency-Safe Version Number via FOR UPDATE Lock (PRC-04C)

**Data:** 2026-08-19
**Decisão:** `fn_create_pricing_policy_version` usa `SELECT ... FOR UPDATE` na row da política pai para serializar a alocação de `version_number`. Duas chamadas concorrentes para a mesma política produzem números distintos sem erros de duplicata.
**Contexto:** PRC-04C — DEC-039 adiou a alocação para PRC-04C; o padrão idêntico já está validado no domínio de custos (`fn_create_cost_version` em 023). Sequências PostgreSQL não são aplicáveis porque o contador é por política, não global.
**Consequência:** `FOR UPDATE` na row da política bloqueia concorrentes; `MAX(version_number) + 1` é atômico sob lock; transactions abortadas liberam o lock normalmente; dois INSERTs simultâneos para a mesma política recebem versões consecutivas.

## DEC-045 — Commercial Price Is Explicit Published Snapshot (PRC-05A)

**Data:** 2026-08-19
**Decisão:** O preço comercial publicado (`commercial_price_items.price_amount`) é um valor explícito e congelado — um snapshot. O motor de precificação (PRC-04) nunca altera automaticamente um preço publicado; mudanças em custo/política/margem exige nova versão de tabela.
**Contexto:** PRC-05A — `CALCULATED PRICE != PUBLISHED COMMERCIAL PRICE` (DEC-036). Preço derivado do motor é valor inicial (snapshot), não ponteiro vivo; preço manual é conceito de negócio permitido.
**Consequência:** `price_amount numeric(14,4)` sempre explícito em PRC-05B; proveniência (`source_*`/`pricing_snapshot`) descreve o que era conhecido na publicação; nenhuma fórmula viva em tabelas publicadas.

## DEC-046 — Commercial Table Stable Identity + Temporal Versions (PRC-05A)

**Data:** 2026-08-19
**Decisão:** `commercial_price_tables` é identidade estável (`active`/`inactive`, sem preços); `commercial_price_table_versions` carrega vigência `[valid_from, valid_to)` e lifecycle `draft→under_review→approved→scheduled/active→superseded/cancelled`; `commercial_price_items` carrega o preço por item.
**Contexto:** PRC-05A — espelha os modelos já validados de custo (PRC-03) e política (PRC-04, DEC-037), reutilizando RPCs/telas de workflow. Semântica de publicação futura e resolução por data seguem PRC-03B (DEC-028/029).
**Consequência:** Modelo de 3 tabelas (mais `commercial_price_exceptions` opcional); EXCLUDE temporal sobre versões active/scheduled; version_number server-side com FOR UPDATE (padrão DEC-044).

## DEC-047 — Missing Commercial Price != Zero Commercial Price (PRC-05A)

**Data:** 2026-08-19
**Decisão:** Item de catálogo ausente de uma versão de tabela → `PRICE_NOT_FOUND`; linha explícita com `price_amount = 0` → `RESOLVED` com preço zero real (serviço incluído/gratuito). Nunca materializar preço ausente como 0.
**Contexto:** PRC-05A — análogo a `UNKNOWN COST != ZERO` (DEC-034) no domínio de custo. CHECK do schema deve permitir `price_amount >= 0`, não `> 0`.
**Consequência:** O resolver `fn_resolve_commercial_table_price` (PRC-05C) retorna status distintos para ausente vs zero; UI nunca mostra R$ 0,00 para item sem preço.

## DEC-048 — Manual vs Pricing-Engine Commercial Origin (PRC-05A)

**Data:** 2026-08-19
**Decisão:** `origin_type` em itens comerciais: `manual` (usuário informa montante explícito) ou `pricing_engine` (preço iniciado a partir de `fn_simulate_price` como snapshot). Em ambos, o montante publicado é explícito; preço manual é permitido e não precisa igualar a recomendação do motor.
**Contexto:** PRC-05A — separar origem comercial de cálculo de comparação; não rotular preços manuais como gerados pelo motor.
**Consequência:** Proveniência do motor é NULL para manual; comparações de margem/risco usam exclusivamente saída autoritativa do motor, sem duplicar fórmulas.

## DEC-049 — Published Commercial Version Immutability (PRC-05A)

**Data:** 2026-08-19
**Decisão:** Versões de tabela comercial fora de `draft` têm itens imutáveis; correção de preço exige nova versão. Aplicação concreta do princípio DEC-009 ao modelo de versões comerciais; clonagem de versão é o caminho de correção (copiar preços, ajustar selecionados).
**Contexto:** PRC-05A — não reescrever história comercial; versioning por criação de nova versão, não edição.
**Consequência:** PRC-05B implementa triggers/RLS de imutabilidade (padrão `fn_*_protect_published_fields`) e clonagem server-side atômica em PRC-05C; linhagem `source_commercial_price_item_id` distingue herança de valor novo.

## DEC-050 — Client Assignment Deferred to PRC-06 / Final Resolution to PRC-07 (PRC-05A)

**Data:** 2026-08-19
**Decisão:** PRC-05 cria tabelas comerciais reutilizáveis e NÃO inclui `client_id`/`customer_id`/override por cliente em itens comerciais. Atribuição de tabelas e overrides a clientes pertence ao PRC-06; precedência global (override de cliente > tabela atribuída > segmento/grupo/canal > tabela padrão) pertence ao PRC-07. Default de tabela (`is_default`) é adiado para PRC-07.
**Contexto:** PRC-05A — fronteira de escopo; evitar acoplar PRC-05 ao design futuro do resolver global.
**Consequência:** `commercial_price_items` sem dimensões de cliente/segmento/canal; resolver de tabela (`fn_resolve_commercial_table_price`) cobre apenas "item dentro de tabela em data", não precedência global.

## DEC-051 — Commercial Price Schema: Integrity, RLS & RBAC with Dedicated NULL-Safe Workflow Gate (PRC-05B)

**Data:** 2026-08-19
**Decisão:** Implementar o modelo PRC-05A em migrations 032/033: 4 tabelas comerciais (`commercial_price_tables`, `commercial_price_table_versions`, `commercial_price_items`, `commercial_price_exceptions`); integridade estrutural/temporal/cross-tenant (EXCLUDE GiST, same-org triggers, proveniência com FKs RESTRICT, linhagem same-table, snapshot do catálogo server-derived); workflow controlado por gate dedicado **`app.commercial_price_rpc_active`**; imutabilidade de não-draft; hard-delete guards; RBAC `pricing.commercial.*` (7 permissões); RLS; auditoria. Checkpoint: `COMMERCIAL_PRICE_SCHEMA_VERIFIED` (COM-H01..H57, 61/61 checks).
**Contexto:** PRC-05B — o schema precisa da mesma robustez já validada em custos (023) e políticas (026/027). Decisões normativas incorporadas:
- **Gate NULL-safe:** `current_setting('app.commercial_price_rpc_active', true) = 'true'` retorna NULL quando ausente; `IF NOT v_is_rpc THEN RAISE` tratava NULL como falso e permitia transições sem RPC. Corrigido com `COALESCE(..., false)` nos 3 triggers de workflow (`fn_cptv_validate_status_transition`, `fn_cptv_protect_published_fields`, `fn_cpe_status_transition`) e verificado por repro SQL + COM-H48.
- **Revokes:** triggers executam com o papel da DML (convenção 022/023/027) — REVOKE de `PUBLIC`/`anon` apenas; `authenticated` mantém EXECUTE (revogar quebrava os triggers).
- **Normalizador encoding-safe:** `fn_normalize_commercial_code` implementada com `chr()` (ASCII puro) porque UTF-8 literals eram mojibake'd na entrega remota (`á` → `Ã¡`).
- **Exceções append-only:** sem policy de DELETE (RLS filtra silenciosamente, 0 linhas) + `fn_cpe_delete_guard` no banco; decisão de status exige gate + `exception_approve`.
- **`pricing.price.publish` deprecado:** placeholder legado permanece no banco com 0 mapeamentos; o conjunto ativo é `pricing.commercial.*`.
**Consequência:** Migrations 032/033 aplicadas remotamente (33/33); testes remotos COM-H01..H57 passam; regressões pricing-engine 50/50, política 33/33 e custo 34/34 permanecem verdes; workflow RPCs/clone/publish/resolver permanecem em PRC-05C.

## DEC-052 — Commercial Price Workflow, Clone, Publish, Resolver + Forward Integrity Hardening (PRC-05C)

**Data:** 2026-08-20
**Decisão:** Implementar a camada de workflow autoritativa sobre o esquema PRC-05B em migrations **034** (workflow + forward integrity) e **035** (resolver):
- **Forward-only hardening (3 triggers):**
  - **A1** — `fn_cptv_parent_active` (BEFORE INSERT ON `commercial_price_table_versions`): inactive parent não recebe nova versão via RPC nem DML. Fecha a lacuna da PRC-05A §6 sem editar 032.
  - **A2** — `fn_cpi_engine_provenance_guard` (BEFORE INSERT/UPDATE ON `commercial_price_items`): `origin_type='pricing_engine'` direto via REST é bloqueado; apenas `fn_add_commercial_price_item_from_engine` e o clone (gate setado internamente) podem inserir/atualizar itens com proveniência de motor.
  - **A3** — `fn_cpe_parent_editable` (BEFORE INSERT ON `commercial_price_exceptions`): novos pedidos de exceção bloqueados quando o pai está em `scheduled|active|superseded|cancelled` — invariante incondicional.
- **Workflow RPCs (034):** tabela (create/update/status), versão (concurrency-safe `FOR UPDATE`), itens (manual/engine/clone/bulk), exceções (request/decide), workflow (submit/return/approve/cancel), validador de publicação read-only, publish + sync cutover idempotente. Todas derivam `auth.uid()`, verificam `is_member_of` + `has_permission(permissão)` por chamada, são SECURITY DEFINER + `SET search_path = public`, REVOKE FROM PUBLIC/anon, GRANT TO authenticated (quando aplicante).
- **Resolver (035):** `fn_resolve_commercial_table_price(org, table, item, ref_date)` retorna JSONB com status machine-readable `RESOLVED|TABLE_NOT_FOUND|VERSION_NOT_FOUND|PRICE_NOT_FOUND`. Tie-break determinístico (`valid_from DESC, version_number DESC, created_at DESC, id DESC`). Tabela inativa permanece historicamente resolúvel. Zero vs missing preservados (DEC-047). Permissão `pricing.commercial.view` exigida. Escopo table-specific — sem precedência global (PRC-07).
- **Publicação e temporal:** imediata `valid_from <= today` → `active` + supersede; futura `valid_from > today` → `scheduled` + predecessora `active` com `valid_to = B.valid_from` + supersede scheduled sobreposta (DEC-028/029 aplicados a comercial). Cutover idempotente `fn_sync_commercial_price_version_status`.
- **Validador:** `fn_validate_commercial_price_version` é o gate autoritativo para publicação; **NÃO reimplementa fórmulas** (DEC-040) — só inspeciona snapshot confiável para derivar exceções obrigatórias (BELOW_COST / BELOW_MINIMUM_MARGIN / COMMERCIAL_DEVIATION).

**Contexto:** PRC-05C — auditoria de pré-implementação identificou três lacunas estruturais no 032/033 (A1, A2, A3) que não podiam ser adiadas: inativar pai continuava permitindo nova versão via DML direto; provenance de motor podia ser fabricada pelo browser; exceções podiam ser abertas contra versões já publicadas. A semântica temporal replica DEC-028/029 para evitar inventar um terceiro modelo. O validador consulta snapshots do motor (DEC-040), nunca recalcula margem/markup/custo no domínio comercial.

**Consequência:** Migrations 034/035 aplicadas remotamente (35/35 LOCAL == REMOTE). Checkpoint **`COMMERCIAL_PRICE_CORE_VERIFIED`** atingido:
- Regressões PRC-05B: COM-H01..H57 → 61/61 PASS (COM-H29 agora chama `fn_add_commercial_price_item_from_engine`; COM-H41 asserta policy resolvida via simulação; COM-H43 usa draft em vez de `pubVersion`).
- Workflow novo: CPW-H01..CPW-H85 → 85/85 PASS.
- Regressões de outros domínios: pricing-engine 50/50 · pricing-policy 33/33 · cost 34/34 · pricing-full-flow 49/49.
- Local: lint/typecheck/test 163/163/build limpos.
- Documentação atualizada (COMMERCIAL_PRICE_TABLES §62, DATABASE, RBAC, ROADMAP, DECISION_REGISTER).
- PRC-05 permanece IN PROGRESS (PRC-05D/E pendentes); PRC-05C = COMPLETED.

## DEC-053 — Commercial Price Table UI: Backend-Authoritative Frontend (PRC-05D)

**Data:** 2026-08-20
**Decisão:** Implementar a UI autoritativa de tabelas comerciais em `src/features/pricing/commercial/` como camada fina sobre as RPCs de PRC-05C. Princípios:
- **Backend é autoritativo para tudo:** margem/markup/custo/min-margin/below-cost/validação/tie-break/preço-final. UI nunca recalcula nem valida regras de negócio.
- **Mutação exclusivamente via RPC:** zero `UPDATE commercial_price_* status` no frontend. Wrappers em `api/commercialPrices.ts` chamam `fn_*_commercial_price_*`.
- **Proveniência server-derived:** UI nunca envia `source_*`; somente parâmetros de negócio (catalog_item, supplier, ref_date, discount, commercial_price opcional). A2 do 034 fecha o gap no backend.
- **Zero vs missing são distintos:** `formatCurrency(0)` = "R$ 0,00" (preço válido); `PRICE_NOT_FOUND` = texto explícito "Item sem preço nesta versão". Nunca converter missing → 0.
- **Recálculo sempre autoritativo:** após clone/bulk/exception/workflow/publicação o componente chama `refetch()` + `refetchReadiness()`. UI não mantém estado otimista para mutações temporais.
- **Resolver read-only:** `fn_resolve_commercial_table_price` é a única fonte de verdade para `RESOLVED|TABLE_NOT_FOUND|VERSION_NOT_FOUND|PRICE_NOT_FOUND`. UI não faz fallback nem override.
- **RBAC UX-only:** 7 permissões `pricing.commercial.*` + `pricing.calculate` para o motor. Cada `CommercialWorkflowActions` é state + permission aware. Backend revalida.
- **Validador é autoritativo:** `PublishReadinessPanel` exibe resultado de `fn_validate_commercial_price_version` mapeando blockers (`VERSION_NOT_APPROVED`, `VERSION_EMPTY`, `PENDING_EXCEPTIONS`, `DENIED_EXCEPTIONS`, `MISSING_APPROVED_EXCEPTIONS`) para pt-BR. UI não reimplementa regras.
- **Version approval ≠ exception approval:** ações distintas ("Aprovar versão" vs "Aprovar exceção"); ambas requerem permissões distintas.

**Contexto:** PRC-05D — a UI precisa preservar todos os invariantes do 032/033/034/035 sem reintroduzir deriva entre cliente e servidor. Reutiliza os padrões de `pricing/policies` (Inner/ErrorBoundary, `useAuth().can(perm)`, hooks com `{data,loading,error,refetch}`, audit em toda mutação).

**Consequência:**
- Migrations 001–035 **inalteradas**; 0 novas migrations (gate backend já cobre tudo).
- 6 páginas + 17 componentes + 5 hooks + 6 rotas + dashboard card ativado.
- 7 permissões frontend; 0 mutação fora de RPC.
- Testes novos: `api.test.ts` (18), `rbac.test.tsx` (7), `resolver-readiness.test.tsx` (10), `workflow.test.tsx` (15), `engine-item.test.ts` (4) — **54/54 PASS**.
- Total geral: 217/217 PASS · lint OK · typecheck OK · build OK · 0 deps adicionadas.
- Auditoria estática: `service_role` ausente · UUIDs hardcoded ausentes · `UPDATE status` direto ausente · `.env` não versionado.
- Checkpoint **`COMMERCIAL_PRICE_UI_VERIFIED`** atingido.
- PRC-05E (Hardening full-stack) é o próximo passo.

## DEC-054 — Client Is a Role of `companies` (PRC-06A)

**Data:** 2026-08-20
**Decisão:** Manter `companies` como identidade canônica de empresas externas e representar o papel cliente por `client_profiles`, em relação um-para-um análoga a `supplier_profiles`. A mesma `company` pode ter papel fornecedor, cliente ou ambos. `client_profiles` não duplica `legal_name`, `trade_name`, `tax_id` ou `tax_id_normalized` e usa o vocabulário canônico `client`.
**Contexto:** PRC-06A precisa identificar clientes sem criar um segundo cadastro corporativo e sem expandir o domínio para CRM.
**Consequência:** PRC-06B criará extensão tenant-scoped mínima (`company_id`, `organization_id`, status e metadados comerciais/auditoria), com integridade same-org. Novo perfil nasce `active`; `inactive|blocked` exige mutação posterior com `pricing.client.edit`. Histórico de precificação impede exclusão destrutiva do papel cliente.

## DEC-055 — Client Assignment References Stable Commercial Table Identity (PRC-06A)

**Data:** 2026-08-20
**Decisão:** `client_commercial_table_assignments` referencia `commercial_price_tables.id`, nunca `commercial_price_table_versions.id` como alvo operacional. A atribuição representa a relação comercial com a tabela estável; PRC-05 continua selecionando a versão aplicável pela data.
**Contexto:** Vincular cliente a uma versão obrigaria regravação a cada publicação e quebraria a autoridade temporal de PRC-05.
**Consequência:** Publicar nova versão da tabela não altera a atribuição. IDs de versão/item podem existir apenas como evidência de uma resolução ou snapshot. Nova atribuição exige tabela ativa, mas inativação posterior não apaga a história.

## DEC-056 — Client Assignments Are Temporal and Immutable After Publish (PRC-06A)

**Data:** 2026-08-20
**Decisão:** Atribuições usam `[valid_from, valid_to)`, lifecycle `draft|under_review|approved|scheduled|active|superseded|cancelled` e cardinalidade máxima de uma tabela efetiva por organização+cliente+data. Ranges `active|scheduled` não podem sobrepor; adjacência é válida. Publicação retroativa é proibida em v1 e agenda publicada não pode ser substituída silenciosamente. Registros publicados são imutáveis e correção exige sucessor.
**Contexto:** Esta é a aplicação específica de DEC-008 ao relacionamento cliente→tabela, incluindo cardinalidade, workflow e publicação futura ainda não definidos pelas decisões globais.
**Consequência:** Publicação futura mantém o predecessor ativo até `new.valid_from`, agenda o sucessor e permite resolução por data antes do cutover físico. Histórico `superseded` permanece resolvível e não pode ser hard-deleted. PRC-06B instala gate de workflow NULL-safe que força criação como draft e bloqueia transição direta antes das RPCs PRC-06C.

## DEC-057 — Client Override Is an Explicit Item-Level Price Snapshot (PRC-06A)

**Data:** 2026-08-20
**Decisão:** `client_price_overrides` persiste preço explícito `price_amount numeric(14,4)` em BRL para `client_company_id + catalog_item_id`, com vigência, motivo obrigatório e snapshots server-derived de código/nome/tipo do item. O override é independente da tabela atribuída e pode existir sem atribuição base.
**Contexto:** O valor negociado precisa permanecer reproduzível quando atribuição, tabela, custos, política ou recomendação do motor mudarem.
**Consequência:** Não há fórmula viva, percentual, margem, markup ou recálculo dinâmico. Proveniência opcional de tabela (`source_reference_date`, table/version/item IDs e valor baseline) é evidência congelada, all-or-none e derivada por RPC confiável; DML direto não pode fabricá-la.

## DEC-058 — Explicit Zero Override Stops Fallback; Missing Override Does Not (PRC-06A)

**Data:** 2026-08-20
**Decisão:** Aplicar DEC-047 especificamente à futura precedência por cliente: override publicado com `price_amount = 0` retorna `RESOLVED` e é valor comercial explícito; ausência retorna `OVERRIDE_NOT_FOUND`. Somente a ausência permite ao PRC-07 avaliar a tabela atribuída.
**Contexto:** Em contratos, zero pode significar serviço incluído, cortesia ou pacote. Tratar zero como ausência mudaria a negociação e produziria fallback incorreto.
**Consequência:** Banco, RPC e UI não usam `COALESCE(..., 0)` nem truthiness para presença. `OVERRIDE_NOT_FOUND` nunca materializa preço zero.

## DEC-059 — Client Override Is the Negotiated Exception Record (PRC-06A)

**Data:** 2026-08-20
**Decisão:** Em PRC-06 v1, o próprio `client_price_overrides` é a exceção comercial negociada e percorre workflow de revisão/aprovação/publicação. Não criar `client_price_override_exceptions` sem um lifecycle empresarial separado e comprovado. A aprovação usa `pricing.client.approve`; não há `pricing.client.override_approve` em v1.
**Contexto:** Um segundo registro de exceção repetiria cliente, item, preço e justificativa sem responsabilidade distinta e confundiria overrides com `commercial_price_exceptions` de PRC-05.
**Consequência:** Seis permissões `pricing.client.view|create|edit|review|approve|publish`; admin possui todas, manager não publica, operator/viewer somente visualizam. Segregação adicional exige nova decisão futura.

## DEC-060 — PRC-06 Component Resolvers; PRC-07 Owns Final Price Precedence (PRC-06A)

**Data:** 2026-08-20
**Decisão:** PRC-06C implementará dois resolvers isolados: `fn_resolve_client_table_assignment(org, client, date)` com `RESOLVED|CLIENT_NOT_FOUND|ASSIGNMENT_NOT_FOUND`, e `fn_resolve_client_price_override(org, client, item, date)` com `RESOLVED|CLIENT_NOT_FOUND|ITEM_NOT_FOUND|OVERRIDE_NOT_FOUND`. Ambos resolvem `active|scheduled|superseded` por `[valid_from, valid_to)` com tie-break determinístico. Nenhum compõe o preço final.
**Contexto:** DEC-050/052 reservam precedência global para PRC-07; esta decisão fecha os contratos específicos dos dois componentes PRC-06 sem duplicar o resolver table-specific de PRC-05.
**Consequência:** PRC-07 combinará override e tabela atribuída, inicialmente com override acima da tabela. Segmento, grupo, canal, default-table e `fn_resolve_final_client_price` ficam fora de PRC-06.
