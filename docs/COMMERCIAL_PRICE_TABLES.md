# Tabelas Comerciais de Preço — PRC-05

**Status:** Especificação autoritativa (PRC-05A) · Schema/Integridade/RLS/RBAC **implementado e verificado (PRC-05B — `COMMERCIAL_PRICE_SCHEMA_VERIFIED`)** · **Workflow/Clone/Publish/Resolver implementados e verificados (PRC-05C — `COMMERCIAL_PRICE_CORE_VERIFIED`)** · UI em PRC-05D · Verificação end-to-end em PRC-05E
**Baseline:** PRC-04E fechado — `PRICING_ENGINE_VERIFIED` · Migrations 001–033 imutáveis · Migrations **034–035** (PRC-05C) · Testes remotos **COM-H01..COM-H57 (61/61 checks)** + **CPW-H01..CPW-H85 (85/85 checks, 0 falhas)**
**Fonte de custo autoritativa:** `fn_resolve_supplier_cost(...)` (PRC-03B)
**Fonte de preço calculado autoritativa:** `fn_simulate_price(...)` (PRC-04C)
**Documentos de referência:** `docs/PRICING_ENGINE.md` · `docs/PRICING_COSTS.md` · `docs/RBAC.md` · `docs/DATABASE.md` · `docs/DECISION_REGISTER.md`

---

## 1. Propósito

Definir o modelo funcional, matemático, temporal e de segurança **das Tabelas Comerciais de Preço** antes de qualquer implementação de schema.

PRC-05 introduz a distinção operacional entre:

- **PREÇO CALCULADO / RECOMENDADO** — produzido pelo motor de precificação (PRC-04), que calcula e explica um preço recomendado.
- **PREÇO COMERCIAL PUBLICADO** — o preço oficialmente disponível para uso comercial, registrado numa tabela comercial com vigência de venda.

O motor de PRC-04 responde "**qual preço devemos cobrar?**". PRC-05 determina "**qual preço publicamos oficialmente para venda?**". O preço publicado é um **valor explícito e congelado** (snapshot), nunca um ponteiro vivo para cálculo.

Esta fase é **somente especificação**. Não cria migrations, RPCs, páginas ou código de aplicação.

## 2. Fronteira Conceitual

As três fronteiras devem permanecer explícitas em banco, RPC, frontend, rótulos, testes e documentação:

### A. Motor de Precificação (PRC-04) — `CALCULATED / RECOMMENDED PRICE`

- Pergunta: **"Qual preço devemos cobrar?"**
- Produto: preço calculado/simulado, proveniente e determinístico.
- Não persiste preço comercial. `fn_simulate_price` é stateless (DEC-043).
- Fronteira protegida por DEC-036: `CALCULATED PRICE != PUBLISHED COMMERCIAL PRICE`.

### B. Publicação Comercial (PRC-05) — `PUBLISHED COMMERCIAL PRICE`

- Pergunta: **"Qual preço publicamos oficialmente para venda?"**
- Produto: tabela comercial reutilizável, com versões temporalmente válidas, itens com preço explícito congelado, proveniência e snapshot do catálogo.
- Não atribui preços a clientes.

### C. Resolução para Cliente (PRC-06 + PRC-07)

- PRC-06 pergunta **"Qual tabela/preço comercial se aplica a este cliente?"** — atribui tabelas e overrides explícitos a clientes.
- PRC-07 pergunta **"Dado todas as regras aplicáveis, qual é o preço comercial final?"** — resolve precedência global (override de cliente > tabela atribuída > segmento/grupo/canal > tabela padrão).

| Pergunta | Fase |
|----------|------|
| Qual preço devemos cobrar? | PRC-04 |
| Qual preço publicamos oficialmente para venda? | PRC-05 |
| Qual tabela/preço se aplica a este cliente? | PRC-06 |
| Qual é o preço comercial final? | PRC-07 |

## 3. Escopo

### Dentro do PRC-05

1. Identidade estável de tabela comercial
2. Versionamento de tabela comercial
3. Itens comerciais (preço explícito por item)
4. Proveniência comercial
5. Origem manual vs derivada do motor
6. Vigência temporal
7. Lifecycle draft/publicação
8. Imutabilidade publicada
9. Semântica de clonagem de versão
10. Semântica de preço zero
11. Semântica de preço ausente
12. Auditoria comercial
13. RBAC comercial
14. Modelo conceitual de exceção comercial

### Fora do PRC-05 (fases posteriores)

- Migrations e RPCs (PRC-05B/C)
- Frontend (PRC-05D)
- Overrides específicos de cliente (PRC-06)
- Atribuição de tabela a cliente (PRC-06)
- Segmentos, grupos, canais (PRC-06/07)
- Contratos, transações de venda, cotações, pedidos, faturamento (fora do domínio)
- Precedência global de resolução entre clientes (PRC-07)
- Workflow de aprovação de desconto (PRC-07)

## 4. Identidade Estável — `commercial_price_tables`

Uma tabela comercial é uma **identidade de negócio estável**.

Atributos recomendados:

| Coluna | Tipo | Observações |
|--------|------|-------------|
| `id` | uuid PK | default `gen_random_uuid()` |
| `organization_id` | uuid FK → organizations | tenant |
| `code` | text | código comercial estável (seção 5) |
| `code_normalized` | text | normalizado para unicidade (DEC-017) |
| `name` | text | ex.: "TABELA PADRÃO 2026" |
| `description` | text | nullable |
| `status` | text | `active` \| `inactive` (seção 6) |
| `created_by` / `created_at` | uuid FK / timestamptz | actor derivado do servidor |
| `updated_by` / `updated_at` | uuid FK / timestamptz | trigger `fn_set_updated_at` |

**Não** armazenar preços nesta tabela. Preços pertencem às versões/ itens.

Exemplos de identidades:

```
TABELA PADRÃO 2026
CLÍNICA PARTICULAR
PARCERIAS
EMPRESARIAL
REFERENCIAL
```

## 5. Código da Tabela Comercial

- **Código manual e estável** em v1 (escolha de negócio: o usuário define códigos memoráveis como `TAB-PADRAO`, `TAB-EMPRESARIAL`, `TAB-PARCEIROS`).
- **Único por organização** (`UNIQUE (organization_id, code)`).
- **Unicidade case-normalizada**: armazenar `code_normalized` (função `normalizeText()` do DEC-017, mesmo padrão de `companies.legal_name_normalized`) com `UNIQUE (organization_id, code_normalized)` — impede `TAB-PADRAO` e `tab-padrao` como duplicados.
- **Não usar o código como PK.** O UUID permanece como identificador técnico (DEC-006, DEC-013).
- O código pode ser editado enquanto a tabela não tiver versões publicadas/histórico; após histórico, permanece estável (evitar reescrita de documentos históricos).

## 6. Status da Tabela Estável

| Status | Significado |
|--------|-------------|
| `active` | A identidade da tabela permanece comercialmente utilizável |
| `inactive` | A identidade não recebe novas versões/atribuições |

