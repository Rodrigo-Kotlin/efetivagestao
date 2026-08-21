# Final Price Resolution — PRC-07A

**Status:** modelo e regras de negócio definidos
**Checkpoint:** `FINAL_PRICE_RESOLUTION_MODEL_DEFINED`
**Fase:** PRC-07A — contrato apenas; sem SQL, RPC, UI ou migration

## 1. Propósito

PRC-07 responde de forma autoritativa:

> Para o cliente C, item de catálogo I e data de referência D, qual é o preço comercial final e qual fonte o produziu?

O domínio compõe preços comerciais explícitos já verificados. Ele não calcula, recomenda, publica nem altera preços.

## 2. Fronteiras dos domínios

| Domínio | Responsabilidade |
|---------|------------------|
| PRC-04 | Calcula/simula preço recomendado a partir de custo e política. |
| PRC-05 | Publica preços explícitos em versões temporais de tabelas comerciais. |
| PRC-06 | Publica override explícito por cliente/item e atribui tabela estável ao cliente. |
| PRC-07 | Seleciona a autoridade comercial final entre os componentes PRC-05/06. |

`CALCULATED PRICE != PUBLISHED COMMERCIAL PRICE`. O campo `final_price` usado no contexto de simulação PRC-04 não representa o resultado comercial final PRC-07.

## 3. Plano de fases

| Fase | Escopo | Checkpoint |
|------|--------|------------|
| PRC-07A | Final Price Resolution Model & Business Rules | `FINAL_PRICE_RESOLUTION_MODEL_DEFINED` |
| PRC-07B | Final Price Resolver Backend & Security | `FINAL_PRICE_RESOLVER_VERIFIED` |
| PRC-07C | Final Price Resolution UI | `FINAL_PRICE_RESOLUTION_UI_VERIFIED` |
| PRC-07D | End-to-End Hardening & Final Verification | `FINAL_PRICE_RESOLUTION_VERIFIED` |

## 4. Fontes autoritativas

O resolver final deve reutilizar, sem reimplementar SQL temporal:

1. `fn_resolve_client_price_override` — PRC-06;
2. `fn_resolve_client_table_assignment` — PRC-06;
3. `fn_resolve_commercial_table_price` — PRC-05.

A mesma `p_reference_date` deve ser transmitida sem alteração aos componentes avaliados. Não haverá resolver temporal alternativo, consulta paralela às tabelas-base ou cópia das regras PRC-05/06.

## 5. Precedência v1

Precedência formal:

```text
CLIENT_OVERRIDE > ASSIGNED_COMMERCIAL_TABLE
```

Algoritmo normativo:

1. Resolver override de cliente/item.
2. Se retornar `RESOLVED`, o override é o preço final. Encerrar imediatamente.
3. Somente se retornar `OVERRIDE_NOT_FOUND`, resolver a atribuição de tabela do cliente.
4. Se a atribuição retornar `RESOLVED`, resolver o item dentro da identidade estável da tabela via PRC-05.
5. Se o preço da tabela retornar `RESOLVED`, esse é o preço final.
6. Qualquer ausência documentada é mapeada conforme a seção 8; erros interrompem a resolução.

Nada abaixo da tabela atribuída existe em v1. Não há tabela padrão, grupo, segmento ou canal.

## 6. Short-circuit do override

Override aplicável é independente de atribuição. Ele não exige tabela atribuída nem preço dentro de tabela.

```text
override = RESOLVED (32.0000)
assignment = não avaliada
table price = não avaliado

final = RESOLVED / CLIENT_OVERRIDE / 32.0000
```

Quando o override vence:

- não chamar `fn_resolve_client_table_assignment`;
- não chamar `fn_resolve_commercial_table_price`;
- não consultar atribuição apenas para enriquecer trace ou proveniência;
- proveniência opcional de tabela no override não muda sua autoridade.

## 7. Zero, ausência e fallback

Zero explícito é preço final autoritativo:

```text
override.status = RESOLVED
override.price_amount = 0

status = RESOLVED
source = CLIENT_OVERRIDE
price_amount = 0
```

Não usar truthiness, `COALESCE(..., 0)` ou fallback para substituir zero. Somente o status exato `OVERRIDE_NOT_FOUND` autoriza progressão para atribuição.

São terminais, sem fallback:

- `CLIENT_NOT_FOUND`;
- `ITEM_NOT_FOUND`;
- erro de autenticação, membership ou permissão;
- erro de banco ou integridade;
- qualquer status inesperado do componente.

