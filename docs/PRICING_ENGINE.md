# Motor de Formação de Preço — PRC-04

**Status:** Especificação autoritativa (PRC-04A) · Engine implementada e verificada (PRC-04C **COMPLETED**) · UI e Simulador (PRC-04D **COMPLETED**)
**Baseline:** PRC-03B fechado — `SUPPLIER_COSTS_VERIFIED` · Migrations 001–031 imutáveis
**Fonte de custo autoritativa:** `fn_resolve_supplier_cost(...)`

---

## 1. Propósito

Definir o modelo formal de formação de preço do motor de precificação da Efetiva Gestão: terminologia, fórmulas matemáticas, regras de cálculo, composição de custo, margem/markup, componentes adicionais, arredondamento, piso mínimo, limites de desconto, comportamento para custo desconhecido, proveniência do cálculo e fronteira com PRC-05.

Esta fase é **somente especificação**. Não cria tabelas, migrations, funções PostgreSQL, páginas ou hooks.

## 2. Escopo

O PRC-04 responde:

> "Dado um custo válido e uma política de preço, qual deve ser o preço comercial calculado?"

O PRC-04 **não** publica tabelas de preço comercial para clientes. Publicação, vigência de venda, versionamento de tabela comercial, atribuição a clientes e distribuição final pertencem ao PRC-05.

**`CALCULATED PRICE != PUBLISHED COMMERCIAL PRICE`** — esta separação é explícita e deve ser preservada em banco, RPC, frontend, rótulos, testes e documentação.

## 3. Terminologia Canônica

| Termo | Definição |
|-------|-----------|
| **base_cost** | Custo confirmado de fornecimento/execução retornado pelo resolver autoritativo de custo. |
| **additional cost** | Custo adicionado ao `base_cost` antes da margem/markup (taxa de coleta, logística, taxa de terceiros, custo operacional administrativo, sobretaxa fixa de execução). |
| **total_cost** | Custo econômico canônico usado pela fórmula de preço após os componentes adicionais. |
| **calculated_price** | Preço gerado pelo motor antes da publicação em tabela comercial (e antes do arredondamento). |
| **final_price** | Resultado calculado após arredondamento aplicável (preço simulado final). |
| **floor_price** | Preço mínimo permitido sem exceção. |
| **cost_reference_date** | Data de referência para resolução temporal de custo (e, no futuro, de política). |

Um preço calculado **nunca** deve ser chamado de "publicado" na especificação ou nos rótulos do produto.

## 4. Margem vs Markup

Margem e markup são conceitos distintos e **não são sinônimos**.

### Margem (margin)

A margem é calculada sobre o **preço** (receita).

```text
margin_rate = (price - total_cost) / price
margin_pct  = ((price - total_cost) / price) * 100

Preço a partir da margem alvo:
price = total_cost / (1 - margin_rate)

Restrições:
0 <= margin_rate < 1
margin_rate = 1 é inválido (divisão por zero).
margin_rate > 1 é inválido (preço negativo/absurdo).
```

Exemplo:

```text
total_cost = 80
target margin = 20%
price = 80 / (1 - 0.20) = 80 / 0.80 = 100
margin = (100 - 80) / 100 = 20%
```

### Markup

O markup é calculado sobre o **custo** (base).

```text
markup_rate = (price - total_cost) / total_cost
markup_pct  = ((price - total_cost) / total_cost) * 100

Preço a partir do markup:
price = total_cost * (1 + markup_rate)

Restrição:
markup_rate >= 0
```

Exemplo:

```text
total_cost = 80
markup = 25%
price = 80 * 1.25 = 100
markup = (100 - 80) / 80 = 25%
```

### Relação entre margem e markup

Dado o mesmo `total_cost` e o mesmo `price`, valem as conversões:

```text
margin_rate = markup_rate / (1 + markup_rate)
markup_rate = margin_rate / (1 - margin_rate)
```

**20% de margem ≠ 20% de markup.**

- 20% de margem → price = cost / 0.80 (custo 80 → 100).
- 20% de markup → price = cost * 1.20 (custo 80 → 96).

Esta distinção deve ser refletida em: banco, RPC, frontend, rótulos, testes e documentação.

## 5. Composição de Custo