- O status da tabela **não** representa o ciclo de vida de versões. `draft / under_review / approved / scheduled / active / superseded / cancelled` pertencem **exclusivamente** às versões.
- Inativar uma tabela **não** altera versões já publicadas (histórico permanece íntegro e resolvível por data).

## 7. Versões — `commercial_price_table_versions`

Uma versão agrupa os preços comerciais de uma tabela para um intervalo de vigência, com lifecycle próprio.

Atributos recomendados:

| Coluna | Tipo | Observações |
|--------|------|-------------|
| `id` | uuid PK | |
| `organization_id` | uuid FK → organizations | tenant |
| `commercial_price_table_id` | uuid FK → commercial_price_tables | |
| `version_number` | integer | > 0; UNIQUE por tabela (seção 8) |
| `version_label` | text | ex.: "v6 — reajuste janeiro" |
| `valid_from` / `valid_to` | date | vigência `[valid_from, valid_to)` (seção 9) |
| `status` | text | `draft \| under_review \| approved \| scheduled \| active \| superseded \| cancelled` |
| `notes` | text | nullable |
| `created_by` / `created_at` | uuid / timestamptz | |
| `approved_by` / `approved_at` | uuid / timestamptz | |
| `published_by` / `published_at` | uuid / timestamptz | |
| `superseded_by` / `superseded_at` | uuid / timestamptz | |

Lifecycle:

```
draft → under_review → approved → scheduled / active → superseded
                                     ↘ cancelled
```

- Mesmo modelo validado em custos (PRC-03) e políticas de preço (PRC-04), preservando coerência conceitual e reuso de RPCs/telas de workflow (DEC-037).
- **Sobreposição proibida**: apenas uma versão `active`/`scheduled` por tabela com vigência sobreposta. Espera-se EXCLUDE GiST `daterange('[)')` em PRC-05B, espelhando `chk_sctv_no_overlap`/`chk_ppv_no_overlap`.

## 8. Número de Versão

- `version_number` é **inteiro positivo**, **único dentro de** `commercial_price_table_id`.
- Alocação **server-side e concurrency-safe** (PRC-05C). O frontend **nunca** calcula `MAX(version_number) + 1`.
- Estratégia esperada: **`SELECT ... FOR UPDATE` na linha da tabela-pai** (padrão já validado em `fn_create_cost_version` e `fn_create_pricing_policy_version`, DEC-044). Sequências PostgreSQL não se aplicam porque o contador é por tabela, não global.

## 9. Modelo Temporal

Intervalo canônico `[valid_from, valid_to)` — início inclusivo, fim exclusivo (DEC-008).

```
v1: 2026-01-01 → 2026-07-01
v2: 2026-07-01 → NULL
```

- **Adjacência permitida** (ranges contíguos não se sobrepõem).
- **Sobreposição de versões `active`/`scheduled` proibida** para a mesma tabela.
- `valid_to IS NULL` = vigência aberta.

## 10. Publicação Futura

Publicação deve suportar datas efetivas futuras, espelhando a semântica temporal já validada em PRC-03B (DEC-028/029):

- `valid_from <= today` → a versão publicada torna-se **`active`**.
- `valid_from > today` → a versão publicada torna-se **`scheduled`**.
- O predecessor ativo **permanece `active`** até `new.valid_from`, recebendo `valid_to = new.valid_from` (adjacência, sem supersede prematuro).
- Versões `scheduled` sobrepostas ao novo range são superseded no momento da publicação.

## 11. Resolução por Data de Referência

Uma versão de tabela comercial é resolvível por data de referência **antes** de qualquer scheduler físico ter executado.

Estados elegíveis: `active`, `scheduled`, `superseded` — com:

```
valid_from <= reference_date
AND ( valid_to IS NULL OR valid_to > reference_date )
```

Isso suporta: preço atual, preço futuro (programado) e preço histórico — de forma determinística e reprodutível (mesma semântica do resolver de custo e de política).

## 12. Itens — `commercial_price_items`

Cada linha representa **UM item de catálogo + UM preço comercial + UMA versão de tabela**.

Atributos recomendados:

| Coluna | Tipo | Observações |
|--------|------|-------------|
| `id` | uuid PK | |
| `organization_id` | uuid FK → organizations | tenant |
| `commercial_price_table_version_id` | uuid FK → commercial_price_table_versions | |
| `catalog_item_id` | uuid FK → catalog_items | referência relacional |
| `price_amount` | numeric(14,4) | preço explícito congelado |
| `currency` | char(3) | `'BRL'` obrigatório em v1 (seção 52) |
| `item_code_snapshot` | text | snapshot do código na publicação |
| `item_name_snapshot` | text | snapshot do nome na publicação |
| `item_type_snapshot` | text | snapshot do tipo na publicação |
| `origin_type` | text | `manual` \| `pricing_engine` (seção 17) |
| `source_commercial_price_item_id` | uuid FK → comercial_price_items | linhagem (seção 29), nullable |
| Proveniência (seção 20) | — | nullable p/ manual |
| `pricing_snapshot` | jsonb | opcional; resultado autoritativo usado na criação |
| `created_by` / `created_at` | uuid / timestamptz | |
| `updated_by` / `updated_at` | uuid / timestamptz | |

**Unicidade obrigatória:**

```
UNIQUE (commercial_price_table_version_id, catalog_item_id)
```

Um item de catálogo aparece **no máximo uma vez** por versão de tabela.

## 13. Preço Explícito — Nunca Implícito

- Um item comercial **sempre** contém um `price_amount` explícito.
- O preço comercial **não** é recalculado a cada consulta à tabela.
- Após a publicação, o preço é **congelado**. Mudanças posteriores em custo de fornecedor, política de preço, margem-alvo, markup ou componentes **não** alteram retroativamente a versão publicada.
- Um novo preço exige uma **nova versão** (draft → revisão → aprovação → publicação).

## 14. Precisão do Preço

- Persistência em **`numeric(14,4)`** (DEC-007, DEC-032). Nunca `float`/`double`.
- A UI pode exibir BRL com duas casas decimais; a persistência mantém 4 casas.

## 15. Semântica de Preço Zero

- `price_amount = 0` é um **preço comercial real e explícito** (ex.: serviço incluído, item gratuito, cenário promocional/interno).
- **ZERO != AUSENTE.**
- O schema deve permitir `price_amount >= 0` (CHECK `price_amount >= 0`), **não** `> 0`.

## 16. Semântica de Preço Ausente

- Se um item de catálogo **não existe** na versão de tabela, **não há preço** nessa tabela.
- **Não** materializar linhas ausentes com preço 0.
- Invariante conceitual obrigatória:

```
item ausente  !=  item com preço zero
```

- O resolver retornará `PRICE_NOT_FOUND` para item ausente e `RESOLVED` (com `price_amount = 0`) para item explícito de preço zero (seção 49).

## 17. Origem Manual vs Motor de Precificação

`origin_type`:

| Valor | Significado |
|-------|-------------|
| `manual` | Preço informado explicitamente por usuário autorizado |
| `pricing_engine` | Preço iniciado a partir do resultado autoritativo de `fn_simulate_price` |

Em ambos os casos o montante publicado permanece **explícito**. O motor de precificação **nunca** altera automaticamente um preço publicado.

## 18. Preço Derivado do Motor (snapshot)

Para `origin_type = pricing_engine`:

- Um usuário autorizado pode usar o resultado de `fn_simulate_price` como **valor inicial** do preço comercial.
- O valor retornado (efetivo/calculado) torna-se um **SNAPSHOT**. O preço comercial **não** é um ponteiro vivo.

Exemplo:

```
Recomendação do motor hoje:  R$ 97,63
Usuário autorizado publica:   R$ 99,00
Tabela comercial armazena:    R$ 99,00   (não uma fórmula)
```

## 19. Preço Manual

Para `origin_type = manual`:

- O usuário autorizado informa o montante comercial explícito.
- O sistema poderá, futuramente, comparar esse montante com o motor para visibilidade de margem/risco (seção 32).
- Preço manual é um conceito de negócio permitido: **não** é obrigatório que todo preço seja exatamente igual à recomendação do motor.

## 20. Proveniência Comercial

Modelo de proveniência reprodutível para itens derivados do motor. Preserva informação suficiente para responder "**por que este preço comercial foi escolhido?**".

Campos recomendados:

| Campo | Tipo | Observação |
|-------|------|------------|
| `source_reference_date` | date | data de referência usada na simulação |
| `source_supplier_company_id` | uuid FK | fornecedor do custo usado |
| `source_cost_table_id` | uuid FK | tabela de custo usada |
| `source_cost_version_id` | uuid FK | versão de custo usada |
| `source_cost_version_number` | integer | |
| `source_pricing_policy_id` | uuid FK | política usada |
| `source_pricing_policy_version_id` | uuid FK | versão de política usada |
| `source_policy_version_number` | integer | |
| `source_calculated_price` | numeric(14,4) | |
| `source_total_cost` | numeric(14,4) | |
| `source_margin_rate` | numeric(9,6) | fração decimal |
| `source_markup_rate` | numeric(9,6) | fração decimal |
| `source_effective_price` | numeric(14,4) | preço efetivo simulado |
| `pricing_snapshot` | jsonb | opcional; resultado autoritativo completo de `fn_simulate_price` no momento da criação |

## 21. Proveniência é Snapshot

- A proveniência **não** se torna dependência de recálculo.
- Se custo, política, fornecedor ou cálculo mudarem depois, o item publicado **permanece inalterado**.
- A proveniência descreve **o que era conhecido no momento da publicação**.

## 22. Proveniência de Preço Manual

Para itens `manual`:

- A proveniência do motor pode ser `NULL`.
- Preservar sempre: `created_by`, `created_at` e identidade de tabela/versão.
- Opcionalmente permitir um snapshot de **comparação** com o motor mesmo para origem manual — mas distinguir:
  - **origem comercial** (`origin_type`) — como o preço foi definido;
  - **cálculo de comparação/referência** — visibilidade de risco.
- **Não** rotular preços manuais como gerados pelo motor.

## 23. Snapshot do Item

Itens comerciais preservam identidade legível do catálogo no momento da publicação:

- `item_code_snapshot`
- `item_name_snapshot`
- `item_type_snapshot`

Motivo: documentos/reportes históricos permanecem compreensíveis mesmo que o nome de exibição do catálogo mude depois. `catalog_item_id` permanece a referência relacional.

## 24. Princípio do Snapshot de Versão

Uma versão publicada é um **snapshot comercial completo e reprodutível**. O sistema deve responder historicamente:

> Qual preço a tabela X continha para o item Y na data D?

sem depender do rótulo atual do catálogo, do custo de fornecedor, da política de preço ou do resultado do motor.

## 25. Mutabilidade de Draft

Enquanto a versão estiver em `draft`:

- adicionar item
- editar preço
- remover item
- alterar notas
- alterar vigência (quando seguro)
- operações em massa (seção 30)

Ao sair de `draft` (submit/review), os itens de preço tornam-se imutáveis (seção 26).

## 26. Imutabilidade Publicada

Após `under_review / approved / scheduled / active / superseded`:

- Itens de preço **não** podem ser editados arbitrariamente.
- Correção de preço errado → **nova versão** conforme o workflow.
- **Nunca** reescrever silenciosamente histórico comercial.

Aplicação concreta do princípio DEC-009 ao modelo de versões comerciais; enforcement esperado em PRC-05B (triggers + RLS, espelhando `fn_ppv_protect_published_fields`/`fn_sctv_protect_published_fields`).

## 27. Clonagem de Versão

Clonagem é workflow de primeira classe em v1:

```
Tabela ativa v5
↓
Criar novo draft v6
↓
Clonar todos os itens
↓
Alterar apenas os preços selecionados
↓
Revisar
↓
Aprovar
↓
Publicar
```

PRC-05C deve fornecer operação server-side e atômica "criar versão a partir da versão anterior". **Não** exigir re-digitação de centenas de preços.

## 28. Semântica de Clonagem

Regras explícitas ao clonar:

| Atributo | Comportamento |
|----------|---------------|
| `catalog_item_id` | **COPIA** |
| `price_amount` | **COPIA** |
| Snapshots do catálogo (`item_*_snapshot`) | **ATUALIZA** a partir do catálogo atual na criação do draft |
| `origin_type` / proveniência | **COPIA** com metadados de linhagem indicando herança |
| `currency` | COPIA |

A linhagem indica que o valor foi herdado e não recém-informado (seção 29). Não deixar a proveniência da clonagem ambígua.

## 29. Linhagem

- Conceito recomendado: `source_commercial_price_item_id` (ou equivalente) nas linhas clonadas.
- Responde: "**este preço foi recém-informado ou herdado da versão anterior?**"
- **Não** obrigatório para versões iniciais criadas manualmente (`source_commercial_price_item_id = NULL`).

## 30. Operações em Massa

Suporte futuro em v1, **somente em drafts**:

- aplicar +5% aos preços selecionados
- aplicar aumento fixo
- copiar versão anterior
- arredondar preços selecionados

**Importante:** operações em massa modificam os **valores explícitos** de `price_amount` do draft. Não são uma fórmula viva anexada à tabela publicada. O resultado publicado permanece valores explícitos. Implementação prevista em PRC-05C/D.

## 31. Segurança de Operações em Massa

- Usar PostgreSQL `numeric`; server-side onde autoritativo.
- **Não** depender de ponto flutuante JavaScript para preços em massa persistidos.
- Todas as linhas afetadas devem atualizar **atomicamente**.
- Auditar **quem** aplicou a operação.

## 32. Validação de Margem Comercial

Interação com as salvaguardas financeiras do PRC-04:

- Ao criar/editar preço comercial, o sistema pode compará-lo com a saída autoritativa do motor.
- Classificações potenciais:

| Classificação | Significado |
|---------------|-------------|
| `OK` | Sem desvio crítico |
| `BELOW_COST` | `price_amount < total_cost` autoritativo |
| `BELOW_MINIMUM_MARGIN` | margem resultante abaixo da mínima da política |
| `COMMERCIAL_DEVIATION` | desvio comercial em relação à recomendação do motor (desconto/ajuste) |

- **Não duplicar fórmulas em PRC-05.** Toda comparação usa entradas/resultados autoritativos do motor (`fn_simulate_price`), nunca reimplementação de matemática financeira no domínio comercial.

## 33. Preço Comercial Abaixo do Custo

- **Não** assumir que preço abaixo do custo é tecnicamente impossível — o negócio pode aprovar exceções intencionalmente.
- Abaixo do custo é uma **EXCEÇÃO CONTROLADA**, não necessariamente um CHECK de banco `price >= cost`.
- Publicação de preço com violações críticas deve exigir autorização/reconhecimento explícito.
- PRC-05A define a regra; o mecanismo de aprovação será implementado em PRC-05B/C.

## 34. Exceção de Margem Mínima

- Preço abaixo da margem mínima da política deve ser **sinalizado**.
- **Não** aumentar silenciosamente o preço comercial.
- **Não** bloquear silenciosamente sem workflow de negócio explícito.

Modelo recomendado:

| Cenário | Comportamento |
|---------|---------------|
| Publicação normal | sem violações críticas de precificação |
| Publicação por exceção | exige permissão mais forte (`pricing.commercial.exception_approve`) + justificativa |

## 35. Registro de Exceção Comercial

Recomendado: **registro de exceção auditável separado** quando o workflow de exceção for não-trivial.

Para PRC-05 v1, modelo mínimo confiável sem superdimensionar:

- Itens com violações críticas publicados por exceção são sinalizados.
- Recomendação: tabela dedicada `commercial_price_exceptions` (auditável), vinculada ao item/versão, com: código(s) de violação, justificativa, `exception_approved_by/at` e status do pedido (`requested / approved / denied`).
- Alternativa mínima: flags + justificativa no item. A tabela dedicada prevalece se o workflow exigir ator/justificativa distintos (recomendado).

## 36. Aprovação por Tabela vs por Item

- O workflow padrão aprova/publica a **versão de tabela como um todo**.
- **Não** criar lifecycle independente para cada item.
- Itens problemáticos podem carregar flags/aprovações de exceção individuais.
- **A versão comercial permanece a unidade publicável.**

## 37. Completude da Versão

- Uma versão comercial deve conter **pelo menos um item** antes de revisão/publicação.
- **Sim.** Versões vazias não podem ser publicadas.
- Invariante a ser aplicado em PRC-05B (CHECK/trigger) e validado nas RPCs de PRC-05C.

## 38. Item Duplicado

O mesmo item de catálogo não pode aparecer duas vezes na mesma versão.

Constraint eventual obrigatória:

```
UNIQUE (commercial_price_table_version_id, catalog_item_id)
```

## 39. Integridade Cross-Tenant

Todas as relações devem pertencer à mesma organização. O banco deve rejeitar:

- tabela org A ↔ versão org B
- versão org A ↔ item de catálogo org B
- item org A ↔ custo/política de origem org B

Enforcement em PRC-05B via triggers de same-org (padrão `fn_*_same_org` já usado em políticas e custos).

## 40. Status do Catálogo

- **Novas adições** em drafts exigem item de catálogo **elegível (`active`)**.
- Linhas históricas publicadas que referenciam itens posteriormente inativados **permanecem válidas**.
- **Não** destruir preços históricos quando o status do catálogo muda (DEC-016: itens de catálogo não são hard-deleted).

## 41. Status da Tabela vs Status da Versão

Distinção explícita (evitar interpretação genérica de `status` em docs/UI):

```
commercial_price_tables.status:
  active | inactive

commercial_price_table_versions.status:
  draft | under_review | approved | scheduled | active | superseded | cancelled
```

## 42. RBAC

Permissões granulares recomendadas:

| Permissão | Significado |
|-----------|-------------|
| `pricing.commercial.view` | Visualizar tabelas/versões/itens |
| `pricing.commercial.create` | Criar tabelas, versões e itens de draft |
| `pricing.commercial.edit` | Editar drafts (itens, preços, notas) |
| `pricing.commercial.review` | Submeter/revisar versões |
| `pricing.commercial.approve` | Aprovar versões |
| `pricing.commercial.publish` | Publicar versões aprovadas |
| `pricing.commercial.exception_approve` | Aprovar exceções comerciais |

**Não** reutilizar `pricing.policy.*` para gestão de tabelas comerciais — responsabilidade de negócio distinta.

> Nota de reconciliação: o placeholder `pricing.price.publish` listado em `docs/RBAC.md` é substituído por este conjunto `pricing.commercial.*` a partir de PRC-05B.

## 43. Semântica RBAC Recomendada

| Papel | view | create | edit | review | approve | publish | exception_approve |
|-------|------|--------|------|--------|---------|---------|-------------------|
| admin | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| manager | ✔ | ✔ | ✔ | ✔ | ✔ | — | — |
| operator | ✔ | — | — | — | — | — | — |
| viewer | ✔ | — | — | — | — | — | — |

- `publish` exclusivo do admin (consistente com `pricing.cost.publish` e `pricing.policy.publish`).
- `exception_approve` restrito mais fortemente (admin apenas).
- Concessão de `create`/`edit` a operator pode ser estendida por governança futura; default conservador = somente leitura, alinhado aos domínios de custo e política.
- Convenções de roles existentes permanecem autoritativas (RBAC.md).

## 44. Atores Derivados do Servidor

Todas as RPCs de workflow (PRC-05C) devem derivar `auth.uid()`.

**Nunca** aceitar do cliente:

```
created_by
approved_by
published_by
exception_approved_by
```

Segue a arquitetura server-derived actor já consolidada (DEC-022/023).

## 45. Auditoria

Eventos auditados (reuso da arquitetura `audit_logs` + `log_audit()`, DEC-004/022):

- criação de tabela
- criação de versão
- clonagem
- create/update/delete de item
- ajuste em massa
- submit
- return to draft
- approve
- publish
- cancel
- aprovação de exceção
- cutover

Leituras puras **não** são auditadas.

## 46. Atribuição a Clientes é PRC-06

- PRC-05 **não** adiciona `client_id`, `customer_id`, atribuição de empresa-cliente ou override por cliente em itens comerciais.
- PRC-05 cria **tabelas comerciais reutilizáveis**.
- PRC-06 atribuirá tabelas comerciais e overrides explícitos a clientes.

## 47. Resolução Final de Preço é PRC-07

- PRC-05 pode resolver "preço do item X dentro da tabela comercial Y na data D" (seção 48).
- **Não** implementa precedência global:

```
override explícito de cliente
> tabela atribuída ao cliente
> segmento/grupo/canal
> tabela comercial padrão
```

Isso pertence ao PRC-07.

## 48. Resolver de Tabela (conceitual)

Função futura de PRC-05C (conceito, sem implementação agora):