## 8. Contrato público de status e reason_code

O vocabulário público de `status` é pequeno e estável:

| status | Significado |
|--------|-------------|
| `RESOLVED` | Um preço comercial explícito foi selecionado. |
| `CLIENT_NOT_FOUND` | Cliente canônico não existe no tenant acessível. Terminal. |
| `ITEM_NOT_FOUND` | Item não existe no tenant acessível. Terminal. |
| `PRICE_NOT_FOUND` | Cliente/item existem, mas nenhuma fonte comercial v1 produziu preço. |

Para `RESOLVED`, `reason_code = null`. Para `CLIENT_NOT_FOUND` e `ITEM_NOT_FOUND`, o próprio status já é a razão e `reason_code = null`. Para `PRICE_NOT_FOUND`, `reason_code` deve ser um dos seguintes:

| reason_code | Origem |
|-------------|--------|
| `ASSIGNMENT_NOT_FOUND` | Override ausente e cliente sem tabela aplicável. |
| `TABLE_NOT_FOUND` | Atribuição resolveu, mas a identidade de tabela não foi encontrada pelo PRC-05. |
| `VERSION_NOT_FOUND` | Tabela existe, mas nenhuma versão publicada é aplicável na data. |
| `TABLE_PRICE_NOT_FOUND` | Versão aplicável existe, mas o item não possui preço nessa versão. |

Mapeamento do status PRC-05 `PRICE_NOT_FOUND` para o reason público `TABLE_PRICE_NOT_FOUND` evita ambiguidade com o status final `PRICE_NOT_FOUND`.

Embora FKs tornem `TABLE_NOT_FOUND` improvável após uma atribuição válida, ele é um status de negócio documentado pelo resolver PRC-05 e deve ser mapeado como acima caso seja retornado normalmente. Uma exceção de banco, FK violada ou resposta contraditória fora dos status documentados continua sendo erro de integridade, não `PRICE_NOT_FOUND`.

Não usar reason livre como contrato de máquina. Texto humano pode ser derivado na apresentação.

## 9. Erro versus resultado de negócio

Resultados de negócio são retornos JSON:

- `RESOLVED`;
- `CLIENT_NOT_FOUND`;
- `ITEM_NOT_FOUND`;
- `PRICE_NOT_FOUND`.

Falhas de segurança ou infraestrutura são erros e não resultados de ausência:

- não autenticado;
- não membro da organização;
- permissões insuficientes;
- acesso cross-tenant;
- violação inesperada do contrato BRL;
- inconsistência entre respostas dos componentes;
- erro inesperado do banco.

Um erro lançado por qualquer componente interrompe a cadeia. Nunca converter erro em `PRICE_NOT_FOUND` e nunca continuar precedência após erro.

## 10. Source enum

Para `RESOLVED`, `source` deve ser exatamente:

- `CLIENT_OVERRIDE`;
- `ASSIGNED_COMMERCIAL_TABLE`.

Para qualquer resultado não resolvido, `source = null`.

Rótulos como `MANUAL`, `ENGINE` e `DEFAULT` não são fontes finais. Eles descrevem origem/proveniência de outros domínios.

## 11. Assinatura conceitual

PRC-07B deverá implementar, sem fazê-lo nesta fase:

```sql
fn_resolve_final_client_price(
  p_organization_id uuid,
  p_client_company_id uuid,
  p_catalog_item_id uuid,
  p_reference_date date DEFAULT current_date
)
RETURNS jsonb
```

`p_reference_date` é um `DATE` de calendário. Ausência usa `current_date`; `NULL` explícito deve ser rejeitado.

Toda a composição deve ocorrer dentro de uma única invocação PostgreSQL e do mesmo snapshot transacional. Os três componentes não podem ser chamados pelo frontend em requests separados, pois uma publicação concorrente poderia misturar preço, trace e source refs de estados diferentes.

PRC-07B deve declarar o resolver final read-only como `STABLE` e executar a composição em uma única statement, preservando o snapshot estabelecido no início da chamada. Nenhuma DML ou sync ocorre durante a resolução.

## 12. Contrato JSON mínimo

Payload resolvido:

```json
{
  "status": "RESOLVED",
  "source": "CLIENT_OVERRIDE",
  "reason_code": null,
  "reference_date": "2030-01-15",
  "organization_id": "uuid",
  "client_company_id": "uuid",
  "catalog_item_id": "uuid",
  "price_amount": 32.0000,
  "currency": "BRL",
  "client_profile_status": "active",
  "source_refs": {
    "override_id": "uuid"
  },
  "trace": {
    "override_status": "RESOLVED",
    "assignment_status": null,
    "table_price_status": null
  }
}
```

