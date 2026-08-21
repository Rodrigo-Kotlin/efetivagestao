# Precificação por Cliente — PRC-06

**Status:** PRC-06A/PRC-06B/PRC-06C/PRC-06D concluídas — modelo, fundação PostgreSQL, workflow, resolvers e UI de precificação por cliente verificados
**Baseline PRC-06B:** `4bb3b217d80f0a18d84372b614da9cd89cc219ce` (`CLIENT_PRICING_SCHEMA_VERIFIED`)
**Checkpoint:** `CLIENT_PRICING_UI_VERIFIED`
**Implementação:** migrations 037–040 instaladas e imutáveis; LOCAL == REMOTE 40/40

## 1. Propósito

PRC-06 define como a Efetiva Gestão representa o papel comercial de cliente, associa uma tabela comercial estável ao cliente e registra preços explícitos negociados por item.

O domínio deve responder, de forma isolada e historicamente reproduzível:

- qual tabela comercial estava atribuída ao cliente na data D;
- se existia um preço específico para o cliente e item na data D;
- qual valor explícito foi aprovado;
- quem criou, revisou, aprovou e publicou a configuração;
- por que o override foi criado;
- qual preço de tabela serviu como referência de negociação, quando houver.

PRC-06 não decide o preço comercial final. Essa composição pertence ao PRC-07.

## 2. Escopo

PRC-06 é dividido em:

| Fase | Entrega | Checkpoint |
|------|---------|------------|
| PRC-06A | Modelo e regras de negócio | `CLIENT_PRICING_MODEL_DEFINED` |
| PRC-06B | Banco, integridade, RLS e RBAC | `CLIENT_PRICING_SCHEMA_VERIFIED` |
| PRC-06C | Workflow e resolvers de componentes | `CLIENT_PRICING_CORE_VERIFIED` |
| PRC-06D | UI de precificação por cliente | `CLIENT_PRICING_UI_VERIFIED` |
| PRC-06E | Hardening end-to-end | `CLIENT_PRICING_VERIFIED` |

Entidades conceituais de v1:

1. `client_profiles`;
2. `client_commercial_table_assignments`;
3. `client_price_overrides`.

Fora de escopo:

- cadastro corporativo duplicado de clientes;
- CRM, contatos, pipeline, oportunidades, endereços e contratos completos;
- faturamento, cobrança, limite de crédito e transações;
- dimensões de segmento, grupo, canal ou tabela padrão organizacional;
- fórmulas de desconto, markup ou margem para override;
- motor financeiro alternativo;
- resolver global/final de preço por cliente.

## 3. Fronteiras PRC-05 / PRC-06 / PRC-07

| Domínio | Responsabilidade |
|---------|------------------|
| PRC-05 | Mantém tabelas comerciais reutilizáveis, suas versões temporais e preços explícitos por item; resolve um item dentro de uma tabela estável em uma data. |
| PRC-06 | Mantém atribuições de tabela a clientes e overrides explícitos por cliente+item; resolve cada fonte isoladamente. |
| PRC-07 | Combina as fontes aplicáveis e determina o preço comercial final. |

PRC-06 não altera `fn_resolve_commercial_table_price` e não implementa `fn_resolve_final_client_price` ou equivalente.

A hierarquia inicial pretendida para PRC-07 é:

```text
client item override
  ↓ se OVERRIDE_NOT_FOUND
client assigned commercial table
  ↓
fn_resolve_commercial_table_price (PRC-05)
```

Qualquer fallback de segmento, grupo, canal ou tabela padrão é assunto do PRC-07 ou de fase posterior. Essas dimensões não fazem parte do schema PRC-06 v1.

## 4. Identidade do cliente

`companies` permanece o cadastro canônico de empresas externas. PRC-06 não cria uma tabela corporativa independente `clients`.

`client_profiles` é uma extensão de papel de `companies`, análoga a `supplier_profiles`:

```text
companies
  ├─ supplier_profiles (papel fornecedor)
  └─ client_profiles   (papel cliente)
```

A mesma empresa pode ser:

- somente fornecedora;
- somente cliente;
- fornecedora e cliente simultaneamente.

Isso não duplica `legal_name`, `trade_name`, `tax_id` nem `tax_id_normalized`. Esses campos continuam exclusivamente em `companies`.

O termo canônico de schema e permissão é **client**, não `customer`, para evitar vocabulário misto.

## 5. Perfil do cliente

Entidade conceitual `client_profiles`:

| Campo | Regra |
|-------|-------|
| `company_id` | Identidade da empresa e chave do papel cliente; referência a `companies.id`. |
| `organization_id` | Tenant obrigatório; deve coincidir com a organização da empresa. |
| `status` | `active`, `inactive` ou `blocked`; criação força `active` no servidor. |
| `commercial_notes` | Observações comerciais opcionais; não substitui contrato nem motivo de override. |
| `created_by`, `created_at` | Ator derivado no servidor e instante de criação. |
| `updated_by`, `updated_at` | Ator derivado no servidor e instante da última alteração editável. |

Não são campos de `client_profiles`:

- razão social, nome fantasia e documento fiscal;
- contatos, endereços e dados de cobrança;
- contratos completos;
- limite de crédito ou status financeiro.

### 5.1 Status do perfil

| Status | Semântica |
|--------|-----------|
| `active` | Pode receber novas atribuições e novos overrides, desde que `companies.status = 'active'`. |
| `inactive` | Não recebe nova configuração comercial; perfil e histórico permanecem legíveis e resolvíveis. |
| `blocked` | Não recebe nova configuração comercial; indica bloqueio operacional mais forte, sem apagar ou invalidar a história. |