```text
fn_resolve_commercial_table_price(
  organization,
  commercial_price_table,
  catalog_item,
  reference_date
)
```

Resultado esperado:

- tabela id
- versão id
- número da versão
- item de catálogo
- preço comercial
- vigência
- origem/proveniência
- status de resolução

Status possíveis:

```
RESOLVED
TABLE_NOT_FOUND
VERSION_NOT_FOUND
PRICE_NOT_FOUND
```

## 49. PRICE_NOT_FOUND != Zero

Análogo a `UNKNOWN COST != ZERO`:

```
nenhuma linha comercial  → PRICE_NOT_FOUND
linha explícita com price_amount = 0 → RESOLVED com preço zero
```

## 50. Default de Tabela / Atribuição

- **Não** criar prematuramente precedência de tabela padrão da organização.
- Avaliação: o flag `is_default` pertence ao PRC-07 (seleção de tabela padrão e precedência), **não** ao PRC-05.
- Evitar acoplar PRC-05 ao design futuro do resolver global.

## 51. Canal / Segmento / Grupo

- **Não** colocar `channel`, `segment` ou `customer group` em `commercial_price_items` em PRC-05 v1.
- São dimensões futuras de aplicabilidade/atribuição.
- A tabela comercial permanece reutilizável.

## 52. Moeda

- Política v1: **BRL somente**.
- Modelo escolhido: **Opção B** — `currency` char(3) NOT NULL DEFAULT `'BRL'` com `CHECK (currency = 'BRL')` no item comercial, espelhando `supplier_cost_items.currency_code`.
- Toda versão é de moeda única em v1 (por construção, todos os itens BRL).
- **Sem** conversão de câmbio.

## 53. Política de Exclusão

| Entidade | Regra |
|----------|-------|
| Tabela estável | **Sem hard delete** após existir versão/histórico |
| Versão `draft` | Excluível quando seguro |
| Versão não-draft | **Sem hard delete** |
| Item de draft | Excluível |
| Item publicado/histórico | **Sem hard delete** |

Usar lifecycle `inactive`/`cancelled`/`superseded` em vez de exclusão.

## 54. Comportamento de FK de Custo/Política de Origem

- Referências de proveniência a versões históricas de custo e política **nunca** são cascade-deleted.
- Estratégia referencial que preserva história comercial:
  - FKs de origem com `ON DELETE RESTRICT` (ou estratégia histórico-safe equivalente).
- **Não** permitir que a proveniência de auditoria comercial desapareça.

## 55. Conceitos de Performance / Índices

Índices a considerar em PRC-05B:

- `organization_id`
- `commercial_price_table_id`
- `status`
- `valid_from` / `valid_to`
- `catalog_item_id`
- unique `(commercial_price_table_version_id, catalog_item_id)`
- unique `(organization_id, code_normalized)`
- IDs de custo/política de origem onde consultáveis (proveniência)

Evitar índices especulativos excessivos.

## 56. Snapshot de Transação Futura

Tabelas comerciais **não** são transações de venda. Porém, o princípio a jusante é documentado:

> Cotações/pedidos/faturas futuros devem registrar snapshot de: identidade do item, preço comercial, tabela de origem e versão de tabela de origem — para que vendas históricas não mudem quando uma nova versão de tabela é publicada.

Tabelas de transação **não** são implementadas agora.

## 57. Modelo de Dados Proposto

Modelo v1 confirmado:

```
commercial_price_tables
commercial_price_table_versions
commercial_price_items
commercial_price_exceptions   (opcional — recomendado; ver seção 35)
```

Nenhuma tabela adicional sem justificativa clara.

## 58. Fórmulas / Não-Fórmulas

- PRC-05 **não** introduz outro motor de fórmula de preço.
- O preço comercial persistido é **`price_amount`** — explícito.
- Pode ser: digitado manualmente, ou derivado/copiado de simulação autoritativa do PRC-04.
- Após edição de draft/publicação, é um **valor explícito**.
- Comparações de margem usam exclusivamente saída do motor (seção 32), sem duplicar fórmulas.

## 59. Referências de Decisões

Decisões preservadas que governam PRC-05:

- **DEC-007** — valores monetários `numeric(14,4)`
- **DEC-008** — vigências `[valid_from, valid_to)`
- **DEC-009** — versões comerciais publicadas imutáveis
- **DEC-036** — preço calculado != preço comercial publicado
- **DEC-037** — versionamento de políticas (modelo reutilizado)
- **DEC-040** — `pricing.calculate` separado da gestão de política
- **DEC-043** — simulação stateless (persistência comercial só em PRC-05)

Novas decisões PRC-05A: **DEC-045** a **DEC-050** (registradas em `docs/DECISION_REGISTER.md`).

## 60. Plano de Fases PRC-05

| Fase | Descrição |
|------|-----------|
| PRC-05A | Commercial Price Table Model & Business Rules (esta fase) |
| PRC-05B | Commercial Price Table Database, Integrity, RLS & RBAC |
| PRC-05C | Commercial Price Workflow, Clone, Publish & Table Resolver |
| PRC-05D | Commercial Price Table UI |
| PRC-05E | Commercial Pricing End-to-End Hardening |
| PRC-06 | Client Assignments & Overrides |
| PRC-07 | Final Commercial Price Resolution |

## 61. PRC-05B — Implementação e Verificação

> Checkpoint: **`COMMERCIAL_PRICE_SCHEMA_VERIFIED`** · Migrations `032_commercial_price_schema.sql` e `033_commercial_price_security.sql` · Testes remotos `COM-H01..COM-H57` (`tests/remote/commercial-price-integrity-test.mjs` + `tests/remote/sql/commercial_price_test_setup.sql`).

### 61.1 Schema (migration 032)

- **`commercial_price_tables`** — identidade estável (`active|inactive`), `code_normalized` via `fn_normalize_commercial_code` (normalização case/acento/espaço, implementada com `chr()` para segurança de encoding UTF-8), unicidade `UNIQUE (organization_id, code)` + `UNIQUE (organization_id, code_normalized)`.
- **`commercial_price_table_versions`** — lifecycle `draft|under_review|approved|scheduled|active|superseded|cancelled`; `version_number > 0` e `UNIQUE (commercial_price_table_id, version_number)`; vigência `[valid_from, valid_to)` com `chk_cptv_validity`; **EXCLUDE temporal GiST `chk_cptv_no_overlap`** sobre versões `active|scheduled` (adjacência permitida); cross-org trigger `fn_cptv_table_same_org`; actor server-derived `fn_cptv_actor`.
- **`commercial_price_items`** — `price_amount numeric(14,4) >= 0` (ZERO permitido, DEC-047); `currency char(3) CHECK = 'BRL'` (seção 52); snapshot do catálogo server-derived (`fn_cpi_catalog_snapshot`, valores do cliente ignorados); `UNIQUE (version_id, catalog_item_id)` (`idx_cpi_unique_item`); `chk_cpi_engine_provenance` (itens `pricing_engine` exigem proveniência mínima: `source_reference_date`, `source_supplier_company_id`, `source_cost_version_id`, `source_pricing_policy_version_id`, `source_effective_price`); cross-org triggers para versão, item de catálogo (ativo obrigatório), custo/política de origem (pertencimento, correspondência tabela/versão), linhagem same-table (`source_commercial_price_item_id`).
- **`commercial_price_exceptions`** — registro de exceção auditável (seção 35): `violation_code` CHECK (`BELOW_COST|BELOW_MINIMUM_MARGIN|COMMERCIAL_DEVIATION`), status `requested|approved|denied`, `idx_cpe_unique_item_code` impede duplicata `(item, violation_code)`, `requested_by/at`, `decided_by/at`; **append-only** (`fn_cpe_delete_guard`).

