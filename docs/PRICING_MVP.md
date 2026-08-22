# Precificação MVP — Simplificação de Produto

**Status:** Arquitetura definida (MVP-PRICING-00)
**Data:** 2026-08-22
**Baseline:** 41/41 migrations · 382/382 testes · UIX-03D1 COMPLETED/RETAINED

---

## 1. Objetivo de Negócio

O módulo de Precificação evoluiu para uma sofisticação técnica superior à necessidade operacional atual da Efetiva Gestão. A Complexidade de:

- versionamento de tabelas de custo
- workflows de aprovação multi-etapa
- tabelas comerciais publicadas
- resolução de precedência final por cliente
- overrides e atribuições temporais

não corresponde à necessidade diária do operador comum, que precisa basicamente de:

1. Cadastrar fornecedores.
2. Cadastrar exames/serviços.
3. Cadastrar o preço que cada fornecedor cobra por exame.
4. Comparar preços de fornecedores para o mesmo exame.
5. Identificar automaticamente o menor custo válido.
6. Configurar uma margem de lucro padrão.
7. Calcular o preço de venda recomendado.
8. Calcular markup automaticamente.
9. Fornecer uma tabela de preços simples e pesquisável.

**Este pivô NÃO é um rollback.** É uma simplificação da superfície de experiência do usuário, preservando toda a robustez do backend existente.

---

## 2. Problema de Complexidade

A UX atual exige que o operador entenda:

- tabelas de custo (`supplier_cost_tables`)
- versões de custo (`supplier_cost_table_versions`)
- ativação e publicação de versões
- supersessão temporal
- políticas de preço com escopos e precedência
- tabelas comerciais com versionamento próprio
- atribuição de tabelas a clientes
- overrides por cliente+item
- resolução de precedência final

Essa complexidade é justificada para empresas maduras com múltiplos níveis de contrato, mas não para a operação atual da Efetiva.

---

## 3. Fluxo de Usuário MVP

O fluxo operacional primário deve se tornar:

```
FORNECEDOR
  → EXAME
    → VALOR DO FORNECEDOR
      → COMPARAR
        → MARGEM
          → PREÇO DE VENDA
```

Este deve ser o modelo mental do módulo para o usuário comum.

---

## 4. Módulos MVP Visíveis

O futuro `/pricing` home deve expor apenas **quatro áreas primárias**:

| Card | Descrição | Ação principal |
|------|-----------|----------------|
| **FORNECEDORES** | Cadastrar fornecedores e seus valores | Gerenciar fornecedores, mapeamentos e preços |
| **EXAMES** | Cadastrar exames e serviços | Gerenciar catálogo de exames |
| **CUSTOS & COMPARATIVO** | Comparar fornecedores e encontrar o menor custo | Comparar preços por exame |
| **TABELA DE PREÇOS** | Pesquisar o preço sugerido dos exames | Buscar preço de venda |

Exibir também uma configuração simples no nível da organização:

```
Margem padrão: XX%
[ Alterar ]
```

**Não implementar esta tela no MVP-PRICING-00.** Definir apenas a arquitetura e UX.

---

## 5. Módulos Avançados Ocultos/Dormentes

Estas capacidades avançadas existentes devem eventualmente desaparecer da navegação MVP:

| Módulo | Status MVP | Destino |
|--------|-----------|---------|
| Políticas de Preço | `ADVANCED_HIDDEN` | Mantido no banco e código, oculto da UX principal |
| Simulador Avançado | `ADVANCED_HIDDEN` | Mantido, acessível via rota direta |
| Tabelas Comerciais | `ADVANCED_HIDDEN` | Mantido (UIX-03D1), oculto da navegação MVP |
| Clientes / Pricing | `ADVANCED_HIDDEN` | Mantido, acessível via rota direta |
| Assignments | `ADVANCED_HIDDEN` | Componente de PRC-06 |
| Overrides | `ADVANCED_HIDDEN` | Componente de PRC-06 |
| Final Price Resolution | `ADVANCED_HIDDEN` | Componente de PRC-07 |
| Commercial Lookup | `ADVANCED_HIDDEN` | Componente de PRC-06 |
| Gerenciamento avançado de versões de custo | `ADVANCED_HIDDEN` | Acesso técnico/administrativo |
| Importações | `FUTURE` | Não implementado |
| Conciliação | `FUTURE` | Não implementado |
| Inteligência de Mercado | `FUTURE` | Não implementado |

**Não deletar rotas ou código.** Classificar como `ADVANCED_HIDDEN`.

Rotas avançadas permanecem tecnicamente acessíveis a administradores autorizados, mas não competem na navegação MVP ordinária.