Reativação ou alteração de status ocorre por `fn_set_client_profile_status`, com mutação controlada e auditada.

Todo novo `client_profiles` nasce `active`, independentemente de valor enviado pelo cliente. Definir `inactive|blocked` ou reativar exige operação posterior com `pricing.client.edit`, ator server-derived, motivo operacional e auditoria.

### 5.2 Interação com `companies.status`

Nova atribuição ou override exige simultaneamente:

```text
companies.status = active
AND client_profiles.status = active
```

Empresa `inactive` ou `archived` não é elegível para nova configuração. Perfil `inactive` ou `blocked` também não é elegível, ainda que a empresa esteja ativa.

Mudanças posteriores em `companies.status` ou `client_profiles.status`:

- não removem atribuições ou overrides publicados;
- não reescrevem intervalos históricos;
- não fazem cascade-delete de histórico comercial;
- não impedem reconstrução histórica pelos resolvers de componente;
- retornam o status atual do cliente como contexto do resultado.

Autorizar uma nova transação para cliente atualmente `inactive` ou `blocked` é regra de módulos comerciais/transacionais futuros, não da reconstrução histórica PRC-06.

### 5.3 Revalidação de elegibilidade no workflow

Elegibilidade não é verificada apenas na criação do draft. As RPCs revalidam nos gates `submit`, `approve` e `publish`:

- empresa e perfil cliente ativos para atribuição e override;
- tabela comercial ativa para atribuição;
- item de catálogo ativo para override;
- mesma organização em todas as referências.

Se qualquer referência ficar inelegível antes da publicação, a transição é rejeitada e o draft/registro em revisão permanece para correção ou cancelamento. Mudança de status depois da publicação não invalida nem reescreve história.

## 6. Atribuição de tabela comercial

`client_commercial_table_assignments` associa um cliente a uma tabela comercial estável.

O alvo autoritativo é:

```text
commercial_price_tables.id
```

Não é permitido usar `commercial_price_table_versions.id` como alvo operacional da atribuição.

Entidade conceitual:

| Campo | Regra |
|-------|-------|
| `id` | UUID da atribuição. |
| `organization_id` | Tenant obrigatório. |
| `client_company_id` | Empresa com `client_profiles` na mesma organização. |
| `commercial_price_table_id` | Tabela comercial estável da mesma organização. |
| `status` | Lifecycle temporal definido na seção 7. |
| `valid_from`, `valid_to` | Vigência `[valid_from, valid_to)`. |
| `contract_reference` | Referência textual opcional; não cria um domínio de contratos. |
| `notes` | Observação opcional. |
| atores e timestamps | Metadados server-derived de criação, atualização, aprovação, publicação e supersessão. |

### 6.1 Por que a atribuição aponta para a tabela estável

Exemplo:

```text
Cliente A → Tabela Comercial X

X versão 1: [2026-01-01, 2027-01-01)
X versão 2: [2027-01-01, ∞)
```

A atribuição não é regravada na publicação da versão 2. Na consulta por data, PRC-06 resolve a identidade X; PRC-05 seleciona a versão aplicável de X.

Identificadores de versão podem aparecer apenas como evidência de uma resolução ou snapshot, nunca como alvo vivo da atribuição.

### 6.2 Elegibilidade da tabela

Nova atribuição exige `commercial_price_tables.status = 'active'` e mesma `organization_id`.

Se uma tabela anteriormente atribuída ficar `inactive`:

- novas atribuições a ela são bloqueadas;
- a atribuição publicada não é reescrita;
- preços publicados não são apagados;
- resolução histórica permanece possível;
- PRC-07 definirá eventual bloqueio adicional para transações atuais.

## 7. Temporalidade e lifecycle da atribuição

### 7.1 Intervalo e cardinalidade

Uma atribuição aplica-se quando:

```text
valid_from <= reference_date
AND (valid_to IS NULL OR valid_to > reference_date)
```

Regras:

- intervalo canônico `[valid_from, valid_to)`;
- `valid_to` nulo representa vigência aberta;
- `valid_to`, quando informado, deve ser maior que `valid_from`;
- no máximo uma atribuição publicada pode ser efetiva por `organization_id + client_company_id + reference_date` em v1;
- ranges `active|scheduled` do mesmo cliente não podem sobrepor;
- adjacência é válida.

Como um cliente pode legitimamente ainda não possuir tabela atribuída, a cardinalidade formal é **no máximo uma** atribuição aplicável por cliente/data; quando existir atribuição, o resultado é único.

Exemplo válido:

```text
Tabela A: [2026-01-01, 2027-01-01)
Tabela B: [2027-01-01, ∞)
```

### 7.2 Estados e transições

Estados:

```text
draft | under_review | approved | scheduled | active | superseded | cancelled
```

Transições permitidas:

| Origem | Destino | Operação |
|--------|---------|----------|
| `draft` | `under_review` | Submeter para revisão. |
| `under_review` | `draft` | Retornar para correção. |
| `under_review` | `approved` | Aprovar. |
| `approved` | `active` | Publicar com início na data corrente. |
| `approved` | `scheduled` | Publicar com início futuro. |
| `draft`, `under_review`, `approved` | `cancelled` | Cancelar antes da publicação. |
| `scheduled` | `active` | Cutover físico idempotente. |
| `active` | `superseded` | Fechar a predecessora quando uma sucessora entra em vigor. |

`superseded` e `cancelled` são terminais.

### 7.3 Publicação imediata e retroatividade

PRC-06 v1 não permite publicação retroativa. No instante da publicação:

- `valid_from < current_date` é rejeitado;
- `valid_from = current_date` publica como `active`;
- `valid_from > current_date` publica como `scheduled`.

Na publicação imediata, a atribuição `active` anterior recebe `valid_to = new.valid_from` e torna-se `superseded` na mesma operação atômica. Se não houver predecessora, a nova atribuição simplesmente torna-se `active`.

Se já existir sucessora `scheduled`, a nova atribuição imediata deve terminar no início da primeira agenda (`valid_to = scheduled.valid_from`); a publicação deriva/valida esse fechamento e rejeita qualquer sobreposição. Assim, uma correção atual pode ocupar somente o intervalo até a agenda previamente publicada.

Uma atribuição `scheduled` já publicada não pode ser substituída, cancelada ou sobrescrita em v1. Nova publicação que sobreponha qualquer range `active|scheduled` é rejeitada, exceto pelo fechamento controlado da predecessora aplicável. Para construir uma sequência futura A→B→C, a publicação de C pode fechar `B.valid_to` em `C.valid_from`, preservando ranges adjacentes; não pode apagar nem alterar o início/identidade de B.

Essa restrição evita que um registro `scheduled` nunca efetivado seja marcado `superseded` e depois apareça indevidamente em resolução histórica/futura. Uma política de revogação de agenda, se necessária, exigirá decisão futura explícita.

### 7.4 Publicação futura

Para uma nova atribuição B com `valid_from = 2030-01-01`:

1. a atribuição atual A permanece `active`;
2. A recebe `valid_to = 2030-01-01`;
3. B torna-se `scheduled`;
4. em `2030-01-01`, o resolver já seleciona B, mesmo antes do sync;
5. o cutover muda A para `superseded` e B para `active`;
6. executar o cutover novamente não altera o resultado.

A correção do resolver não depende do estado físico estar sincronizado. Registros `active`, `scheduled` e `superseded` efetivamente publicados participam da resolução por data; ranges são adjacentes e não se sobrepõem.

### 7.5 Imutabilidade e gate de workflow

`draft` pode ser editado e, se seguro, excluído. Enquanto o status não for `draft`, identidade, cliente, tabela, `valid_from`, notas contratuais e demais dados de negócio ficam imutáveis, exceto campos controlados de workflow e fechamento temporal. O retorno controlado `under_review → draft` reabre a edição pré-publicação.

Atribuições publicadas não são editadas nem apagadas. Correção exige uma sucessora.

PRC-06B deve instalar proteção estrutural antes das RPCs de PRC-06C:

- INSERT direto de atribuição/override só pode criar `status = 'draft'`;
- qualquer transição direta de status é rejeitada;
- alterações em não-draft são rejeitadas, salvo campos de workflow/fechamento temporal sob gate controlado;
- o gate será dedicado e NULL-safe, por exemplo `app.client_pricing_rpc_active = 'true'` com `COALESCE(..., false)`;
- somente RPCs autoritativas de PRC-06C poderão abrir o gate local da transação.

Assim, PRC-06B pode criar schema/RLS sem deixar `active|scheduled|superseded` fabricáveis antes da entrega do workflow.

## 8. Override de preço por cliente

`client_price_overrides` registra o preço explícito negociado para:

```text
client_company_id + catalog_item_id
```

Entidade conceitual:

| Campo | Regra |
|-------|-------|
| `id` | UUID do override. |
| `organization_id` | Tenant obrigatório. |
| `client_company_id` | Cliente da mesma organização. |
| `catalog_item_id` | Item de catálogo da mesma organização. |
| `price_amount` | `numeric(14,4)`, obrigatório e maior ou igual a zero. |
| `currency` | `BRL` em v1. |
| `reason` | Justificativa comercial obrigatória antes da aprovação/publicação. |
| `status` | Lifecycle temporal definido na seção 9. |
| `valid_from`, `valid_to` | Vigência `[valid_from, valid_to)`. |
| snapshots do item | Código, nome e tipo derivados no servidor. |
| proveniência opcional | Evidência congelada da tabela usada como baseline. |
| atores e timestamps | Metadados server-derived do workflow. |

Exemplo:

```text
Preço da tabela atribuída: R$ 100,00
Preço negociado do cliente: R$ 92,00
Valor persistido: price_amount = 92.0000
```

Não se persiste `table_price * 0.92` como autoridade. Diferença percentual ou monetária pode ser apresentada pela UI, derivada dos snapshots explícitos, mas nunca substitui `price_amount`.

### 8.1 Independência da tabela base

O override identifica cliente, item, valor explícito e vigência. Ele pode existir sem atribuição de tabela e continua aplicável se a tabela atribuída mudar.

Consequência para PRC-07:

- o item específico pode ser resolvido por override sem tabela base;
- outros itens podem permanecer sem preço;
- ausência de tabela não invalida o override publicado.

### 8.2 Sem fórmula e sem recálculo vivo

Override publicado permanece congelado quando mudam:

- atribuição de tabela;
- versão da tabela comercial;
- custo do fornecedor;
- política de preço;
- recomendação do motor PRC-04;
- nome ou descrição atual do catálogo.

PRC-06 não implementa margem, markup, desconto ou piso de custo. Se um controle financeiro obrigatório for especificado futuramente, deverá reutilizar dados autoritativos de PRC-04/PRC-05 e ter decisão explícita. O workflow de aprovação é o controle v1.

## 9. Temporalidade e lifecycle do override

Estados e transições são os mesmos da atribuição:

```text
draft → under_review → approved → active|scheduled → superseded
under_review → draft
```

Para o mesmo `organization_id + client_company_id + catalog_item_id`, apenas um override publicado pode aplicar-se em uma data.

