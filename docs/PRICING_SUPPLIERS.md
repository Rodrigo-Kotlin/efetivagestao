# Fornecedores e Mapeamentos — PRC-02

## Visão Geral

O módulo de Fornecedores gerencia empresas externas que fornecem serviços ao catálogo da organização, e o mapeamento entre a nomenclatura interna (catálogo mestre) e a nomenclatura externa (código/nome do fornecedor).

## Modelo de Dados

```
Company (companies)
  └── SupplierProfile (supplier_profiles) — extensão opcional
        └── SupplierCatalogItem (supplier_catalog_items) — mapeamentos
              └── CatalogItemAlias (catalog_item_aliases) — aliases de busca
```

### companies
- Entidade base para fornecedores
- `legal_name`, `tax_id` (CNPJ/CPF), `status`
- `tax_id_normalized` para unicidade por organização

### supplier_profiles
- Extensão de company para role de fornecedor
- `supplier_category`: laboratory, imaging, clinic, professional_service, other
- `status`: active, inactive, blocked
- `contract_reference`, `payment_terms`

### supplier_catalog_items
- Mapeamento fornecedor ↔ item do catálogo
- `external_code`, `external_name`, `external_unit`
- `is_preferred`: máximo um por catalog_item + organização
- `status`: active, inactive, discontinued
- `valid_from`, `valid_to`: vigência

### catalog_item_aliases (extensão PRC-02)
- `source_company_id`: empresa fornecedora de origem
- `supplier_catalog_item_id`: mapeamento de origem
- `external_code`: código externo do fornecedor

## Segurança (PRC-02A)

### RPCs Hardened
| RPC | User ID | Validações |
|-----|---------|-----------|
| `fn_create_supplier_mapping` | `auth.uid()` | permission, org, supplier active, catalog item org |
| `fn_set_preferred_mapping` | `auth.uid()` | permission, mapping active, supplier active, org membership |

### REVOKE
- `log_audit()`: REVOKE de PUBLIC, anon, authenticated
- `fn_create_supplier_mapping()`: REVOKE de PUBLIC, anon
- `fn_set_preferred_mapping()`: REVOKE de PUBLIC, anon

### CHECK Constraints
- `chk_sci_preferred_requires_active`: `is_preferred=true` requer `status='active'`
- `chk_sci_validity`: `valid_to IS NULL OR valid_to > valid_from`

### Alias Integrity
`fn_alias_supplier_source_integrity` valida:
- Mapping existe
- `organization_id` confere
- `catalog_item_id` confere
- `source_company_id` confere

## Permissões

| Code | Nome |
|------|------|
| core.company.view | Visualizar Empresas |
| core.company.create | Criar Empresa |
| core.company.edit | Editar Empresa |
| core.company.archive | Arquivar Empresa |
| pricing.supplier.view | Visualizar Fornecedores |
| pricing.supplier.create | Criar Fornecedor |
| pricing.supplier.edit | Editar Fornecedor |
| pricing.supplier.archive | Arquivar Fornecedor |
| pricing.supplier.manage_mappings | Gerenciar Mapeamentos |

## Rotas

| Rota | Página |
|------|--------|
| `/pricing/suppliers` | Lista de fornecedores |
| `/pricing/suppliers/new` | Novo fornecedor |
| `/pricing/suppliers/:id` | Detalhe do fornecedor |
| `/pricing/suppliers/:id/edit` | Edição do fornecedor |