---

## 6. Fontes de Dados Canônicas (Reuso)

O MVP deve reutilizar integralmente as fontes de dados canônicas existentes:

### 6.1 Fornecedor

```
companies + supplier_profiles
```

**NÃO criar:** `mvp_suppliers`, `simple_suppliers`, `pricing_suppliers` ou qualquer tabela duplicada.

### 6.2 Exame/Item

```
catalog_items
```

**NÃO criar:** `mvp_exams`, `exam_prices`, `simple_exams` como outro catálogo mestre.

### 6.3 Relação Fornecedor ↔ Exame

```
supplier_catalog_items
```

O mesmo exame pode ter preços de:

- Fornecedor A
- Fornecedor B
- Fornecedor C

**NÃO duplicar** um exame para cada fornecedor.

### 6.4 Vocabulário do Usuário

O MVP deve usar terminologia de negócio simples:

| Preferir | Evitar |
|----------|--------|
| Exames | Catálogo Mestre |
| Fornecedores | Companies + Supplier Profiles |
| Valores dos Fornecedores | Cost Table Versions |
| Comparar | Cost Resolution Engine |
| Preço Sugerido | Calculated Price via Pricing Engine |

O catálogo mestre genérico (`catalog_items` com `item_type`) NÃO é destruído. A visão "Exames" do MVP é uma **filtragem/user-facing view** sobre o catálogo canônico.

---

## 7. Decisão de Arquitetura de Custo

### 7.1 Opções Avaliadas

| Opção | Descrição |
|-------|-----------|
| **A — Fachada sobre o modelo versionado** | MVP UI → Fachada simples → `supplier_cost_tables` / `supplier_cost_table_versions` / `supplier_cost_items` |
| **B — Nova tabela simplificada** | MVP UI → Nova tabela `current_supplier_prices` (ou similar) |

### 7.2 Análise Comparativa

| Critério | Opção A (Fachada) | Opção B (Nova tabela) |
|----------|-------------------|-----------------------|
| Duplicação de dados | Nenhuma | Cria segunda fonte de custo |
| Complexidade de implementação | Moderada (nova RPC) | Baixa (CRUD simples) |
| Integridade de dados | Mantida (uma fonte) | Risco de divergência |
| Histórico temporal | Preservado pelo versionamento | Perdido ou duplicado |
| Compatibilidade futura | Total | Requer migração de dados |
| Risco de fonte duplicada | Nenhum | Alto (duas fontes de custo) |
| Performance | Depende da fachada | Simples |
| Testabilidade | Usa infraestrutura existente | Nova superfície |

### 7.3 Decisão Recomendada

**OPÇÃO A — Fachada sobre o modelo versionado.**

Razões:

1. A UI deve ser simples; o backend pode permanecer robusto.
2. Deve haver apenas UMA fonte autoritativa de custo.
3. O versionamento temporal existente preserva histórico completo.
4. O `fn_resolve_supplier_cost` já resolve custo vigente por data.
5. Criar uma nova tabela de "preço atual" criaria risco de divergência.
6. A migração de dados futura seria mais complexa.

O banco de dados NÃO é alterado. A simplificação é pura fachada de apresentação.

---

## 8. Fachada de Escrita de Custo (Especificação Conceitual)

### 8.1 Contrato Conceitual

Uma future RPC conceitualmente equivalente a:

```sql
fn_mvp_save_supplier_exam_prices(
  p_organization_id uuid,
  p_supplier_company_id uuid,
  p_reference_date date,
  p_items jsonb  -- [{ catalog_item_id, amount }]
)
```

ou nome melhor. O frontend submete algo conceitualmente como:

```json
{
  "supplier_company_id": "uuid",
  "reference_date": "2026-08-22",
  "items": [
    { "catalog_item_id": "uuid", "amount": 18.00 },
    { "catalog_item_id": "uuid", "amount": 12.00 }
  ]
}
```

### 8.2 Comportamento de Escrita

A fachada de backend deve traduzir com segurança para o modelo de custo autoritativo existente, tratando:

| Cenário | Comportamento |
|---------|---------------|
| `supplier_catalog_items` mapping ausente | Criar automaticamente (se seguro — ver §9) |
| Mapping existente | Usar existente |
| Primeiro preço do fornecedor | Criar tabela → versão → itens |
| Edições subsequentes | Criar nova versão draft com itens atualizados |
| Múltiplas edições no mesmo dia | Nova versão ou adição de itens à versão draft do dia |
| Preços futuros | Usar `valid_from` futuro, sem supersessão prematura |
| Versão ativa existente | Criar nova versão draft; não editar publicada |
| Versões imutáveis ativas/superseded | Jamais editar; criar nova versão |
| Atomicidade | Tudo dentro de uma transação; rollback em falha parcial |
| Falha parcial | Nenhum item salvo; erro informativo |
| Saves concorrentes | Serialização por `FOR UPDATE` (padrão DEC-044/026) |
| Limites transacionais | Uma transação por chamada RPC |