Payload não resolvido:

```json
{
  "status": "PRICE_NOT_FOUND",
  "source": null,
  "reason_code": "ASSIGNMENT_NOT_FOUND",
  "reference_date": "2030-01-15",
  "organization_id": "uuid",
  "client_company_id": "uuid",
  "catalog_item_id": "uuid",
  "price_amount": null,
  "currency": null,
  "client_profile_status": "active",
  "source_refs": null,
  "trace": {
    "override_status": "OVERRIDE_NOT_FOUND",
    "assignment_status": "ASSIGNMENT_NOT_FOUND",
    "table_price_status": null
  }
}
```

Regras de forma:

- todas as chaves do contrato mínimo permanecem presentes; ausência é representada por `null`, não por omissão variável;
- `price_amount` é PostgreSQL `numeric`, sem cálculo em ponto flutuante;
- `currency = "BRL"` somente quando resolvido;
- `source_refs` contém apenas IDs relevantes;
- não incluir `resolved_at`, `now()` ou campo volátil;
- não incluir PII corporativa ou notas comerciais.

Formas terminais:

| status | client_profile_status | price/currency/source_refs | trace |
|--------|-----------------------|----------------------------|-------|
| `CLIENT_NOT_FOUND` | `null` | todos `null` | override=`CLIENT_NOT_FOUND`; demais `null` |
| `ITEM_NOT_FOUND` | status do cliente válido | todos `null` | override=`ITEM_NOT_FOUND`; demais `null` |
| `PRICE_NOT_FOUND` | status do cliente válido | todos `null` | statuses efetivamente avaliados conforme reason_code |

## 13. Source refs

### 13.1 CLIENT_OVERRIDE

Campos relevantes:

```json
{
  "override_id": "uuid",
  "source_commercial_price_table_id": "uuid opcional",
  "source_commercial_price_table_version_id": "uuid opcional",
  "source_commercial_price_item_id": "uuid opcional"
}
```

Os três campos de proveniência são um grupo all-or-none: o grupo inteiro é omitido quando não capturado, ou os três IDs aparecem juntos quando presente. Eles são evidência congelada e não tornam a tabela autoridade do preço; `source` continua `CLIENT_OVERRIDE`.

### 13.2 ASSIGNED_COMMERCIAL_TABLE

Campos obrigatórios:

```json
{
  "assignment_id": "uuid",
  "commercial_price_table_id": "uuid",
  "commercial_price_table_version_id": "uuid",
  "commercial_price_item_id": "uuid"
}
```

Não duplicar conteúdo completo da tabela, item, override ou empresa.

Para todo resultado não resolvido, `source_refs = null`. Mesmo quando a atribuição ou tabela foi encontrada antes de `VERSION_NOT_FOUND` ou `TABLE_PRICE_NOT_FOUND`, não retornar referências parciais como se uma fonte final tivesse sido selecionada; o trace registra até onde a cadeia avançou.

## 14. Trace de resolução

O trace registra apenas os componentes realmente avaliados.

Override vence:

```json
{
  "override_status": "RESOLVED",
  "assignment_status": null,
  "table_price_status": null
}
```

Fallback completo:

```json
{
  "override_status": "OVERRIDE_NOT_FOUND",
  "assignment_status": "RESOLVED",
  "table_price_status": "RESOLVED"
}
```

Sem atribuição:

```json
{
  "override_status": "OVERRIDE_NOT_FOUND",
  "assignment_status": "ASSIGNMENT_NOT_FOUND",
  "table_price_status": null
}
```

Trace não autoriza chamadas extras e não contém payloads completos dos componentes.

## 15. Tabela de decisão