Regras:

- ranges `active|scheduled` não podem sobrepor;
- adjacência é válida;
- publicação futura fecha o predecessor em `new.valid_from` sem supersessão prematura;
- o sucessor fica `scheduled` e já resolve para data futura;
- cutover é idempotente;
- histórico `superseded` continua resolvível;
- publicado é imutável;
- correção exige novo override.

As regras da atribuição para publicação não retroativa, fechamento de predecessora, agenda não substituível em v1 e gate de workflow aplicam-se igualmente ao override.

## 10. Motivo e exceção comercial

`reason` é obrigatório e não vazio desde a criação do `draft` (`btrim(reason) <> ''`). Submissão, aprovação e publicação revalidam a condição. Exemplos:

- negociação contratual;
- condição comercial específica;
- contrato corporativo;
- campanha aprovada;
- acordo excepcional.

O registro `client_price_overrides` é a própria exceção negociada de v1. Não haverá uma tabela redundante `client_price_override_exceptions` sem um lifecycle de negócio separado e comprovado.

Isso não se confunde com `commercial_price_exceptions` de PRC-05, que controla violações de publicação de uma tabela comercial. A aprovação do override usa o workflow do próprio override.

O motivo operacional de bloqueio/inativação do perfil é recebido por `fn_set_client_profile_status` e persistido em `status_reason` e no evento de auditoria. Retorno, cancelamento e decisão usam as assinaturas fechadas do workflow e geram eventos auditáveis; não substituem o `reason` comercial permanente do override.

## 11. Zero versus ausente

```text
override publicado com price_amount = 0
  → RESOLVED, preço explícito zero

nenhum override aplicável
  → OVERRIDE_NOT_FOUND
```

Zero pode representar serviço incluído, item gratuito por contrato, cortesia ou inclusão em pacote. Nunca deve ser convertido em ausência.

`OVERRIDE_NOT_FOUND` nunca deve materializar `price_amount = 0`. Em PRC-07, somente a ausência permite avaliar a tabela atribuída; zero é resultado resolvido e interrompe fallback.

## 12. Elegibilidade do item

Novo override exige item de catálogo ativo e da mesma organização.

Se o item ficar inativo depois da publicação:

- nenhum novo override é criado para ele;
- registros publicados não são alterados;
- consultas históricas continuam resolvendo;
- snapshots preservam a descrição histórica.

## 13. Proveniência e snapshots

### 13.1 Snapshot do item

`client_price_overrides` deve persistir:

- `item_code_snapshot`;
- `item_name_snapshot`;
- `item_type_snapshot`.

Os valores são derivados no servidor a partir de `catalog_items` na criação do override. O frontend não é fonte confiável. Após publicação, os snapshots são imutáveis.

Não se duplicam `legal_name` ou `trade_name` do cliente em cada atribuição/override. Snapshot de nome do cliente em nível transacional é responsabilidade de pedidos, propostas ou faturas futuros.

### 13.2 Baseline opcional da tabela

Quando a negociação parte de uma tabela atribuída, o override pode preservar o grupo de proveniência:

| Campo | Significado |
|-------|-------------|
| `source_reference_date` | Data em que a tabela foi consultada. |
| `source_commercial_price_table_id` | Tabela estável consultada. |
| `source_commercial_price_table_version_id` | Versão resolvida por PRC-05. |
| `source_commercial_price_item_id` | Item comercial resolvido. |
| `source_table_price_amount` | Preço explícito retornado como baseline. |

O grupo é opcional, mas segue regra all-or-none. Quando utilizado, deve ser derivado por RPC confiável e comprovar:

- mesma organização em cliente, atribuição, tabela, versão, item comercial e item de catálogo;
- `source_commercial_price_table_id` igual à tabela resolvida pela atribuição do cliente em `source_reference_date`;
- versão pertencente à tabela e aplicável em `source_reference_date`;
- item comercial pertencente à versão;
- `source_commercial_price_item.catalog_item_id` igual ao `catalog_item_id` do override;
- `source_table_price_amount` exatamente igual ao preço explícito imutável retornado por PRC-05.

PRC-06B bloqueia proveniência não nula em DML direto com gate dedicado NULL-safe. PRC-06C entrega `fn_capture_client_override_table_provenance`, que abre o gate local somente após resolver e validar toda a cadeia de origem; FKs históricas usam comportamento restritivo, nunca cascade-delete.

Essa proveniência é evidência, não dependência de cálculo. Supersessão da versão de origem não invalida nem recalcula o override.

## 14. Integridade cross-tenant

RLS não substitui integridade relacional. PRC-06B impede no banco:

- perfil cliente com `organization_id` diferente da empresa;
- atribuição de cliente da organização A para tabela da organização B;
- override de cliente da organização A para item da organização B;
- proveniência para tabela, versão ou item comercial de outra organização;
- versão de origem que não pertença à tabela de origem;
- item comercial de origem que não pertença à versão de origem.

Cada entidade tenant-scoped carrega `organization_id`. FKs, constraints e/ou triggers same-org garantem coerência, enquanto RLS controla visibilidade e mutação.

Resolvers `SECURITY DEFINER` verificam autenticação, membership e permissão sem revelar existência de dados de outro tenant.

As relações históricas usam FKs `ON DELETE RESTRICT`: `client_profiles → companies`, atribuição/override → `client_profiles`, atribuição → `commercial_price_tables`, override → `catalog_items` e proveniência → tabela/versão/item comercial. Triggers de delete impedem remoção de empresa/perfil quando houver história. Não se copia o `ON DELETE CASCADE` legado de `supplier_profiles`.