```text
additional_fixed_total =
  SUM(componentes FIXED)

additional_percentage_total =
  SUM(component_amount de cada componente PERCENTUAL contra sua base definida)

total_cost =
  base_cost
  + additional_fixed_total
  + additional_percentage_total
```

Regras:

- Todo componente é individualmente rastreável no breakdown do cálculo.
- Nunca persistir apenas o número final sem proveniência.
- `base_cost` é sempre o valor confirmado retornado por `fn_resolve_supplier_cost` (nunca outra fonte).

## 6. Métodos de Precificação

### TARGET_MARGIN

```text
Entrada: total_cost, target_margin_rate
Fórmula: calculated_price = total_cost / (1 - target_margin_rate)
Restrição: 0 <= target_margin_rate < 1
```

### MARKUP

```text
Entrada: total_cost, markup_rate
Fórmula: calculated_price = total_cost * (1 + markup_rate)
Restrição: markup_rate >= 0
```

### FIXED_PRICE (decisão)

Um método de preço fixo explicitamente configurado é **recomendado** para suporte futuro, mas **adiado para PRC-04B** como método opcional.

Se retido, o motor **deve** ainda calcular, para validação, a margem e o markup resultantes:

```text
gross_profit = fixed_price - total_cost
margin_rate  = gross_profit / fixed_price
markup_rate  = gross_profit / total_cost
```

Se `fixed_price < total_cost` → violação `BELOW_COST`.
Se a margem resultante ficar abaixo da mínima da política → `BELOW_MINIMUM_MARGIN`.

Não implementar FIXED_PRICE no motor central de PRC-04A; fica listado como decisão para PRC-04B.

## 7. Componentes Adicionais de Custo

Modelo genérico com, no mínimo, dois tipos:

### FIXED

```text
component_amount = valor fixo configurado

Exemplo:
  base_cost = 40
  custo administrativo = 5
  component_amount = 5
```

### PERCENTAGE_OF_BASE_COST

```text
component_amount = base_cost * rate

Exemplo:
  base_cost = 100
  sobretaxa operacional = 5%
  component_amount = 5
```

Regras para v1:

- Componentes percentuais usam base **não circular**: `base_cost` (ou outro subtotal já resolvido).
- **Não** usar percentual sobre o preço final de venda em v1, salvo requisito de negócio documentado.
- Evitar fórmulas circulares: `price depende de imposto; imposto depende de price`.
- Motores fiscais/tributários **não** fazem parte do PRC-04A.

## 8. Regras de Desconto

Distinguir:

- **Preço de cálculo** — `calculated_price`/`final_price` sem desconto.
- **Preço simulado com desconto** — resultado após desconto simulado.

Modelo proposto:

```text
base_calculated_price  = resultado do método de precificação (com rounding)
discount_rate          = taxa simulada (0..1)
discount_amount        = final_price * discount_rate
discounted_price       = final_price - discount_amount
```

Após o desconto, **sempre** recalcular:

```text
gross_profit = discounted_price - total_cost
margin_rate  = gross_profit / discounted_price
markup_rate  = gross_profit / total_cost
```

Limites da política:

- `maximum_discount_rate` e/ou
- `minimum_margin_rate`.

Se ambos existirem, o **piso efetivo mais restritivo vence**:

```text
piso por desconto máximo  = final_price * (1 - maximum_discount_rate)
piso por margem mínima    = total_cost / (1 - minimum_margin_rate)
piso efetivo              = max(piso por desconto máximo, piso por margem mínima)
```

Comportamento documentado:

- `discounted_price < total_cost` → `BELOW_COST` (violação dura).
- `discount_rate > maximum_discount_rate` → `DISCOUNT_EXCEEDS_LIMIT`.
- `discounted_price < piso por margem mínima` → `BELOW_MINIMUM_MARGIN`.

## 9. Margem Mínima / Piso de Preço

### Mínima margem

A política pode definir `minimum_margin_rate`.

Exemplo:

```text
target margin da política = 30%
mínima margem permitida   = 20%
```

Se o cálculo ou desconto fizer `margin < 20%` → resultado inclui violação `BELOW_MINIMUM_MARGIN`.

Conceito de resultado:

- `OK`
- `BELOW_MINIMUM_MARGIN`