### 8.3 Fluxo Simplificado

```
1. Buscar ou criar supplier_cost_table para o fornecedor
2. Criar nova versão (draft) com valid_from = reference_date
3. Para cada item:
   a. Buscar ou criar supplier_catalog_items mapping
   b. Inserir supplier_cost_item na versão draft
4. Submeter versão automaticamente (ou manter draft conforme política)
5. Publicar (se política permitir) ou deixar para aprovação
```

**Nota:** O MVP pode simplificar ainda mais, publicando automaticamente quando a política organizacional assim permitir. A definição exiga do workflow simplificado fica para MVP-PRICING-02.

---

## 9. Mapeamento Automático

### 9.1 Pergunta

Se um operador insere um preço para um fornecedor + catálogo de item que ainda NÃO possui `supplier_catalog_items`, pode-se criar o mapping automaticamente?

### 9.2 Preferência

**Sim**, se tecnicamente seguro. O usuário comum não deve precisar de um workflow separado de mapeamento apenas para registrar um preço de fornecedor.

### 9.3 Salvaguardas Documentadas

A criação automática deve:

1. Verificar que `supplier_profiles.status = 'active'`
2. Verificar que `catalog_items.status = 'active'`
3. Verificar que `catalog_items.organization_id = p_organization_id`
4. Verificar que `companies.organization_id = p_organization_id`
5. Criar com `external_name` derivado do `catalog_items.name` (ou input do usuário)
6. Criar com `status = 'active'`
7. Não definir `is_preferred = true` automaticamente
8. Registrar criação em audit log
9. Retornar o `supplier_catalog_item_id` criado para referência

### 9.4 Nomenclatura

O mapping automático pode usar o nome do item do catálogo como `external_name` quando o usuário não fornecer um nome alternativo. O `external_code` fica NULL quando não fornecido.

---

## 10. Semântica de Status de Custo

Preservar semânticas existentes:

| Status | Significado | Exibição MVP |
|--------|-------------|--------------|
| `provided` | Custo confirmado e válido | Participa da comparação |
| `confirmed_zero` | Custo confirmado como zero | R$ 0,00 — válido |
| `not_provided` | Custo não fornecido | **NÃO** vira R$ 0,00 |
| `awaiting_quote` | Aguardando cotação | Excluído da comparação |
| `not_applicable` | Não aplicável | Excluído da comparação |
| `discontinued` | Descontinuado | Excluído da comparação |

**Regra crítica:** `UNKNOWN/COST NOT CONFIRMED ≠ ZERO`. Nunca fabricar R$ 0,00 para custo desconhecido.

---

## 11. Regra do Menor Custo

### 11.1 Algoritmo

Para cada exame, na data de referência selecionada:

1. Consultar `fn_resolve_supplier_cost` para **todos** os fornecedores que possuem mapping ativo para o item.
2. Filtrar apenas resultados com `resolution_status = 'CONFIRMED'`.
3. Excluir status `not_provided`, `awaiting_quote`, `not_applicable`, `discontinued`.
4. Selecionar o menor valor monetário (`amount`).

### 11.2 Regra de Empate

Se **múltiplos fornecedores** possuem exatamente o mesmo menor custo:

- **NÃO escolher arbitrariamente** um como financeiramente superior.
- **Exibir o empate.**

Exemplo:

```
Menor custo: R$ 12,00
Fornecedores: Lab A · Lab B
```

### 11.3 Cenários Especiais

| Cenário | Resultado |
|---------|-----------|
| Nenhum custo confirmado | "Nenhum custo disponível" (não R$ 0,00) |
| Apenas 1 fornecedor com custo | Exibe ese fornecedor como menor |
| Todos com custo zero | Menor custo = R$ 0,00; empate entre todos |
| Custo zero e custo positivo | Menor custo = R$ 0,00 (zero é menor) |

---

## 12. Fachada de Comparação de Custo (Especificação Conceitual)

### 12.1 Contrato Conceitual

```sql
fn_mvp_compare_exam_costs(
  p_organization_id uuid,
  p_catalog_item_id uuid,
  p_reference_date date DEFAULT current_date
) RETURNS jsonb
```

### 12.2 Resultado Esperado por Exame