### 61.2 Workflow, Imutabilidade e Gates

- **Gate dedicado:** transições de status de versão e decisões de exceção exigem `app.commercial_price_rpc_active = 'true'` (GUC transacional setado por RPCs controladas de PRC-05C). Leitura é NULL-safe: `COALESCE((current_setting(...) = 'true'), false)` — corrigido em hotfix para impedir que `NOT NULL` fosse tratado como falso.
- **`fn_cptv_validate_status_transition`** (SECURITY DEFINER): valida transições, permissões por etapa (`review/approve/publish/edit`), deriva `approved_by/at`, `published_by/at`, `superseded_by/at`, e aplica **completude da versão** (≥1 item para sair de draft, seção 37).
- **`fn_cptv_protect_published_fields`**: drafts totalmente editáveis; versões não-draft imutáveis fora de RPC controlada; via RPC apenas campos de workflow/ator/temporal.
- **`fn_cptv_delete_guard`**: hard delete apenas de versões `draft`.
- **Itens:** `fn_cpi_immutable_when_published` — insert/update/delete de itens apenas em versões `draft`.
- **`fn_cpt_code_normalize` + imutabilidade do código:** código editável sem histórico; imutável com versões/histórico.
- **Append-only exceções:** decisão de status sem gate bloqueada; UPDATE de `reason` permitido; DELETE bloqueado (RLS sem policy + `fn_cpe_delete_guard`).

### 61.3 Segurança (migration 033)

- Permissões **`pricing.commercial.*`** (7): `view, create, edit, review, approve, publish, exception_approve`.
- **Mapeamentos RBAC reais:** admin = 7 · manager = 5 (sem `publish`, sem `exception_approve`) · operator = 1 (`view`) · viewer = 1 (`view`). O placeholder legado `pricing.price.publish` permanece no banco com **0 mapeamentos** (deprecated, documentado em `docs/RBAC.md`).
- **RLS (12 policies):** leitura por `is_member_of`; escrita por `has_permission(...)` com `WITH CHECK`; cross-tenant bloqueado (leitura retorna 0 linhas, escrita viola policy).
- **Auditoria:** triggers `fn_audit_commercial_*` (INSERT/UPDATE/DELETE) via `log_audit()`.
- **Revokes:** helpers internos e audit revogados de `PUBLIC`/`anon`; EXECUTE mantido para `authenticated` (triggers executam com o papel da DML — convenção 022/023/027).

### 61.4 Verificação remota (COM-H01..COM-H57)

| Grupo | Testes | Cobertura |
|-------|--------|-----------|
| Identidade de Tabela | COM-H01..H08 | insert, unicidade, normalização, RLS, status CHECK, actor server-derived, imutabilidade de código com histórico |
| Versões | COM-H09..H20 | draft, version_number, unicidade, validade, cross-org, gate de transição sem RPC, imutabilidade não-draft, hard-delete guard, EXCLUDE (sobreposição/adjacência), delete de draft |
| Itens | COM-H21..H35 | snapshot derivado do catálogo (valores do cliente ignorados), unicidade, CHECKs (preço/currency), catálogo ativo, cross-org, imutabilidade em versões não-draft, linhagem same-table |
| Proveniência | COM-H36..H42 | fornecedor cross-org, custo ≠ fornecedor, versão de custo ≠ tabela, política ≠ versão, política cross-org, persistência de proveniência e `pricing_snapshot` |
| Exceções | COM-H43..H50 | create `requested`, ator derivado, status ≠ requested, duplicata, violation_code inválido, versão cross-org, decisão sem gate, UPDATE de reason, append-only |
| RLS/RBAC | COM-H51..H57 | cross-tenant 0 linhas, viewer/operator read-only, manager draft lifecycle completo, exceção por manager, decisão por manager bloqueada (RLS), exceção por viewer bloqueada |

**Resultado:** `Passed: 61 · Failed: 0` (57 testes + sub-verificações), executado contra o projeto remoto `scyxgyewdokmsuehgwql` com o usuário E2E autenticado. Setup resetável: `commercial_price_test_setup.sql` (fixtures + verificação DO-block).

## 62. PRC-05C — Implementação e Verificação

> Checkpoint: **`COMMERCIAL_PRICE_CORE_VERIFIED`** · Migrations `034_commercial_price_workflow.sql` e `035_commercial_price_resolver.sql` · Testes remotos `CPW-H01..CPW-H85` (`tests/remote/commercial-price-workflow-test.mjs`).

### 62.1 Forward Integrity Hardening (migration 034 — A1/A2/A3)

Três lacunas descobertas na auditoria de pré-implementação foram fechadas forward-only em 034 sem editar 032/033:

- **A1 — `fn_cptv_parent_active`** (BEFORE INSERT ON `commercial_price_table_versions`): uma `commercial_price_tables.status = 'inactive'` **não pode receber nova versão via RPC nem via DML direto**. A invariante da PRC-05A §6 passa a ser estrutural.
- **A2 — `fn_cpi_engine_provenance_guard`** (BEFORE INSERT/UPDATE ON `commercial_price_items`): quando `origin_type = 'pricing_engine'` e o gate `app.commercial_price_rpc_active = 'true'` **não está setado**, a operação é bloqueada. Apenas o caminho controlado (RPC `fn_add_commercial_price_item_from_engine` e clone) consegue criar/atualizar itens de motor — DML do browser não fabrica proveniência.
- **A3 — `fn_cpe_parent_editable`** (BEFORE INSERT ON `commercial_price_exceptions`): novos pedidos de exceção são rejeitados quando a versão pai está em `scheduled|active|superseded|cancelled` (apenas `draft|under_review|approved` permitem). Forward-only sem gate (invariante incondicional).

### 62.2 RPCs de Workflow (migration 034)