Workflow de aprovação para essas exceções **não** será implementado no PRC-04A. PRC-04B/C deve definir a enforce (em RPC autoritativa) e, se necessário, o futuro fluxo de exceção com permissão privilegiada.

### Piso de preço

```text
floor_price = total_cost / (1 - minimum_margin_rate)   quando minimum_margin_rate > 0
```

Se não houver política de margem mínima, o piso deve, no mínimo, **não permitir silenciosamente preço abaixo de total_cost**.

Precedência (da mais dura para a mais suave):

1. **BELOW_COST** (`price < total_cost`) — nunca passa silenciosamente.
2. **BELOW_MINIMUM_MARGIN** — violação de política, sinalizada no resultado.
3. **DISCOUNT_EXCEEDS_LIMIT** — violação de política, sinalizada no resultado.

## 10. Arredondamento

Arredondamento comercial configurável:

| Modo | Comportamento |
|------|---------------|
| `NONE` | Sem arredondamento (mantém precisão interna). |
| `NEAREST` | Arredonda para o múltiplo mais próximo do passo. |
| `UP` | Arredonda para cima (teto) até o múltiplo do passo. |
| `DOWN` | Arredonda para baixo (piso) até o múltiplo do passo. |

Passos suportados: `0.01`, `0.05`, `0.10`, `1.00`, `5.00` (e qualquer passo positivo configurado na política).

Exemplos:

```text
calculated_price = 97.63

UP     / 1.00 → 98.00
NEAREST / 5.00 → 100.00   (97.63 / 5 = 19.526 → 20 → 100.00)
```

Regras:

- O arredondamento acontece **após** a fórmula de precificação e **antes** das validações finais de margem.
- Após o arredondamento, margem e markup **devem ser recalculados usando `final_price`**.
- Não hardcodar preços psicológicos (ex.: 99.90) no v1; isso seria política futura separada, se exigida.
- O arredondamento é feito com aritmética `numeric` (nunca float).

## 11. Semântica de Custo Desconhecido

Esta regra é crítica.

Se `fn_resolve_supplier_cost` retornar `resolution_status = 'COST_NOT_CONFIRMED'` (ou `amount IS NULL`), o motor **não deve** calcular um preço de venda normal a partir de:

- `0` (zero);
- `NULL` convertido para zero;
- último custo conhecido sem proveniência explícita;
- fallback do frontend.

Resposta conceitual esperada:

```text
status: PRICE_NOT_CALCULABLE
reason: COST_NOT_CONFIRMED
```

Exceções:

- `confirmed_zero` é um custo confirmado válido (não é "desconhecido").
- Quando `total_cost = 0`, as fórmulas de margem/markup que envolvem divisão por zero exigem tratamento explícito (ver seção 12).
- Não fabricar markup infinito.

## 12. Semântica de Zero Confirmado

`confirmed_zero` é dado de custo válido e confirmado.

O motor **pode** calcular um preço se a política suportar, por exemplo via:

- custos adicionais fixos;
- preço fixo;
- outras regras definidas.

Porém:

- `markup` percentual baseado em `total_cost = 0` **não deve** retornar `Infinity`/`NaN`.

Representação recomendada:

```text
markup_rate = NULL
markup_pct  = NULL
reason      = ZERO_COST_DENOMINATOR
```

A margem ainda pode ser calculada quando `price > 0` (a divisão é pelo preço, não pelo custo).

## 13. Resolução Temporal de Custo

Todo cálculo de preço deve ter um `cost_reference_date` explícito.

- O default pode ser `current_date`.
- O motor **deve** suportar simulação para uma data especificada: preço atual, análise histórica e simulação de custo futuro programado.
- O motor **deve** repassar essa data para `fn_resolve_supplier_cost`.
- O motor **nunca** decide de forma independente qual versão de custo usar.

O resolver retorna (confirmado no PRC-03B, migration 025):