```json
{
  "catalog_item_id": "uuid",
  "exam_code": "EXA-000001",
  "exam_name": "Audiometria",
  "suppliers": [
    {
      "supplier_company_id": "uuid",
      "supplier_name": "Lab A",
      "cost": 18.00,
      "cost_status": "provided",
      "reference_date": "2026-08-22",
      "is_lowest": true
    },
    {
      "supplier_company_id": "uuid",
      "supplier_name": "Lab B",
      "cost": 20.00,
      "cost_status": "provided",
      "reference_date": "2026-08-22",
      "is_lowest": false
    }
  ],
  "lowest_cost": 18.00,
  "lowest_supplier_name": "Lab A",
  "quotation_count": 2,
  "has_confirmed_cost": true
}
```

### 12.3 Comparação em Lote

A página principal de comparação **NÃO** deve chamar uma RPC por exame. Projetar uma operação em lote.

Saída conceitual por exame:

| Campo | Descrição |
|-------|-----------|
| Exame | Nome/código |
| Menor fornecedor | Nome do fornecedor com menor custo |
| Menor custo | Valor monetário |
| Cotações válidas | Quantidade de fornecedores com custo confirmado |
| Margem padrão | Percentual da organização |
| Preço sugerido | Calculado pela fórmula |
| Markup | Derivado |
| Lucro bruto | Derivado |

Evitar chamadas N+1 no frontend.

---

## 13. Modelo de Margem Padrão

### 13.1 Conceito

O MVP precisa de UM valor de margem no nível da organização:

```
default_target_margin_rate
```

Exemplos de valores no banco:

| Valor DB | Exibição UI |
|----------|-------------|
| 0.20 | 20% |
| 0.30 | 30% |
| 0.40 | 40% |

A organização possui **uma** margem padrão para todos os exames no MVP.

Sem margem por categoria.
Sem margem por exame.
Sem margem por cliente.
Essas podem ser capacidades futuras.

### 13.2 Armazenamento Recomendado

Avaliar a opção mais simples e segura para armazenar `default_target_margin_rate`:

| Opção | Descrição | Recomendação |
|-------|-----------|-------------|
| A. Estrutura existente `organizations` | Se `organizations` possuir campo apropriado | Verificar schema |
| B. Tabela dedicada `organization_pricing_settings` | Tabela minúscula 1:1 com organization | Recomendada se A não for viável |
| C. Reuso invisível de `pricing_policies` | Criar política default oculta | Não recomendada — complexidade desnecessária |

**Não forçar** o usuário comum através de gestão de política de preço para configurar uma margem.

**Não implementar a migration ainda.** Documentar apenas.

### 13.3 Interface Conceitual

```
Margem padrão: 30%
[ Alterar ]
```

Usuário autorizado altera; outros apenas visualizam.

---

## 14. Margem é Input do Usuário

O usuário de negócio configura:

```
MARGEM DE LUCRO DESEJADA
```

O usuário **NÃO** precisa configurar markup.

Exemplo:

```
Custo:           R$ 100,00
Margem alvo:     30%
Preço sugerido:  R$ 100 / (1 - 0.30) = R$ 142,86
Markup:          42,86%
```

---

## 15. Distinção Margem vs Markup

Manter distinção semântica estrita:

### Margem (margin)

Calculada sobre o **preço** (receita):

```
margin_rate = (price - total_cost) / price
price       = total_cost / (1 - margin_rate)
```

### Markup

Calculado sobre o **custo** (base):

```
markup_rate = (price - total_cost) / total_cost
price       = total_cost * (1 + markup_rate)
```

**20% de margem ≠ 20% de markup.**

- 20% de margem → preço = custo / 0.80 (custo 80 → 100)
- 20% de markup → preço = custo * 1.20 (custo 80 → 96)

**NÃO chamar** `custo × 1.30` de "30% de margem". Isso é 30% de markup, não 30% de margem de lucro.

---

## 16. Cálculo Autoritativo

### 16.1 Auditoria do `fn_calculate_price`

O motor existente já realiza cálculos com PostgreSQL `numeric`:

- `fn_resolve_pricing_policy` — resolução de política
- `fn_calculate_price` — camada matemática interna
- `fn_simulate_price` — orquestração pública

### 16.2 Arquitetura Recomendada

```
MVP Facade
  → Cálculo autoritativo PostgreSQL
  → Retornar preço recomendado + métricas financeiras
```

**NÃO duplicar** fórmulas autoritativas em React.

### 16.3 Reuso de `fn_simulate_price`

Verificar se o wrapper mais limpo pode reutilizar `fn_simulate_price` com:

- `pricing_method = 'target_margin'`
- `base_cost` = menor custo confirmado do fornecedor
- `target_margin` = margem padrão da organização
- Sem desconto
- Sem componentes avançados

E retornar:

- `base_cost`
- `total_cost`
- `recommended_price`
- `gross_profit`
- `margin_pct`
- `markup_pct`

### 16.4 Acoplamento Potencial

Identificar se há acoplamento a:

- `pricing_policy_version_id`
- componentes de política
- proveniência de política

que torne isso inseguro ou excessivamente complexo. Se houver, criar uma RPC simples dedicada ao MVP que chame `fn_calculate_price` internamente.

### 16.5 Princípio

Não criar uma política de preço invisível e complexa apenas para suportar uma margem única da organização, a menos que haja uma razão arquitetural compellingente.

O conceito MVP é:

```
menor custo
  + margem padrão
  = preço sugerido
```

---

## 17. Tabela de Preços Padrão

### 17.1 Arquitetura

A tabela de preços padrão do MVP deve preferencialmente ser **DERIVADA DINAMICAMENTE**.

Não requerer criação/publicação de Tabela Comercial (PRC-05).

Conceito:

```
custo confirmado mais baixo atual
  + margem padrão atual da organização
  = preço de venda padrão recomendado atual
```

Isso mantém o MVP simples.

### 17.2 Tabelas Comerciais Avançadas

Tabelas Comerciais existentes permanecem como capacidade avançada.

**NÃO** são a fonte obrigatória para a tabela de preços padrão do MVP.

Não deletar. Futura evolução de negócio pode usá-las para:

- preços comerciais fixos
- publicação controlada
- tabelas de preço históricas
- contratos com clientes

Mas a operação ordinária do MVP não deve exigi-las.

---

## 18. Rota de Tabela de Preços

### 18.1 Rota

```
/pricing/prices
```

### 18.2 Propósito

Consulta rápida de preços operacionais.

### 18.3 Interação Primária

Busca por:

- código do exame
- nome do exame

Exemplo:

```
Pesquisar exame...
[ Audiometria________________________________ ]

EXAME                              PREÇO
Audiometria tonal                  R$ 25,71
Acuidade visual                    R$ 14,29
Espirometria                       R$ 35,71
Glicemia                           R$ 11,43
Hemograma completo                 R$ 17,14
```

### 18.4 Experiência do Usuário Comum

Para usuários de consulta, exibir primariamente:

- Exame
- Preço de venda

**NÃO sobrecarregar** a tabela com:

- fornecedor
- custo
- margem
- markup
- proveniência

a menos que o papel do usuário exija esses detalhes.

### 18.5 Detalhe para Gestores

Para usuários de gestão autorizados, expandir um exame pode mostrar:

```
Preço sugerido:      R$ XX,XX
Menor custo:         R$ XX,XX
Fornecedor:          Nome do fornecedor
Margem:              XX%
Markup:              XX%
Lucro bruto:         R$ XX,XX
Cotações válidas:    N
```

Manter a tela de busca operacionalmente simples.

---

## 19. Tratamento de Custo Zero

Definir explicitamente:

Se o menor custo confirmado = 0, o preço recomendado pela fórmula pura de margem-alvo também é 0.

Markup não pode ser calculado significativamente porque o denominador custo é zero.

Comportamento esperado na UI:

```
Custo:    R$ 0,00
Preço:    R$ 0,00
Margem:   (contexto dependente / conforme resultado do motor)
Markup:   —
```

Não dividir por zero.

---

## 20. Sem Preço Quando Custo Desconhecido

Se não existir custo confirmado para um exame:

**NÃO fabricar** R$ 0,00.

Comportamento esperado na tabela de preços padrão:

```
Preço indisponível
```

ou equivalente.

Motivo: Nenhum custo confirmado.

---

## 21. Experiência de Fornecedores

Reutilizar módulo de fornecedores atual.

O futuro detalhe de fornecedor deve ganhar uma ação primária simples como:

```
Cadastrar valores
```

ou:

```
Valores dos exames
```

Isso abre a experiência simplificada de entrada de preços do fornecedor.

Não implementar no MVP-00.

---

## 22. Experiência de Exames

Reutilizar dados do catálogo existente.

Futura página simplificada de Exames deve priorizar:

- nome do exame
- código
- categoria/tipo se necessário
- status
- contagem de cotações de fornecedores (se disponível a baixo custo)

Ação primária:

```
Novo exame
```

Evitar expor aliases/mapeamentos se desnecessário.

---

## 23. Rota de Comparação

### 23.1 Rota

```
/pricing/compare
```

### 23.2 Conceito Desktop