| RPC | Permissão | Notas |
|-----|-----------|-------|
| `fn_create_commercial_price_table` | `pricing.commercial.create` | identidade estável; código derivado via trigger; status inicial `active` |
| `fn_update_commercial_price_table` | `pricing.commercial.edit` | `name`/`description` apenas; código imutável por 032 |
| `fn_set_commercial_price_table_status` | `pricing.commercial.edit` | `active ↔ inactive`; **inativação NÃO muta/supersede versões publicadas** (resolver histórico permanece) |
| `fn_create_commercial_price_table_version` | `pricing.commercial.create` | `FOR UPDATE` no pai → `version_number` concorrente-safe (DEC-044 aplicado a comercial) |
| `fn_add_commercial_price_item_manual` | `pricing.commercial.create` | `origin_type='manual'`; snapshot server-derived |
| `fn_update_commercial_price_item_price` | `pricing.commercial.edit` | apenas `price_amount` em item draft |
| `fn_delete_commercial_price_item` | `pricing.commercial.edit` | apenas item draft |
| `fn_add_commercial_price_item_from_engine` | `pricing.commercial.create` + `pricing.calculate` | **única fonte confiável de `origin_type='pricing_engine'`**; chama `fn_simulate_price` e extrai proveniência real |
| `fn_clone_commercial_price_table_version` | `pricing.commercial.create` | atômico; refresh de snapshot via trigger; linhagem `source_commercial_price_item_id` SEMPRE aponta para item-fonte; aborta se houver item-fonte com catálogo inativo (`SOURCE_CONTAINS_INACTIVE_CATALOG_ITEM`); **NÃO copia exceções** |
| `fn_bulk_adjust_commercial_prices` | `pricing.commercial.edit` | `percentage` / `fixed` / `round`; PostgreSQL `numeric` autoritativo; tudo-ou-nada atômico |
| `fn_request_commercial_price_exception` | `pricing.commercial.review` | parent-state guardado por A3 |
| `fn_decide_commercial_price_exception` | `pricing.commercial.exception_approve` | `approved`/`denied`; terminal (decided_by/at derivados) |
| `fn_submit_commercial_price_version` | `pricing.commercial.review` | `draft → under_review`; ≥1 item obrigatório |
| `fn_return_commercial_price_version_to_draft` | `pricing.commercial.edit` | `under_review → draft` |
| `fn_approve_commercial_price_version` | `pricing.commercial.approve` | `under_review → approved`; pode ocorrer com exceções pendentes |
| `fn_cancel_commercial_price_version` | `pricing.commercial.approve` | `draft|under_review|approved → cancelled` |
| `fn_validate_commercial_price_version` | `pricing.commercial.view` | JSONB read-only; **NÃO reimplementa fórmulas** (DEC-040); só inspeciona snapshot confiável |
| `fn_publish_commercial_price_version` | `pricing.commercial.publish` | validador autoritativo; predecessore continuity + supersede scheduled sobreposto |
| `fn_sync_commercial_price_version_status` | `pricing.commercial.publish` | cutover idempotente `scheduled → active` |

Todas as RPCs aplicam: `auth.uid()` server-derived · `is_member_of` + `has_permission` por chamada · `SECURITY DEFINER` + `SET search_path = public` · REVOKE FROM PUBLIC/anon · GRANT TO authenticated (quando aplicante).

### 62.3 Publicação e Semântica Temporal

Mesma convenção DEC-028/029 dos custos:

- **Imediata (`valid_from <= current_date`)**: nova versão vira `active`; todas as outras `active|scheduled` da mesma tabela são `superseded` (satisfaz EXCLUDE porque saem do WHERE clause).
- **Futura (`valid_from > current_date`)**: predecessora `active` permanece `active` com `valid_to = B.valid_from` (adjacente); apenas `scheduled` **sobrepostas** são superseded (daterange `'[)' && '[)'`).
- **Cutover idempotente**: `fn_sync_commercial_price_version_status` ativa versões elegíveis; primeira execução retorna N>0, segunda retorna 0.

### 62.4 Validador de Publicação (`fn_validate_commercial_price_version`)

JSONB read-only com:

- `ready` (boolean)
- `blockers` (text[])
- `item_count`, `pending_exception_count`, `denied_exception_count`, `required_exception_count`, `missing_exception_codes`

Composição de blockers:
- `VERSION_NOT_APPROVED:<status>` — não está `approved`
- `VERSION_EMPTY` — sem itens
- `PENDING_EXCEPTIONS` — exceção `requested`
- `DENIED_EXCEPTIONS` — exceção `denied`
- `MISSING_APPROVED_EXCEPTIONS` — exceção obrigatória ausente/não aprovada

Exceções obrigatórias (apenas para itens `origin_type='pricing_engine'`, a partir do snapshot confiável):

- `BELOW_COST` se `price_amount < source_total_cost`
- `COMMERCIAL_DEVIATION` se `price_amount < source_effective_price`
- `BELOW_MINIMUM_MARGIN` se `pricing_snapshot` contém a violação

### 62.5 Resolver de Tabela (`fn_resolve_commercial_table_price`, migration 035)

```
fn_resolve_commercial_table_price(
  p_organization_id,
  p_commercial_price_table_id,
  p_catalog_item_id,
  p_reference_date DEFAULT current_date
)
```

Status machine-readable: `RESOLVED | TABLE_NOT_FOUND | VERSION_NOT_FOUND | PRICE_NOT_FOUND`. `TABLE_NOT_FOUND` **só** é retornado para organizações acessíveis (sem leak cross-tenant).

Ordem determinística do tie-break: `valid_from DESC, version_number DESC, created_at DESC, id DESC`. Versão elegível: status `active|scheduled|superseded` + `[valid_from, valid_to)`.

Inativo histórico: tabela com `status='inactive'` permanece **historicamente resolúvel** (apenas criação de novas versões é bloqueada por A1). O `table.status` é devolvido no resultado.

Zero vs missing (DEC-047):
- Item ausente → `PRICE_NOT_FOUND` (nunca materializa 0).
- Item com `price_amount = 0` → `RESOLVED` com 0 (serviço incluso/gratuito legítimo).

Estrutura do resultado (JSONB): `status`, `organization_id`, `reference_date`, `commercial_price_table_id`, `catalog_item_id`, `table{id,code,name,status}`, `version{id,version_number,status,valid_from,valid_to}`, `item{commercial_price_item_id,catalog_item_id,snapshots}`, `price_amount`, `currency`, `origin_type`, `lineage{source_commercial_price_item_id}`, `provenance{source_*,pricing_snapshot}`, `approved_exceptions[]`.

Permissão exigida: `pricing.commercial.view`. Escopo: **apenas "item dentro de tabela em data"** (DEC-050). Override de cliente / precedência global são PRC-06/07.

### 62.6 Verificação Remota (CPW-H01..CPW-H85)