## 15. Resolver de atribuição

PRC-06C implementa na migration 040:

```text
fn_resolve_client_table_assignment(
  p_organization_id,
  p_client_company_id,
  p_reference_date DEFAULT current_date
)
```

Pergunta respondida:

> Qual tabela comercial estável estava atribuída ao cliente na data D?

Status de negócio:

```text
RESOLVED
CLIENT_NOT_FOUND
ASSIGNMENT_NOT_FOUND
```

O resolver retorna identidade/status do cliente, atribuição, intervalo e `commercial_price_table_id`. Não consulta item nem devolve preço. A composição com PRC-05 é futura.

`pricing.client.view` autoriza apenas a projeção mínima do componente (IDs e status comerciais). UI que exibir razão social/nome fantasia também exige `core.company.view`. O resolver não amplia acesso ao cadastro corporativo.

Seleção:

```text
status IN (active, scheduled, superseded)
AND valid_from <= reference_date
AND (valid_to IS NULL OR valid_to > reference_date)
ORDER BY valid_from DESC, created_at DESC, id DESC
```

Overlap publicado é proibido; o tie-break final garante determinismo defensivo. `p_reference_date = NULL` explícito deve ser rejeitado; a omissão usa `current_date`.

## 16. Resolver de override

PRC-06C implementa na migration 040:

```text
fn_resolve_client_price_override(
  p_organization_id,
  p_client_company_id,
  p_catalog_item_id,
  p_reference_date DEFAULT current_date
)
```

Pergunta respondida:

> O cliente possui preço explícito negociado para o item X na data D?

Status de negócio:

```text
RESOLVED
CLIENT_NOT_FOUND
ITEM_NOT_FOUND
OVERRIDE_NOT_FOUND
```

`price_amount = 0` retorna `RESOLVED`. Ausência retorna `OVERRIDE_NOT_FOUND` sem fabricar preço. Item inexistente ou não pertencente à organização acessível retorna `ITEM_NOT_FOUND`; item de outro tenant nunca tem sua existência revelada. `OVERRIDE_NOT_FOUND` só é emitido depois que cliente e item válidos foram confirmados.

Seleção:

```text
status IN (active, scheduled, superseded)
AND valid_from <= reference_date
AND (valid_to IS NULL OR valid_to > reference_date)
ORDER BY valid_from DESC, created_at DESC, id DESC
```

O resultado inclui perfil/status do cliente, override, item/snapshots, valor, moeda, vigência, motivo, atores e proveniência opcional. Não consulta fallback de tabela.

Capturar proveniência por baseline de tabela exige `pricing.client.edit`, `pricing.client.view` e `pricing.commercial.view`; a RPC consome o resolver autoritativo PRC-05. Override sem baseline não exige permissão comercial. Exibir nomes corporativos continua exigindo `core.company.view`.

## 17. Resolução dirigida por data

Ambos os resolvers devem suportar datas atuais, futuras e históricas:

- `scheduled` resolve antes do cutover físico quando a data consultada está em sua vigência;
- `superseded` resolve para sua vigência histórica;
- sync de status é manutenção operacional, não pré-requisito de correção;
- chamadas idênticas retornam resultado determinístico;
- status atual `inactive|blocked` do cliente é contexto, não apagamento de histórico.

## 18. RBAC

Permissões PRC-06 implementadas e verificadas:

| Permissão | Responsabilidade |
|-----------|------------------|
| `pricing.client.view` | Ler perfis, atribuições, overrides e executar resolvers de componente. |
| `pricing.client.create` | Criar perfil cliente e criar atribuição/override em `draft`. |
| `pricing.client.edit` | Editar status/notas do perfil; editar ou excluir draft seguro. |
| `pricing.client.review` | Submeter draft, retornar `under_review → draft` e cancelar `under_review`. |
| `pricing.client.approve` | Aprovar atribuições e overrides. |
| `pricing.client.publish` | Publicar e operar cutover; exclusivo do admin. |

Não se cria `pricing.client.override_approve` em v1. O override é o próprio registro excepcional e `pricing.client.approve` é o gate de aprovação de ambos os workflows. Uma permissão separada só será criada se surgir segregação de deveres diferente e explicitamente aprovada.

| Papel | view | create | edit | review | approve | publish |
|-------|------|--------|------|--------|---------|---------|
| admin | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| manager | ✔ | ✔ | ✔ | ✔ | ✔ | — |
| operator | ✔ | — | — | — | — | — |
| viewer | ✔ | — | — | — | — | — |

Checks de frontend são UX. RLS e RPCs revalidam membership e permissão no servidor.

Mapa normativo de transições:

| Operação | Permissão |
|----------|-----------|
| Criar perfil ou draft | `pricing.client.create` |
| Alterar perfil/status, editar/excluir draft, `draft → cancelled` | `pricing.client.edit` |
| `draft → under_review`, `under_review → draft|cancelled` | `pricing.client.review` |
| `under_review → approved`, `approved → cancelled` | `pricing.client.approve` |
| `approved → active|scheduled`, cutover e supersessão controlada | `pricing.client.publish` |

Toda transição ocorre por RPC; permissões nunca autorizam UPDATE direto de status.

## 19. Atores e auditoria

Campos de ator e timestamps são sempre derivados no servidor. O cliente nunca envia UUID ou instante autoritativo. `created_at`, `updated_at` e timestamps de workflow são imutáveis fora da operação controlada correspondente; isso também protege o tie-break determinístico dos resolvers.

Metadados conceituais:

- `created_by`, `created_at`;
- `updated_by`, `updated_at` em estado editável;
- `submitted_by`, `submitted_at`;
- `approved_by`, `approved_at`;
- `published_by`, `published_at`;
- `superseded_by`, `superseded_at`;
- atores/timestamps de cancelamento quando aplicável.

Eventos auditáveis incluem criação, alteração de draft/perfil, mudança de status do cliente, submissão, retorno, aprovação, cancelamento, publicação, supersessão e cutover. Audit logs são append-only e registram organização, ator, entidade, valores anteriores/novos, motivo operacional/decision notes e instante. O `reason` do override permanece no próprio registro como justificativa comercial.

Leituras puras dos resolvers não exigem audit log de mutação.

## 20. Exclusão e inativação

| Registro | Política |
|----------|----------|
| `client_profiles` sem história | Exclusão física só poderá ser permitida se não houver atribuição/override e for comprovadamente segura; FK com `companies` não usa cascade. |
| `client_profiles` com história | Nunca hard-delete; usar `inactive` ou `blocked`. |
| Atribuição/override `draft` | Pode ser excluído se não houver referência impeditiva. |
| Atribuição/override não-draft | Não hard-delete; cancelar antes da publicação ou superseder após publicação. |
| Proveniência histórica | FKs restritivas; nunca apagar por cascade. |

Inativar/arquivar empresa, bloquear cliente, inativar tabela ou item não destrói histórico.

PRC-06 não cria snapshots de proposta, pedido ou fatura. Módulos transacionais futuros deverão persistir o preço realmente aplicado, cliente, origem (`override` ou tabela), atribuição/override, versão comercial e demais evidências necessárias no instante da transação.

## 21. Exemplos de negócio

### Exemplo A — Cliente normal

Empresa A está atribuída à Tabela Padrão e não possui override para o item. PRC-06 retorna `OVERRIDE_NOT_FOUND` e a atribuição `RESOLVED`. PRC-07 futuramente poderá usar o preço da tabela.

### Exemplo B — Override do cliente

Preço da tabela: R$ 100,00. Override publicado: R$ 92,00. O resolver de override retorna `RESOLVED` com R$ 92,00. A precedência final será aplicada em PRC-07.

### Exemplo C — Override zero

Override publicado: R$ 0,00. Resultado: `RESOLVED` com zero explícito. Não há fallback para a tabela.

### Exemplo D — Override ausente

Não há override aplicável. Resultado: `OVERRIDE_NOT_FOUND`, permitindo ao PRC-07 avaliar a atribuição.

### Exemplo E — Troca futura de tabela

Tabela A é atual; Tabela B é publicada para iniciar na data D. Antes de D, resolve A. Em D e depois, resolve B, ainda que o sync físico não tenha ocorrido.

### Exemplo F — Histórico

A atribuição ou o override mudou posteriormente. Consulta com data passada retorna o registro `superseded` aplicável e seu valor/snapshot histórico, sem usar dados atuais.

### Exemplo G — Override sem tabela

Cliente possui preço negociado para um item, mas nenhuma tabela atribuída. O override resolve normalmente; demais itens podem permanecer sem fonte aplicável.

## 22. Invariantes de aceitação

1. `companies` é a identidade externa canônica; `client_profiles` é papel, não duplicação.
2. Uma empresa pode ser cliente e fornecedora simultaneamente.
3. Nova configuração exige empresa e perfil cliente ativos.
4. História permanece legível para cliente inativo, bloqueado ou empresa arquivada.
5. Atribuição referencia `commercial_price_tables.id`, nunca uma versão como alvo vivo.
6. Há no máximo uma atribuição publicada efetiva por cliente/data.
7. Há no máximo um override publicado efetivo por cliente+item/data.
8. Todos os intervals usam `[valid_from, valid_to)` e aceitam adjacência.
9. Resolução futura não depende de cutover físico.
10. Publicado é imutável; correção cria sucessor.
11. Override é `price_amount numeric(14,4)` explícito, BRL e não negativo.
12. Override não é fórmula e não é recalculado por mudanças de custo/política/tabela.
13. Override pode existir sem atribuição de tabela.
14. `price_amount = 0` é valor resolvido; ausência é `OVERRIDE_NOT_FOUND`.
15. Motivo é obrigatório para aprovação/publicação do override.
16. O override é a própria exceção negociada; não há tabela redundante de exceção.
17. Snapshots do item e atores são derivados no servidor.
18. Proveniência da tabela é opcional, coerente, congelada e nunca usada para recálculo.
19. Integridade same-org é aplicada no banco além de RLS.
20. Resolvers de PRC-06 são componentes isolados e não implementam precedência global.
21. Segmento, grupo, canal e default não pertencem a PRC-06.
22. Nenhum histórico publicado é destruído por hard-delete ou cascade.
23. Publicação retroativa é rejeitada em v1; agenda publicada não é substituída silenciosamente.
24. Status não-draft e proveniência confiável só podem ser produzidos sob gate RPC NULL-safe.
25. Elegibilidade de cliente, tabela e item é revalidada na submissão, aprovação e publicação.
26. `ITEM_NOT_FOUND` é distinto de `OVERRIDE_NOT_FOUND`.

## 23. Orientação para PRC-06B

PRC-06B deverá transformar este modelo em schema e segurança, sem mudar as decisões de negócio:

- criar apenas as três entidades conceituais aprovadas, salvo invariante comprovado;
- usar UUID, `organization_id`, `numeric(14,4)`, BRL e `date`;
- forçar `client_profiles.status = 'active'` na criação e exigir `pricing.client.edit` para mudança posterior;
- implementar constraints de status, valor e validade;
- usar exclusão temporal GiST com predicado exato `status IN ('active','scheduled')`, ranges `[)` e constraints que mantenham ranges históricos adjacentes;
- implementar triggers same-org para empresa, tabela, item e proveniência;
- usar FKs `ON DELETE RESTRICT` e guards contra exclusão de empresa/perfil com histórico;
- derivar snapshots, atores e timestamps no servidor;
- instalar gate dedicado NULL-safe que force INSERT como draft, bloqueie status direto e impeça proveniência fabricada antes de PRC-06C;
- permitir DML de proveniência somente com todos os `source_*` nulos até a RPC confiável;
- revalidar elegibilidade do cliente/perfil, tabela e item em submit/approve/publish, sem invalidar publicação histórica após mudança de status;
- impedir mutação/hard-delete de histórico;
- criar as seis permissões `pricing.client.*` e mapeamentos definidos;
- habilitar RLS por organização e permissão;
- registrar auditoria append-only;
- não criar resolvers/workflow completos antes de PRC-06C;
- não criar resolver global antes de PRC-07;
- preservar migrations 001–036 e entregar mudanças somente em migration forward-only futura.

## 24. Implementação PRC-06B

**Checkpoint:** `CLIENT_PRICING_SCHEMA_VERIFIED`
**Migrations:** `037_client_pricing_schema.sql` e `038_client_pricing_security.sql`
**Remoto:** 38/38 LOCAL == REMOTE

### 24.1 Schema e integridade (037)

Foram criadas somente as três entidades aprovadas:

- `client_profiles` — extensão de papel de `companies`, status inicial forçado `active`, `status_reason`, atores/timestamps server-derived e delete bloqueado quando há histórico;
- `client_commercial_table_assignments` — atribuição à identidade estável `commercial_price_tables.id`, lifecycle completo, vigência `[)`, exclusão GiST para `active|scheduled`, imutabilidade não-draft e hard-delete somente draft;
- `client_price_overrides` — preço explícito `numeric(14,4)`, BRL, zero válido, motivo obrigatório, snapshots de catálogo server-derived, vigência/exclusão temporal e proveniência opcional all-or-none.

Integridade cross-tenant é contínua, não apenas validada no INSERT: FKs compostas vinculam IDs e `organization_id` em empresa/perfil, tabela, catálogo, versão/item de origem e valor fonte. Todas as referências históricas usam `ON DELETE RESTRICT`.

O gate dedicado é:

```text
COALESCE(
  current_setting('app.client_pricing_rpc_active', true) = 'true',
  false
)
```

Sem gate, status não-draft e proveniência não nula são bloqueados. Mesmo com gate, o banco valida o grafo de transições, elegibilidade, proveniência e fechamento monotônico de `valid_to`; não há gate-setter público. RLS foi habilitado fail-closed em 037.

### 24.2 Segurança (038)

Foram criadas exatamente seis permissões `pricing.client.*` e mapeadas como definido: admin 6, manager 5 (sem publish), operator 1 e viewer 1. Não existe `pricing.client.override_approve`.

As três tabelas possuem policies RLS de SELECT/INSERT/UPDATE/DELETE com membership e permissão exata. Auditoria usa o contrato atual de seis argumentos de `log_audit`, que deriva o ator de `auth.uid()`. Uma policy restritiva exige `pricing.client.view` para ler payloads de auditoria das entidades PRC-06.

### 24.3 Verificação remota

Fixture dedicada: `tests/remote/sql/client_pricing_test_setup.sql`
Suite: `tests/remote/client-pricing-integrity-test.mjs`

| Grupo | Casos | Assertions |
|-------|-------|------------|
| Perfil e papel empresa | 10/10 | 20/20 |
| Atribuições e gate | 13/13 | 29/29 |
| Overrides e snapshots | 16/16 | 27/27 |
| Proveniência confiável | 8/8 | 20/20 |
| Lifecycle, delete e audit | 6/6 | 15/15 |
| RLS e RBAC | 7/7 | 28/28 |
| **Total** | **60/60** | **139/139** |

Regressões remotas: commercial full-flow 27/27, workflow 85/85, integrity 61/61, pricing engine 50/50, policy 33/33, cost 34/34 e PRC-04 full-flow 49/49.

No checkpoint PRC-06B, workflow e resolvers de componente foram diferidos para PRC-06C. Resolver final, UI e dimensões de segmento/grupo/canal/default permaneceram fora do escopo e continuam reservados para PRC-06D/PRC-07.

## 25. Implementação PRC-06C

**Checkpoint:** `CLIENT_PRICING_CORE_VERIFIED`
**Migrations:** `039_client_pricing_workflow.sql` e `040_client_pricing_resolvers.sql`
**Remoto:** 40/40 LOCAL == REMOTE

### 25.1 Workflow autoritativo (039)

A migration 039 entrega 14 RPCs públicas autenticadas com `SECURITY DEFINER`, `search_path = public`, ator derivado de `auth.uid()`, membership e permissão pontual:

- status de perfil: `fn_set_client_profile_status`;
- atribuições: submit, return-to-draft, approve, cancel, publish e sync;
- overrides: submit, return-to-draft, approve, cancel, publish e sync;
- proveniência: `fn_capture_client_override_table_provenance`.

Publicação serializa a timeline por perfil cliente, rejeita retroatividade e due backlog, fecha predecessoras monotonicamente e preserva sucessoras agendadas. Sync rejeita datas futuras, processa somente organizações autorizadas por `pricing.client.publish` e é idempotente. Captura de proveniência exige `pricing.client.edit`, `pricing.client.view` e `pricing.commercial.view`, resolve atribuição e preço de tabela pelas RPCs autoritativas e nunca altera `price_amount`.