| EXAME | MENOR FORNECEDOR | MENOR CUSTO | COTAÇÕES | MARGEM | PREÇO SUGERIDO | MARKUP |
|-------|-------------------|-------------|----------|--------|-----------------|--------|
| Audiometria | Lab A | R$ 18,00 | 3 fornecedores | 30% | R$ 25,71 | 42,86% |

### 23.3 Expansão

Clicar/expandir um exame mostrar:

```
Fornecedor A     R$ 18,00   MAIS BARATO
Fornecedor B     R$ 20,00
Fornecedor C     R$ 23,50

Margem padrão:        30%
Preço sugerido:       R$ 25,71
Lucro bruto:          R$ 7,71
Markup:               42,86%
```

Não expor campos técnicos desnecessários.

---

## 24. Futura Rota /pricing Home

Composição alvo:

```
PREÇOS & EXAMES

Margem padrão: 30%
                              [ Alterar ]

Gerencie exames, custos e preços.

[ FORNECEDORES ]
Cadastrar fornecedores e seus valores

[ EXAMES ]
Cadastrar exames e serviços

[ CUSTOS & COMPARATIVO ]
Comparar fornecedores e encontrar o menor custo

[ TABELA DE PREÇOS ]
Pesquisar o preço sugerido dos exames
```

Apenas estes quatro cards primários.

---

## 25. Rotas Avançadas Ocultas

Auditar todas as rotas existentes existentes e classificar cada uma:

| Rota Atual | Classificação MVP |
|------------|-------------------|
| `/pricing` | MVP_VISIBLE |
| `/pricing/catalog` | MVP_VISIBLE (como "Exames") |
| `/pricing/suppliers` | MVP_VISIBLE (como "Fornecedores") |
| `/pricing/costs` | ADVANCED_HIDDEN |
| `/pricing/policies` | ADVANCED_HIDDEN |
| `/pricing/simulator` | ADVANCED_HIDDEN |
| `/pricing/commercial` | ADVANCED_HIDDEN |
| `/pricing/clients` | ADVANCED_HIDDEN |
| `/pricing/compare` | MVP_VISIBLE (novo) |
| `/pricing/prices` | MVP_VISIBLE (novo) |

Não deletar rotas. URLs avançadas podem permanecer tecnicamente acessíveis.

---

## 26. Recomendação: Sem Card "Avançado" Inicialmente

Recomendação inicial do MVP:

**NÃO adicionar** um quinto card gigante "Avançado" ao `/pricing`.

Manter a superfície simples genuinamente simples.

Acesso administrativo avançado pode permanecer via:

- rota direta
- futura área `Configurações`

Documentar esta recomendação.

---

## 27. Simplificação RBAC

### 27.1 Auditoria de Permissões Existentes

Mapear permissões existentes conceitualmente ao vocabulário MVP:

| Conceito MVP | Permissão existente |
|--------------|---------------------|
| Ver fornecedores | `pricing.supplier.view` |
| Gerenciar fornecedores | `pricing.supplier.create`, `pricing.supplier.edit` |
| Ver exames | `pricing.catalog.view` |
| Gerenciar exames | `pricing.catalog.create`, `pricing.catalog.edit` |
| Ver custos | `pricing.cost.view` |
| Gerenciar valores do fornecedor | `pricing.cost.create`, `pricing.cost.edit` |
| Ver comparação | `pricing.cost.view` (ou permissão de comparação dedicada futura) |
| Editar margem padrão | Permissão futura ou reutilizar `pricing.policy.edit` |
| Ver preços de venda | `pricing.cost.view` + `pricing.calculate` |

### 27.2 Mínimo de Permissões Novas

Identificar o MÍNIMO genuinamente novo:

| Permissão | Necessidade |
|-----------|-------------|
| `pricing.mvp.manage_default_margin` | Para alterar margem padrão da organização |
| `pricing.mvp.compare` | Para acessar comparação (pode ser `pricing.cost.view`) |
| `pricing.mvp.prices` | Para acessar tabela de preços (pode ser `pricing.cost.view` + `pricing.calculate`) |

Preferência: reusar permissões existentes sempre que possível.

Não implementar permissões ainda.

---

## 28. Confidencialidade de Preços

Projetar com separação de papéis em mente:

Alguns usuários podem precisar apenas de:

- preço de venda

enquanto gestão precisa de:

- fornecedor
- custo
- margem
- markup
- lucro

Documentar como o RBAC existente pode suportar isso sem duplicar dados de preço.

---

## 29. Princípio: Uma Única Fonte de Verdade

Princípio arquitetural crítico:

| Conceito | Fonte |
|----------|-------|
| Fornecedores | ÚNICA fonte canônica (`companies` + `supplier_profiles`) |
| Exames | ÚNICA fonte canônica (`catalog_items`) |
| Mapeamento Fornecedor↔Exame | ÚNICA fonte canônica (`supplier_catalog_items`) |
| Custos | ÚNICA fonte canônica (`supplier_cost_*` via versões) |
| Margem | ÚNICA configuração organizacional |
| Preço recomendado | DERIVADO (não persistido) |
| Markup | DERIVADO |
| Lucro bruto | DERIVADO |

**Não criar** conjuntos de dados mestre paralelos.

---

## 30. Sem Persistência de Preço Comercial no MVP

A menos que a análise de arquitetura identifique uma razão crítica, a tabela de preços pesquisável do MVP **NÃO** deve persistir uma nova cópia do preço recomendado.

Preferir cálculo a partir de:

```
custo atual
  + margem padrão atual
```

Isso evita registros de preço duplicados e desatualizados.

Documentar tradeoffs.

---

## 31. Performance

### 31.1 Requisito

A futura tabela de preços pesquisável deve ser viável com centenas ou milhares de exames.

### 31.2 Abordagem

**NÃO** projetar:

- uma RPC por linha
- uma consulta de fornecedor por exame
- uma chamada de cálculo de precificação por renderização React

**Preferir** um resolved/view/RPC baseado em conjunto (set-based) no PostgreSQL.

---

## 32. Resolver de Preços em Lote (Especificação Conceitual)

Contrato backend potencial que pode retornar:

```json
{
  "catalog_item_id": "uuid",
  "code": "EXA-000001",
  "name": "Audiometria",
  "lowest_cost": 18.00,
  "lowest_supplier": "Lab A",
  "quotation_count": 3,
  "target_margin_rate": 0.30,
  "recommended_price": 25.71,
  "gross_profit": 7.71,
  "markup_rate": 0.4286,
  "pricing_status": "OK"
}
```

para uma consulta/página. Não implementar ainda.

---

## 33. Busca

A futura tabela de preços pesquisável deve suportar:

- código do exame
- nome do exame

Opcionalmente aliases se a busca existente do catálogo suportar barato.

Não criar ElasticSearch ou outro subsistema de busca.

Usar capacidades PostgreSQL/Supabase existentes.

---

## 34. Princípio de UX

A interface MVP deve responder diretamente a perguntas comuns:

| Pergunta | Resposta na UX |
|----------|---------------|
| "Quanto custa esse exame?" | Menor custo do fornecedor |
| "Qual fornecedor cobra menos?" | Fornecedor com menor custo |
| "Quanto devemos cobrar?" | Preço sugerido |
| "Qual nossa margem?" | Margem padrão configurada |
| "Qual o markup?" | Markup derivado |

O usuário não deve navegar por cinco módulos técnicos para responder essas perguntas.

---

## 35. Sem Falsa Simplificação

**NÃO** simplesmente renomear:

- Políticas → Simplificar
- Custos → Simplificar
- Tabelas Comerciais → Simplificar

preservando o mesmo fluxo multi-etapa.

O fluxo operacional em si deve se tornar mais simples.

A complexidade avançada do backend pode permanecer oculta atrás de operações de fachada.

---

## 36. Estratégia de Migração

A simplificação do MVP deve ser apenas adiante (forward-only).

**NÃO alterar** migrations:

- 001–041

Quaisquer adições futuras no banco começam em:

- **042**

somente quando explicitamente autorizado em fases posteriores do MVP.

---

## 37. Preservação do Sistema Avançado

Preservar integralmente todos os dados existentes:

- dados de catálogo
- dados de fornecedor
- mapeamentos de fornecedor
- custos de fornecedor
- versões de custo
- políticas de preço
- motor de precificação
- preços comerciais
- versões comerciais
- precificação por cliente
- resolução de preço final

**Zero perda de dados.** **Zero migração destrutiva.**

---

## 38. Fronteiras de Implementação MVP-PRICING-00

MVP-PRICING-00 é **APENAS ARQUITETURA**.

Alterações permitidas:

- `docs/PRICING_MVP.md`
- `docs/ROADMAP.md`
- `docs/DECISION_REGISTER.md`
- Documentação estritamente necessária para registrar este pivô

**NÃO modificar:**

- `src/`
- Migrations Supabase
- RPCs
- Testes
- Rotas
- Componentes
- Implementação de API

---

## 39. Riscos