| Override | Assignment | Table price | Resultado final |
|----------|------------|-------------|-----------------|
| `RESOLVED` | não avaliar | não avaliar | `RESOLVED / CLIENT_OVERRIDE` |
| `CLIENT_NOT_FOUND` | não avaliar | não avaliar | `CLIENT_NOT_FOUND` |
| `ITEM_NOT_FOUND` | não avaliar | não avaliar | `ITEM_NOT_FOUND` |
| `OVERRIDE_NOT_FOUND` | `ASSIGNMENT_NOT_FOUND` | não avaliar | `PRICE_NOT_FOUND / ASSIGNMENT_NOT_FOUND` |
| `OVERRIDE_NOT_FOUND` | `CLIENT_NOT_FOUND` | não avaliar | erro de integridade entre componentes |
| `OVERRIDE_NOT_FOUND` | `RESOLVED` | `RESOLVED` | `RESOLVED / ASSIGNED_COMMERCIAL_TABLE` |
| `OVERRIDE_NOT_FOUND` | `RESOLVED` | `TABLE_NOT_FOUND` | `PRICE_NOT_FOUND / TABLE_NOT_FOUND` |
| `OVERRIDE_NOT_FOUND` | `RESOLVED` | `VERSION_NOT_FOUND` | `PRICE_NOT_FOUND / VERSION_NOT_FOUND` |
| `OVERRIDE_NOT_FOUND` | `RESOLVED` | `PRICE_NOT_FOUND` | `PRICE_NOT_FOUND / TABLE_PRICE_NOT_FOUND` |
| erro | não avaliar | não avaliar | propagar erro |

## 16. Semântica temporal

PRC-07 herda integralmente PRC-05/06:

- intervalos `[valid_from, valid_to)`;
- início inclusivo e fim exclusivo;
- `valid_to IS NULL` representa vigência aberta;
- componentes elegíveis são `active|scheduled|superseded` quando seu intervalo contém a data;
- resolução não associa rigidamente current/future/historical a um status físico específico;
- um `scheduled` já devido pode resolver na data atual antes do sync físico;
- registros `scheduled` podem resolver datas futuras e `superseded` pode reconstruir datas históricas;
- o resultado não depende de cutover já executado;
- o mesmo estado e mesmos inputs produzem o mesmo resultado semântico.

PRC-07 não presume que os workflows de publicação PRC-05 e PRC-06 tenham as mesmas regras; apenas consome suas timelines publicadas e verificadas.

## 17. Status atuais e reconstrução histórica

O resolver final não é um autorizador transacional.

- cliente atualmente `inactive` ou `blocked` pode ter preço historicamente reproduzível;
- `client_profile_status` é contexto no retorno, não autorização de pedido/serviço;
- mudança posterior de status não invalida preço publicado no passado;
- tabela comercial inativada permanece historicamente resolvível conforme PRC-05;
- item inativado posteriormente não apaga snapshots publicados de override/tabela.

Autorização para nova transação pertence a domínio transacional futuro.

## 18. Moeda e autoridade numérica

PRC-07 v1 opera somente em BRL e não converte moeda. Resultado resolvido deve ter `currency = "BRL"`.

Se um componente autoritativo violar o contrato BRL, tratar como erro de integridade. Não converter, arredondar ou sintetizar preço. PostgreSQL `numeric(14,4)` permanece a autoridade; frontend futuro apenas formata.

## 19. Segurança e disclosure mínimo

Antes de consultar existência de cliente, item ou fonte, PRC-07B deve exigir:

```text
authenticated
AND member_of(p_organization_id)
AND pricing.client.view
AND pricing.commercial.view
```

As duas permissões são cumulativas e verificadas na mesma organização. `pricing.calculate` não se aplica porque não há cálculo/simulação. Não criar nova permissão em PRC-07A.

A RPC futura deve seguir o padrão existente: `SECURITY DEFINER`, `SET search_path = public`, `REVOKE EXECUTE FROM PUBLIC, anon` e `GRANT EXECUTE TO authenticated`. Esses grants permitem chamar a função, mas membership e as duas permissões continuam obrigatoriamente validadas dentro de cada chamada.

Consequências:

- custom role precisa possuir ambas as permissões;
- roles padrão já possuem as capacidades de visualização conforme RBAC atual;
- `core.company.view` só é necessário para enriquecimento com nomes corporativos, que não faz parte do payload mínimo;
- pedido para tenant estrangeiro é erro de autorização antes de revelar existência;
- não retornar `CLIENT_NOT_FOUND` quando isso puder revelar objeto de tenant estrangeiro.

Mesmo autorizado, o resolver não retorna automaticamente:

- `legal_name`, `trade_name` ou `tax_id`;
- motivo completo do override;
- notas comerciais;
- conteúdo completo de tabela/versão/item;
- payload integral dos resolvers internos.

## 20. Ausências deliberadas em v1

Não implementar nem criar placeholders para:

- pricing engine fallback;
- custo, margem, markup, desconto ou política;
- tabela padrão de organização;
- tabela por grupo, segmento ou canal;
- conversão de moeda;
- autorização de transações;
- persistência de cotação/pedido/fatura;
- recomputação de transações históricas.