| Grupo | Testes | Cobertura |
|-------|--------|-----------|
| Criação de versão | CPW-H01..H08 | actor derivado, version_number sequencial, concorrência paralela (5 chamadas), spoof bloqueado, inativo rejeitado via RPC e DML, status direto bloqueado |
| Itens | CPW-H09..H18 | manual create/zero/update/delete, engine via RPC confiável, PRICE_NOT_CALCULABLE rejeitado, POLICY_NOT_FOUND rejeitado, **spoof de proveniência bloqueado**, snapshot confiável não substituível |
| Clone | CPW-H19..H26 | versão próxima, copia preços, refresh de snapshot, linhagem ponto-a-ponto, cópia de proveniência, **NÃO copia exceções**, inativo-catálogo aborta, falha atômica sem parcial |
| Bulk | CPW-H27..H35 | +5% numeric, fixed +/-/negativo rejeitado, round nearest/up/down, item-selection, não-draft rejeitado |
| Exceções | CPW-H36..H44 | actor derivado, reason vazio rejeitado, publicação bloqueia novo pedido, decisão direta bloqueada, admin aprova/denega, terminal, duplicata rejeitada |
| Workflow | CPW-H45..H51 | submit/return/approve/cancel, vazio rejeitado, RLS já cobre não-admin |
| Validação | CPW-H52..H59 | approved pronto, requested/denied bloqueiam, exceção aprovada libera, BELOW_COST/COMMERCIAL_DEVIATION/BELOW_MINIMUM_MARGIN derivados do snapshot, manual sem proveniência é válido |
| Temporal | CPW-H60..H68 | immediate→active, future→scheduled, predecessora `active`, valid_to=future.valid_from, scheduled sobreposta superseded, cutover idempotente |
| Resolver | CPW-H69..CPW-H77 | current/future/historical, zero RESOLVED, PRICE_NOT_FOUND/VERSION_NOT_FOUND/TABLE_NOT_FOUND, inativo historicamente resolúvel, determinístico |
| Segurança | CPW-H78..CPW-H85 | cross-tenant rejeitado, sem view rejeitado, manager sem publish, manager sem exception_approve, helpers internos não acessíveis |

**Resultado:** `Passed: 85 · Failed: 0` (CPW-H01..CPW-H85), executado contra o projeto remoto `scyxgyewdokmsuehgwql`. COM-H01..H57 permanece em 61/61 (ajustes em COM-H29 [usa RPC de engine], COM-H41 [asserção de policy resolvida], COM-H43 [usa draft, não `pubVersion`]).

### 62.7 PRC-05D — UI/Frontend (Módulo Comercial)

Implementação frontend completa em `src/features/pricing/commercial/`.

#### Estrutura
```
src/features/pricing/commercial/
├── api/commercialPrices.ts          # Wrappers de todas as RPCs do PRC-05C
├── components/
│   ├── CommercialBadges.tsx
│   ├── CommercialTableForm.tsx
│   ├── CommercialTableList.tsx
│   ├── CommercialTableDetail.tsx
│   ├── CommercialVersionForm.tsx
│   ├── CommercialVersionTimeline.tsx
│   ├── CommercialItemTable.tsx
│   ├── ManualPriceItemForm.tsx
│   ├── EnginePriceItemForm.tsx
│   ├── EnginePricePreview.tsx
│   ├── CommercialItemProvenance.tsx
│   ├── CommercialBulkAdjustment.tsx
│   ├── CommercialExceptionPanel.tsx
│   ├── CommercialWorkflowActions.tsx
│   ├── PublishReadinessPanel.tsx
│   └── CommercialPriceResolver.tsx
├── hooks/useCommercial.ts             # useCommercialTables/Table/Version/Workflow/Resolver
├── pages/                              # 6 páginas (list/new/detail/version-new/version-detail/lookup)
├── types/commercial.types.ts           # Display constants + DTOs + permissions
├── utils/format.ts                     # Formatação UI-only (BRL/date/percent)
└── __tests__/                          # CUI-API/RBAC/ZERO/WF/READY/CLONE/BULK/ENG/EX
```

#### Rotas
| Path | Página |
|------|--------|
| `/pricing/commercial` | Lista de tabelas estáveis |
| `/pricing/commercial/new` | Criar tabela |
| `/pricing/commercial/:id` | Detalhe da tabela |
| `/pricing/commercial/:id/versions/new` | Criar versão (vazio ou clone via `?cloneFrom=`) |
| `/pricing/commercial/versions/:id` | Workspace da versão |
| `/pricing/commercial/lookup` | Resolver (consulta por tabela + item + data) |

Todas sob `ProtectedRoute` + `MainLayout`. RBAC fica em cada página (padrão de `pricing/policies`).

#### Permissões (frontend UX-only)
| Permissão | Controle |
|-----------|----------|
| `pricing.commercial.view` | Acesso a todas as rotas |
| `pricing.commercial.create` | Criação de tabela, versão, item |
| `pricing.commercial.edit` | Edição de rascunho (itens, bulk, delete) |
| `pricing.commercial.review` | Submit / solicitação de exceção |
| `pricing.commercial.approve` | Aprovar versão |
| `pricing.commercial.publish` | Publicar / agendar |
| `pricing.commercial.exception_approve` | Aprovar/negação de exceções |
| `pricing.calculate` | Pré-visualização + adição via motor |

#### Princípios Arquiteturais
- **Backend autoritativo:** UI nunca faz UPDATE direto em `commercial_price_*`; toda mutação vai por RPC.
- **Proveniência server-derived:** UI nunca envia `source_*` fields; só parâmetros de negócio.
- **Zero price é zero:** `formatCurrency(0)` renderiza `R$ 0,00` (não `Sem preço`). `PRICE_NOT_FOUND` é estado distinto (não vira 0).
- **Recálculo autoritativo:** após cada RPC (clone/bulk/exception/workflow) o componente chama `refetch()` + `refetchReadiness()`. UI nunca recalcula nem persiste resultado de bulk localmente.
- **Validador autoritativo:** `PublishReadinessPanel` exibe resultado de `fn_validate_commercial_price_version` mapeando blockers para pt-BR.
- **Resolver read-only:** `CommercialPriceResolver` chama apenas `fn_resolve_commercial_table_price`; sem fallback nem override.
- **RBAC explícito:** `CommercialWorkflowActions` é state + permission aware; `Aprovar versão` vs `Aprovar exceção` são ações distintas.

#### Testes (54/54 PASS)
| Suite | Cobertura | Status |
|-------|-----------|--------|
| `__tests__/api.test.ts` | CUI-API01..12 + helpers | 18/18 |
| `__tests__/rbac.test.tsx` | CUI-RBAC01..08 | 7/7 |
| `__tests__/resolver-readiness.test.tsx` | CUI-ZERO01..04 + CUI-READY01..05 | 10/10 |
| `__tests__/workflow.test.tsx` | CUI-WF01..08 + CUI-CLONE01..04 + CUI-BULK01..05 + CUI-EX01..05 | 15/15 |
| `__tests__/engine-item.test.ts` | CUI-ENG01..05 | 4/4 |

Total geral: **217/217 PASS** (163 anteriores + 54 novos).

#### Auditoria Estática de Segurança
- `service_role`: NÃO REFERENCIADO em `src/`.
- Hardcoded UUIDs/secrets: NENHUM em `src/`.
- `origin_type='pricing_engine'` direto: SOMENTE em error-mapper (msg) + display badge (read) + teste (asserção negativa).
- `UPDATE ... status`: ZERO em `commercial_price_*` (todas as transições via RPC).
- `.env` versionado: NÃO.
- `package.json` deps adicionadas: ZERO.