| Risco | Mitigação |
|-------|-----------|
| Duplicação acidental de fonte de custo | Opção A (fachada) — uma única fonte |
| Perda de histórico temporal | Preservar modelo versionado existente |
| Confusão entre "preço sugerido" e "preço publicado" | Fronteiras explícitas (DEC-036/045) |
| Performance com muitos exames | RPC em lote (set-based) |
| Usuário vê complexidade técnica | Fachada de UI oculta backend robusto |
| Margem desatualizada | Cálculo dinâmico a partir de custo + margem |
| Dados divergentes entre MVP e avançado | Uma única fonte de verdade |
| Equipe esquece capacidades avançadas | Classificação explícita ADVANCED_HIDDEN |

---

## 40. Decisões Técnicas em Aberto

| Decisão | Status | Fase |
|---------|--------|------|
| Local exato de `default_target_margin_rate` (org table vs settings) | Em análise | MVP-PRICING-02 |
| Se `fn_simulate_price` pode ser reusada diretamente ou se precisa wrapper | Em análise | MVP-PRICING-02 |
| Nomenclatura exata da fachada de escrita | Em definição | MVP-PRICING-02 |
| Workflow simplificado (auto-publish vs draft) | Em definição | MVP-PRICING-02 |
| Permissões MVP exatas | Em definição | MVP-PRICING-01 |
| Se comparação é rota dedicada ou tab no dashboard | Em definição | MVP-PRICING-01 |

---

## 41. Plano de Implementação

| Fase | Escopo | Status |
|------|--------|--------|
| **MVP-PRICING-00** | Arquitetura e simplificação de produto | **ESTA FASE** |
| **MVP-PRICING-01** | Navegação simplificada e UX de preços | DEFINIDO (futuro) |
| **MVP-PRICING-02** | Entrada de preço do fornecedor e comparação de custos | DEFINIDO (futuro) |
| **MVP-PRICING-03** | Margem padrão e tabela de preços pesquisável | DEFINIDO (futuro) |
| **MVP-PRICING-04** | Hardening / E2E / QA responsivo | DEFINIDO (futuro) |

### MVP-PRICING-01 (Futuro — NÃO implementar)

Simplificar `/pricing`:

- Exibir apenas: Fornecedores, Exames, Custos & Comparativo, Tabela de Preços
- Ocultar cards avançados
- Simplificar navegação/cópia relevante
- Sem alterações de fachada backend

### MVP-PRICING-02 (Futuro — NÃO implementar)

- Fluxo de entrada de preço de fornecedor por exame
- Mapeamento automático seguro
- RPC fachada de custo
- RPC comparação de custo em lote
- Página de comparação
- Resolver de menor custo
- Pode introduzir migration 042+ se necessário

### MVP-PRICING-03 (Futuro — NÃO implementar)

- Margem padrão da organização
- Wrapper autoritativo de preço
- Resolver de preços recomendados em lote
- `/pricing/prices`
- Busca
- Detalhes de gestão
- Markup e exibição de lucro bruto

### MVP-PRICING-04 (Futuro — NÃO implementar)

- E2E
- QA responsivo
- Matriz de permissões
- Testes de performance
- Acessibilidade
- Verificação PWA
- Regressão remota
- Hardening de produção

---

## 42. Não Deletar Testes

Testes de funcionalidades avançadas permanecem valiosos.

Não deletá-los apenas porque sua UI se torna oculta posteriormente.

Oculto não significa não suportado no nível de banco de dados.

---

## 43. Verificação de Aceitação

- [ ] UIX-03D1 preservado
- [ ] UIX-03D2 pausado
- [ ] Fluxo de negócio MVP definido
- [ ] Quatro módulos visíveis definidos
- [ ] Módulos avançados classificados como dormentes
- [ ] Fornecedor canônico reusado
- [ ] Catálogo canônico reusado
- [ ] Mapeamento fornecedor↔item reusado
- [ ] Fonte de custo única selecionada (Opção A)
- [ ] Estratégia de fachada de escrita definida
- [ ] Mapeamento automático analisado
- [ ] Regra do menor custo definida
- [ ] Regra de empate definida
- [ ] Desconhecido vs zero preservado
- [ ] Modelo de margem padrão definido
- [ ] Distinção margem vs markup definida
- [ ] Reuso do motor de precificação auditado
- [ ] Fonte do preço recomendado definida
- [ ] Sem precificação específica de cliente no MVP
- [ ] Decisão derivada vs persistida para tabela de preços definida
- [ ] Rota de comparação definida
- [ ] Rota de tabela de preços definida
- [ ] Simplificação RBAC documentada
- [ ] Abordagem de performance documentada
- [ ] Sem perda de dados
- [ ] Sem alterações de código runtime
- [ ] Sem migrations
- [ ] Docs atualizados
- [ ] Testes preservados
- [ ] CI PASS
