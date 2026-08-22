import { useState } from "react";
import { SUPPLIER_CATEGORIES } from "@/types";
import { validateCompanyForm, validateSupplierForm, getFieldError, type CompanyFormData, type SupplierProfileFormData } from "../schemas/validation";
import { Button } from "@/components/ui/Button";
import { FormSection } from "@/components/ui/FormSection";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { FormActions } from "@/components/ui/FormActions";
import { InlineError } from "@/components/ui/InlineError";

interface Props {
  initialCompany?: Partial<CompanyFormData>;
  initialSupplier?: Partial<SupplierProfileFormData>;
  onSubmit: (data: { company: CompanyFormData; supplier: SupplierProfileFormData }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function SupplierForm({ initialCompany, initialSupplier, onSubmit, onCancel, loading }: Props) {
  const [company, setCompany] = useState<CompanyFormData>({
    legal_name: initialCompany?.legal_name ?? "",
    trade_name: initialCompany?.trade_name ?? "",
    tax_id: initialCompany?.tax_id ?? "",
  });

  const [supplier, setSupplier] = useState<SupplierProfileFormData>({
    supplier_category: (initialSupplier?.supplier_category ?? "") as SupplierProfileFormData["supplier_category"],
    payment_terms: initialSupplier?.payment_terms ?? "",
    contract_reference: initialSupplier?.contract_reference ?? "",
    notes: initialSupplier?.notes ?? "",
  });

  const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const companyErrors = validateCompanyForm(company);
    const supplierErrors = validateSupplierForm(supplier);
    const allErrors = [...companyErrors, ...supplierErrors];
    if (allErrors.length > 0) { setErrors(allErrors); return; }
    setErrors([]);
    onSubmit({ company, supplier });
  };

  const inputStyle: React.CSSProperties = { width: "100%", padding: "var(--spacing-2) var(--spacing-3)", border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", boxSizing: "border-box" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: "var(--font-size-sm)", fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: "var(--spacing-1)" };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-lg)", padding: "var(--spacing-6)", marginBottom: "var(--spacing-6)" }}>
        <FormSection title="Empresa">
          <FieldGroup columns={2}>
            <div>
              <label style={labelStyle}>Razão Social <span style={{ color: "var(--color-negative)" }}>*</span></label>
              <input type="text" value={company.legal_name} onChange={(e) => setCompany((s) => ({ ...s, legal_name: e.target.value }))} placeholder="Razão Social da empresa" maxLength={255} style={inputStyle} />
              {getFieldError(errors, "legal_name") && <InlineError>{getFieldError(errors, "legal_name")}</InlineError>}
            </div>
            <div>
              <label style={labelStyle}>Nome Fantasia</label>
              <input type="text" value={company.trade_name} onChange={(e) => setCompany((s) => ({ ...s, trade_name: e.target.value }))} placeholder="Nome Fantasia (opcional)" maxLength={255} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>CNPJ/CPF</label>
              <input type="text" value={company.tax_id} onChange={(e) => setCompany((s) => ({ ...s, tax_id: e.target.value }))} placeholder="00.000.000/0001-00" style={inputStyle} />
              {getFieldError(errors, "tax_id") && <InlineError>{getFieldError(errors, "tax_id")}</InlineError>}
            </div>
          </FieldGroup>
        </FormSection>
      </div>

      <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-lg)", padding: "var(--spacing-6)", marginBottom: "var(--spacing-6)" }}>
        <FormSection title="Fornecedor">
          <FieldGroup columns={2}>
            <div>
              <label style={labelStyle}>Categoria <span style={{ color: "var(--color-negative)" }}>*</span></label>
              <select value={supplier.supplier_category} onChange={(e) => setSupplier((s) => ({ ...s, supplier_category: e.target.value as SupplierProfileFormData["supplier_category"] }))}
                style={{ ...inputStyle, backgroundColor: "#fff" }}>
                <option value="">Selecione...</option>
                {SUPPLIER_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              {getFieldError(errors, "supplier_category") && <InlineError>{getFieldError(errors, "supplier_category")}</InlineError>}
            </div>
            <div>
              <label style={labelStyle}>Condições de Pagamento</label>
              <input type="text" value={supplier.payment_terms} onChange={(e) => setSupplier((s) => ({ ...s, payment_terms: e.target.value }))} placeholder="Ex: 30 dias" maxLength={255} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Referência do Contrato</label>
              <input type="text" value={supplier.contract_reference} onChange={(e) => setSupplier((s) => ({ ...s, contract_reference: e.target.value }))} placeholder="Nº do contrato" maxLength={255} style={inputStyle} />
            </div>
          </FieldGroup>
          <div>
            <label style={labelStyle}>Observações</label>
            <textarea value={supplier.notes} onChange={(e) => setSupplier((s) => ({ ...s, notes: e.target.value }))} placeholder="Observações sobre o fornecedor..." maxLength={2000} rows={4}
              style={{ ...inputStyle, resize: "vertical" }} />
            {getFieldError(errors, "notes") && <InlineError>{getFieldError(errors, "notes")}</InlineError>}
          </div>
        </FormSection>
      </div>

      <FormActions>
        <Button type="button" variant="outlined" onClick={onCancel} disabled={loading}>Cancelar</Button>
        <Button type="submit" variant="filled" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
      </FormActions>
    </form>
  );
}