Fluxo v1 completo:

```text
override > assigned table > PRICE_NOT_FOUND
```

## 21. Exemplos normativos

### 21.1 Override vence

Override R$ 32,00; tabela atribuída R$ 36,00. Resultado: `RESOLVED`, `CLIENT_OVERRIDE`, R$ 32,00.

### 21.2 Zero vence

Override R$ 0,00; tabela atribuída R$ 36,00. Resultado: `RESOLVED`, `CLIENT_OVERRIDE`, R$ 0,00. Não há fallback.

### 21.3 Override sem atribuição

Override R$ 32,00; atribuição ausente. Resultado: `RESOLVED`, `CLIENT_OVERRIDE`, R$ 32,00. Atribuição não é avaliada.

### 21.4 Fallback para tabela

Override `OVERRIDE_NOT_FOUND`; atribuição `RESOLVED`; item da tabela R$ 36,00. Resultado: `RESOLVED`, `ASSIGNED_COMMERCIAL_TABLE`, R$ 36,00.

### 21.5 Sem atribuição

Override `OVERRIDE_NOT_FOUND`; atribuição `ASSIGNMENT_NOT_FOUND`. Resultado: `PRICE_NOT_FOUND / ASSIGNMENT_NOT_FOUND`.

### 21.6 Item ausente na tabela

Override `OVERRIDE_NOT_FOUND`; atribuição `RESOLVED`; PRC-05 `PRICE_NOT_FOUND`. Resultado: `PRICE_NOT_FOUND / TABLE_PRICE_NOT_FOUND`. Não chamar motor.

### 21.7 Cliente inexistente

Override resolver retorna `CLIENT_NOT_FOUND`. Resultado final `CLIENT_NOT_FOUND`; nenhuma chamada adicional.

### 21.8 Item inexistente

Override resolver retorna `ITEM_NOT_FOUND`. Resultado final `ITEM_NOT_FOUND`; nenhuma chamada adicional.

### 21.9 Data futura

Override `scheduled` aplicável na data futura vence antes do sync. Sem override, atribuição futura e versão comercial futura podem resolver pelos componentes canônicos.

### 21.10 Data histórica

Override histórico aplicável vence independentemente de mudanças posteriores. Sem override histórico, a atribuição e versão comercial históricas são resolvidas pela mesma data.

## 22. Snapshot transacional futuro

Quando cotação, pedido ou fatura consumir o resultado, o domínio transacional futuro deve persistir snapshot contendo no mínimo:

- preço final;
- moeda;
- source;
- data de referência;
- identificadores de `source_refs`.

PRC-07 não cria tabelas transacionais. O módulo transacional futuro deverá resolver e persistir o snapshot na mesma transação de negócio, evitando alteração entre leitura e gravação. Transações persistidas não devem mudar retrospectivamente quando override, tabela, custo ou política mudarem; nunca fazer recomputação viva de uma transação concluída.

## 23. Critérios de aceitação para PRC-07B

1. Reutiliza os três resolvers canônicos, sem SQL temporal alternativo.
2. Implementa exatamente `CLIENT_OVERRIDE > ASSIGNED_COMMERCIAL_TABLE`.
3. Zero explícito encerra resolução como override.
4. Somente `OVERRIDE_NOT_FOUND` permite fallback.
5. `CLIENT_NOT_FOUND` e `ITEM_NOT_FOUND` são terminais.
6. Ausências de assignment/tabela/versão/item são mapeadas conforme seção 8.
7. Segurança, membership e ambas as permissões são verificadas antes de disclosure.
8. `SECURITY DEFINER`, `search_path` fixo e grants/revokes seguem o padrão RPC do projeto.
9. Trace representa apenas chamadas efetivamente realizadas.
10. Resolver é read-only `STABLE`, usa uma statement/snapshot e não contém timestamp volátil.
11. Current/future/historical funcionam sem dependência de sync.
12. Não calcula preço e não chama PRC-04.
13. Não introduz default/grupo/segmento/canal.
14. Não retorna PII desnecessária.
15. Testes comprovam short-circuit, zero, erros, cross-tenant e todos os reason codes.

## 24. Estado desta fase

PRC-07A define somente modelo e contrato. Nesta fase:

- migrations permanecem `001–040`;
- `fn_resolve_final_client_price` ainda não existe;
- não há API wrapper, UI, teste remoto novo ou permission row nova;
- implementação começa somente em PRC-07B.