| Campo | Tipo | Observação |
|-------|------|------------|
| `amount` | `numeric(14,4)` | NULL quando não confirmado |
| `cost_status` | `text` | `provided` / `confirmed_zero` / outros |
| `currency_code` | `char(3)` | NULL quando não confirmado |
| `mapping_id` | `uuid` | NULL quando não confirmado |
| `cost_table_id` | `uuid` | NULL quando não confirmado |
| `version_id` | `uuid` | NULL quando não confirmado |
| `version_number` | `integer` | NULL quando não confirmado |
| `valid_from` | `date` | NULL quando não confirmado |
| `valid_to` | `date` | NULL quando não confirmado |
| `resolution_status` | `text` | `CONFIRMED` ou `COST_NOT_CONFIRMED` |
| `reason` | `text` | `NULL` (provided) / `confirmed_zero` / status do item / `NO_APPLICABLE_COST` |

O motor de preço usa apenas linhas com `resolution_status = 'CONFIRMED'` como `base_cost`.

## 14. Modelo de Política de Preço (conceitual)

Entidades conceituais para PRC-04B (sem implementação):

### pricing_policies

- Identidade estável da política.
- Escopo (default, categoria, item de catálogo).
- Metadados: nome, descrição, status, responsável.
- Não contém regras mutáveis diretamente — aponta para versões.

### pricing_policy_versions

- Regras de cálculo versionadas: método (TARGET_MARGIN/MARKUP/FIXED_PRICE), taxas alvo, margem mínima, desconto máximo, regras de arredondamento.
- Vigência `[valid_from, valid_to)`.
- Workflow de aprovação (ver seção 16).
- Versões publicadas/aprovadas devem ser imutáveis.

### pricing_policy_components

- Componentes adicionais de custo da versão: tipo (FIXED / PERCENTAGE_OF_BASE_COST), valor/taxa, ordem, rótulo.
- Cada componente é rastreável no breakdown do cálculo.

Responsabilidades:

- `pricing_policies` responde "qual política se aplica?".
- `pricing_policy_versions` responde "quais regras numéricas valem agora?".
- `pricing_policy_components` responde "quais custos adicionais entram?".

**Não confundir versão de política com versão de tabela comercial** — a tabela comercial (PRC-05) referencia preços já calculados/publicados, não as regras que os geraram.

## 15. Escopo / Precedência de Política

Escopos potenciais: `DEFAULT`, `CATEGORY`, `CATALOG_ITEM`.

- **Não** incluir preços comerciais específicos de cliente no PRC-04 (sobreposição de cliente pertence às fases comerciais posteriores).

Escopo mínimo recomendado para PRC-04:

1. `DEFAULT` — política padrão da organização.
2. `CATALOG_ITEM` — política específica para um item do catálogo.

`CATEGORY` é opcional/stretch para PRC-04B; pode ser adicionado sem quebrar o modelo.

Precedência determinística futura:

```text
CATALOG_ITEM > CATEGORY > DEFAULT
```

Restrição contra ambiguidade:

- No máximo **uma** política ativa (por vigência) por (escopo, alvo) — ex.: uma política por `catalog_item_id` na mesma data de referência.
- Se duas políticas no mesmo nível de especificidade forem aplicáveis na mesma data, o sistema **não** escolhe arbitrariamente: isso é um erro de configuração → `POLICY_AMBIGUOUS`.
- PRC-04B deve validar essa unicidade no banco (constraint ou RPC).

## 16. Versionamento de Política

Recomenda-se reutilizar o mesmo modelo de lifecycle do domínio de custos, por coerência de ferramentas e conceitos:

```text
draft → under_review → approved → scheduled/active → superseded
                                        → cancelled
```

- `valid_from` / `valid_to` com semântica `[valid_from, valid_to)` (início inclusivo, fim exclusivo), consistente com o domínio de custos.
- Aprovação publica/ativa a versão; versões `active`/`superseded` são imutáveis nas regras numéricas.
- Não copiar mecanicamente o workflow de custo se não for necessário — a decisão aqui é reutilizar o modelo (mesmos status) porque: (a) consistência conceitual para o usuário; (b) reuso de RPCs/telas de workflow já existentes.
- Resolução de política usa a data de referência para escolher a versão `active`/`scheduled` aplicável; versões `scheduled` participam da resolução por data (mesma semântica do custo).

## 17. Pipeline de Cálculo

Ordem determinística validada:

1. **Validar identidade/contexto** — organização, permissão de consulta, `cost_reference_date` presente e válida.
2. **Resolver política de preço** — escopo + precedência + data de referência; se nenhuma política aplicável → `POLICY_NOT_FOUND`; se ambígua → `POLICY_AMBIGUOUS`.
3. **Resolver custo** — `fn_resolve_supplier_cost(org, supplier_company, catalog_item, cost_reference_date)`.
4. **Validar confirmação de custo** — se `resolution_status != 'CONFIRMED'` → `PRICE_NOT_CALCULABLE`/`COST_NOT_CONFIRMED`.
5. **Montar componentes adicionais** — validar tipos, valores, taxas (0 <= rate <= 1 para percentuais) → `INVALID_COMPONENT` se inválido.
6. **Calcular `total_cost`** — base + fixos + percentuais.
7. **Aplicar método de precificação** — TARGET_MARGIN / MARKUP; validar entradas (`INVALID_MARGIN`, `INVALID_MARKUP`).
8. **Aplicar arredondamento** — regra da política (NONE/NEAREST/UP/DOWN + passo) → `final_price`.
9. **Aplicar desconto simulado (opcional)** — recalcular métricas com `discounted_price`.
10. **Recalcular margem/markup resultantes** com o preço final (após rounding e/ou desconto).
11. **Avaliar piso / margem mínima** — `BELOW_COST`, `BELOW_MINIMUM_MARGIN`, `DISCOUNT_EXCEEDS_LIMIT`, `ZERO_COST_DENOMINATOR`.
12. **Produzir warnings/violações** — lista ordenada e estável.
13. **Retornar proveniência detalhada** — identidade, custo resolvido, política, cálculo, warnings/violações.

## 18. Modelo de Resultado / Erro

Status legíveis por máquina:

| Status | Categoria | Significado |
|--------|-----------|-------------|
| `OK` | — | Cálculo válido, sem violações. |
| `PRICE_NOT_CALCULABLE` | ERROR | Não é possível calcular preço normal (ex.: custo desconhecido). |
| `COST_NOT_CONFIRMED` | ERROR | Custo não confirmado — não calcular preço. |
| `POLICY_NOT_FOUND` | ERROR | Nenhuma política aplicável para o escopo/data. |
| `POLICY_AMBIGUOUS` | ERROR | Mais de uma política aplicável no mesmo nível de especificidade. |
| `INVALID_MARGIN` | ERROR | `target_margin_rate` fora de `[0, 1)`. |
| `INVALID_MARKUP` | ERROR | `markup_rate < 0`. |
| `INVALID_COMPONENT` | ERROR | Componente adicional inválido (tipo/valor/taxa). |
| `BELOW_COST` | VIOLATION | Preço abaixo de `total_cost`. |
| `BELOW_MINIMUM_MARGIN` | VIOLATION | Margem resultante abaixo da mínima da política. |
| `DISCOUNT_EXCEEDS_LIMIT` | VIOLATION | Desconto acima do máximo permitido pela política. |
| `ZERO_COST_DENOMINATOR` | WARNING | Custo zero tornou `markup` indefinido (NULL). |

Categorias:

- **ERROR** — bloqueia o cálculo; nenhum preço é produzido.
- **WARNING** — cálculo produzido, mas com observação (ex.: markup NULL por custo zero).
- **VIOLATION** — cálculo produzido, mas viola política; o preço não pode ser usado sem exceção (exigirá aprovação privilegiada no futuro).

Enums finais recomendados para PRC-04B/C:

```text
enum pricing_status        { OK, PRICE_NOT_CALCULABLE, POLICY_NOT_FOUND, POLICY_AMBIGUOUS, INVALID_MARGIN, INVALID_MARKUP, INVALID_COMPONENT }
enum pricing_reason        { COST_NOT_CONFIRMED, BELOW_COST, BELOW_MINIMUM_MARGIN, DISCOUNT_EXCEEDS_LIMIT, ZERO_COST_DENOMINATOR }
enum result_category       { ERROR, WARNING, VIOLATION }
```

## 19. Proveniência do Cálculo

Todo resultado autoritativo de precificação deve ser rastreável.

Estrutura do resultado:

```text
organization_id
catalog_item_id
supplier_company_id
cost_reference_date

resolved_cost:
  amount
  cost_status
  cost_table_id
  cost_version_id
  cost_version_number
  valid_from
  valid_to
  resolution_status
  reason

pricing_policy:
  policy_id
  policy_version_id

calculation:
  pricing_method
  base_cost
  additional_components: [ { id, type, base, rate/value, component_amount, label } ]
  additional_fixed_total
  additional_percentage_total
  total_cost
  target_margin_rate | markup_rate
  calculated_price
  rounding: { mode, step, applied }
  final_price
  discount: { rate, amount, discounted_price }  // quando simulado
  gross_profit
  margin_rate
  margin_pct
  markup_rate
  markup_pct

warnings: [ ... ]
violations: [ ... ]
```

Não persistir apenas o número final sem esta proveniência (a persistência de preços comerciais pertence ao PRC-05; logs de simulação importantes podem ser auditados futuramente).

## 20. Exemplos de Referência

### CASE A — TARGET MARGIN

```text
base_cost = 80
additional costs = 0
target margin = 20%

total_cost   = 80
price        = 80 / 0.80 = 100
gross_profit = 20
margin       = 20%
markup       = 25%
```

### CASE B — MARKUP

```text
base_cost = 80
markup = 25%

price        = 80 * 1.25 = 100
margin       = 20%
markup       = 25%
```

### CASE C — ADITIONAL COST

```text
base_cost = 80
fixed additional = 10
percentage additional = 5% of base_cost  →  80 * 0.05 = 4

total_cost = 80 + 10 + 4 = 94

Depois aplicar o método de precificação (ex.: TARGET_MARGIN 20% → 94/0.80 = 117.50).
```

### CASE D — MINIMUM MARGIN

```text
total_cost = 80
minimum margin = 20%

floor_price = 80 / 0.80 = 100

simulated price = 95
margin = (95 - 80) / 95 ≈ 15.79%  < 20%

→ BELOW_MINIMUM_MARGIN
```

### CASE E — BELOW COST

```text
total_cost = 80
simulated price = 70

70 < 80 → BELOW_COST
```

### CASE F — UNKNOWN COST

```text
resolver: resolution_status = 'COST_NOT_CONFIRMED', amount = NULL

→ PRICE_NOT_CALCULABLE, reason = COST_NOT_CONFIRMED
→ nenhum preço normal é produzido
```

### CASE G — CONFIRMED ZERO

```text
base_cost = 0 (confirmed_zero)

total_cost = 0
markup = NULL  (ZERO_COST_DENOMINATOR)  — nunca Infinity/NaN
margin  = calculável se price > 0 (divisão pelo preço)
```

## 21. Fronteira PRC-04 vs PRC-05

| Aspecto | PRC-04 | PRC-05 |
|---------|--------|--------|
| Pergunta | "Qual o preço calculado dado um custo e uma política?" | "Qual o preço comercial publicado para o cliente?" |
| Produto | Resultado de cálculo simulado (proveniente, determinístico) | Tabela comercial com vigência de venda |
| Persistência | Não persiste preços comerciais | Persiste tabelas, versões, atribuição a clientes |
| Publicação | Não publica | Publica e distribui |
| Responsável pelas regras | Motor de precificação (RPC autoritativa) | Gestão de tabelas comerciais |

**`CALCULATED PRICE != PUBLISHED COMMERCIAL PRICE`** — preservada explicitamente em todos os artefatos futuros.

## 22. Decisões para PRC-04B

Resumo das decisões que o PRC-04B deve executar (implementação):

1. **Margem e markup** — fórmulas canônicas da seção 4; nunca tratar como sinônimos; `20% margem ≠ 20% markup`.
2. **Aritmética autoritativa** — tudo em PostgreSQL `numeric`; frontend apenas preview temporário de UX.
3. **Fonte de custo** — exclusivamente `fn_resolve_supplier_cost`; proibida outra fonte de custo.
4. **Custo desconhecido** — bloqueia cálculo normal; `COST_NOT_CONFIRMED` → `PRICE_NOT_CALCULABLE`.
5. **Arredondamento** — após a fórmula e antes da validação final; margem/markup recalculados com `final_price`.
6. **Preço calculado vs publicado** — separação obrigatória; PRC-04 não publica.
7. **Versionamento de política** — lifecycle de custos reutilizado (draft→...→active→superseded); vigência `[valid_from, valid_to)`.
8. **Componentes percentuais** — base não circular (`base_cost`) no v1; sem percentual sobre preço final; sem motor tributário.
9. **Precisão recomendada** — custos/montantes `numeric(14,4)`; taxas `numeric(9,6)` (fração decimal, ex.: 0.200000); passos de arredondamento `numeric(12,4)`; percentuais derivados na camada de apresentação.
10. **Persistência** — simulações não persistidas automaticamente no v1; persistência de preço comercial só no PRC-05; auditoria opcional de simulações importantes pode ser discutida.
11. **Desconto** — recalcular métricas após desconto; piso efetivo = mais restritivo entre desconto máximo e margem mínima.
12. **FIXED_PRICE** — método opcional adiado para PRC-04B, com validação obrigatória de margem/markup resultantes.