### 25.2 Resolvers de componente (040)

- `fn_resolve_client_table_assignment` retorna `RESOLVED`, `CLIENT_NOT_FOUND` ou `ASSIGNMENT_NOT_FOUND`;
- `fn_resolve_client_price_override` retorna `RESOLVED`, `CLIENT_NOT_FOUND`, `ITEM_NOT_FOUND` ou `OVERRIDE_NOT_FOUND`;
- ambos resolvem `active|scheduled|superseded` por `[valid_from, valid_to)`, com desempate determinístico e sem depender do cutover físico;
- o resolver de override preserva zero explícito e devolve proveniência congelada quando presente;
- nenhum deles compõe fontes, aplica fallback ou implementa a precedência global de PRC-07.

### 25.3 Verificação remota

Fixture dedicada: `tests/remote/sql/client_pricing_test_setup.sql`
Suite: `tests/remote/client-pricing-workflow-test.mjs`

| Grupo | Casos | Assertions |
|-------|-------|------------|
| Status do perfil | 6/6 | 15/15 |
| Workflow de atribuição | 14/14 | 38/38 |
| Workflow de override | 14/14 | 38/38 |
| Resolvers | 12/12 | 32/32 |
| Sync | 6/6 | 18/18 |
| Proveniência | 8/8 | 27/27 |
| RBAC e exposição | 8/8 | 34/34 |
| **Total** | **68/68** | **202/202** |

A regressão PRC-06B permaneceu em 60/60 casos e 139/139 assertions. Também passaram commercial full-flow 27/27, workflow 85/85, integrity 61/61, pricing engine 50/50, policy 33/33, PRC-04 full-flow 49/49 e cost 34/34.

PRC-06C não criou frontend, fórmulas, dimensões de segmento/grupo/canal/default nem resolver final. Esses limites permanecem para PRC-06D/PRC-07.

## 26. Implementação PRC-06D

**Checkpoint:** `CLIENT_PRICING_UI_VERIFIED`
**Frontend:** React + TypeScript + Supabase client, 8 pages, 12 components, API layer, hooks, types, utils

### 26.1 Arquitetura

PRC-06D entrega a UI completa de precificação por cliente seguindo os padrões estabelecidos no módulo comercial:

- **Tipos:** `src/features/pricing/clients/types/client.types.ts` — enums, DTOs, interfaces de row, composite shapes, permission sets
- **Utils:** `src/features/pricing/clients/utils/format.ts` — formatadores pt-BR, parsers de moeda, helpers de data e status
- **API:** `src/features/pricing/clients/api/clientPrices.ts` — 30+ funções, todas usando RPCs canônicas de PRC-06B/06C, sem UPDATE direto
- **Hooks:** `src/features/pricing/clients/hooks/useClients.ts` — useState+useCallback+useEffect, sem Redux/Zustand/React Query
- **Componentes:** 12 componentes presentacionais e de comportamento
- **Páginas:** 8 páginas com RBAC integrado

### 26.2 Rotas

| Rota | Página |
|------|--------|
| `/pricing/clients` | Lista de clientes |
| `/pricing/clients/new` | Novo perfil cliente |
| `/pricing/clients/:id` | Detalhe do cliente |
| `/pricing/clients/:id/assignments/new` | Nova atribuição |
| `/pricing/clients/assignments/:id` | Detalhe da atribuição |
| `/pricing/clients/:id/overrides/new` | Novo override |
| `/pricing/clients/overrides/:id` | Detalhe do override |
| `/pricing/clients/lookup` | Lookup de resolução |

### 26.3 Conformidade

- Nenhuma chamada a `fn_resolve_final_client_price` ou equivalente (PRC-07 boundary)
- Zero explícito (`price_amount = 0`) exibido como `R$ 0,00`, nunca como "Sem preço"
- `OVERRIDE_NOT_FOUND` exibe mensagem de ausência, nunca `R$ 0,00`
- `ASSIGNMENT_NOT_FOUND` exibe "Nenhuma tabela atribuída"
- Todos os workflow mutations refetch state canônico, sem optimistic updates
- Tratamento de erro com mensagens pt-BR mapeadas por código de erro
- RBAC: 6 permissões `pricing.client.*` verificadas em todas as páginas
- Responsivo e acessível com status de loading/empty/error

### 26.4 Verificação

| Grupo | Casos | Assertions |
|-------|-------|------------|
| API contracts (CUI-CAPI) | 19 | 19 |
| RBAC (CUI-CRBAC) | 10 | 10 |
| Workflow (CUI-CWF) | 8 | 8 |
| Resolver UI (CUI-CRES) | 11 | 11 |
| Format utils (CUI-FMT) | 20 | 20 |
| No PRC-07 regression | 4 | 4 |
| Zero/missing semantics | 5 | 5 |
| **Total PRC-06D** | **80/80** | **80/80** |
| Regressão PRC-06C | 68/68 | 202/202 |
| Regressão PRC-06B | 60/60 | 139/139 |
| **Suite completa** | **300/300** | **300/300** |

Typecheck: PASS. Lint: apenas warnings pre-existentes no módulo comercial. Build: PASS com PWA artifacts.

## 27. Decisões relacionadas

- DEC-008 — intervalos `[valid_from, valid_to)`;
- DEC-022 — identidade de ator derivada no servidor;
- DEC-045/049 — preço publicado explícito e imutabilidade;
- DEC-047 — zero diferente de preço ausente;
- DEC-050/052 — fronteira PRC-06/PRC-07 e resolver table-specific;
- DEC-054..DEC-060 — decisões específicas deste modelo.