## 23. Estado de Implementação (PRC-04B/C)

### PRC-04B — Schema (COMPLETED)

Modelo de dados confiável implementado e verificado:

- **Migrations:** `026_pricing_policy_schema` (tabelas + integridade) e `027_pricing_policy_security` (permissões, RBAC, RLS, auditoria) — seções 14-19 deste documento.
- **Verificação remota:** testes POL-H01..H27 (`tests/remote/pricing-policy-integrity-test.mjs`, fixtures em `tests/remote/sql/pricing_test_setup.sql`) — 33/33 assertivas PASS.

### PRC-04C — Engine (COMPLETED)

Motor de precificação autoritativo implementado:

- **Migration 028:** RPCs de workflow de política:
  - `fn_create_pricing_policy` — cria identidade da política (derived actor)
  - `fn_create_pricing_policy_version` — alocação concurrency-safe de version_number via FOR UPDATE
  - `fn_add_pricing_policy_component` / `fn_update_pricing_policy_component` / `fn_delete_pricing_policy_component`
  - `fn_submit_pricing_policy_version` — draft → under_review
  - `fn_approve_pricing_policy_version` — under_review → approved
  - `fn_return_pricing_policy_version_to_draft` — under_review → draft
  - `fn_cancel_pricing_policy_version` — draft/under_review/approved → cancelled
  - `fn_publish_pricing_policy_version` — approved → active/scheduled (continuous timeline)
  - `fn_sync_pricing_policy_version_status` — idempotent scheduled→active cutover
  - Permissão `pricing.calculate` + RBAC (admin/manager/operator)

- **Migration 029:** Motor de cálculo:
  - `fn_resolve_pricing_policy` — resolução por precedência de escopo (CATALOG_ITEM > CATEGORY > DEFAULT)
  - `fn_calculate_price` — camada matemática interna (numeric, não exposta)
  - `fn_simulate_price` — RPC pública de orquestração (auth → permission → policy → cost → calculate → result)

- **Testes:** `tests/remote/pricing-engine-test.mjs` (PRICE-H01..H46), fixtures em `tests/remote/sql/pricing_engine_test_setup.sql`

### PRC-04D — UI & Simulador (COMPLETED)

Frontend de políticas de preço e simulador, consumindo exclusivamente as RPCs autoritativas:

- **Feature:** `src/features/pricing/policies/` — types, camada de API, hooks, componentes, páginas.
- **Rotas:** `/pricing/policies`, `/pricing/policies/new`, `/pricing/policies/:id`, `/pricing/policies/:id/versions/new`, `/pricing/policies/versions/:id`, `/pricing/simulator`.
- **Dashboard:** módulos "Políticas de Preço" (`pricing.policy.view`) e "Simulador de Preço" (`pricing.calculate`) habilitados com gating por permissão.
- **Workflow:** transições exclusivamente via RPC (submit/approve/return_to_draft/cancel/publish); edição de rascunho via UPDATE direto org-escoped com whitelist de colunas (nunca envia `status`/`organization_id`/actor).
- **Cálculo:** `fn_simulate_price` é a única fonte de cálculo; o frontend não replica matemática financeira.
- **Testes:** `src/features/pricing/policies/__tests__/` — API, RBAC, formulário de método, simulador (resultado/formatos pt-BR) e workflow — 52 testes de UI.
- **Qualidade:** typecheck, lint e build PASS; suíte completa 163/163 PASS; regressão remota 50/50 PASS.

- **Fora de escopo nesta fase:** persistência de preços comerciais (PRC-05).