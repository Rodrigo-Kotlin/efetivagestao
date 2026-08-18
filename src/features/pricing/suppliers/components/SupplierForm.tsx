import { useState } from "react";
import { SUPPLIER_CATEGORIES } from "@/types";
import {
  validateCompanyForm,
  validateSupplierForm,
  getFieldError,
  type CompanyFormData,
  type SupplierProfileFormData,
} from "../schemas/validation";

interface Props {
  initialCompany?: Partial<CompanyFormData>;
  initialSupplier?: Partial<SupplierProfileFormData>;
  onSubmit: (data: { company: CompanyFormData; supplier: SupplierProfileFormData }) => void;
  onCancel: () => void;
  loading?: boolean;
}

const sectionStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-6)",
  marginBottom: "var(--space-6)",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "var(--text-lg)",
  fontWeight: "var(--font-semibold)",
  color: "var(--color-text)",
  marginBottom: "var(--space-4)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "var(--text-sm)",
  fontWeight: "var(--font-medium)",
  color: "var(--color-text-secondary)",
  marginBottom: "var(--space-1)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "var(--space-2) var(--space-3)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  fontSize: "var(--text-sm)",
  outline: "none",
  boxSizing: "border-box",
};

const errorInputStyle: React.CSSProperties = {
  ...inputStyle,
  borderColor: "#EF4444",
};

const errorTextStyle: React.CSSProperties = {
  fontSize: "var(--text-xs)",
  color: "#EF4444",
  marginTop: "2px",
};

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

    if (allErrors.length > 0) {
      setErrors(allErrors);
      return;
    }

    setErrors([]);
    onSubmit({ company, supplier });
  };

  const inputField = (name: string, label: string, value: string, onChange: (v: string) => void, opts?: { type?: string; required?: boolean; placeholder?: string; maxLength?: number }) => {
    const errMsg = getFieldError(errors, name);
    return (
      <div key={name} style={{ marginBottom: "var(--space-4)", flex: 1, minWidth: "250px" }}>
        <label style={labelStyle}>
          {label} {opts?.required && <span style={{ color: "#EF4444" }}>*</span>}
        </label>
        <input
          type={opts?.type ?? "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={opts?.placeholder}
          maxLength={opts?.maxLength}
          style={errMsg ? errorInputStyle : inputStyle}
        />
        {errMsg && <p style={errorTextStyle}>{errMsg}</p>}
      </div>
    );
  };

  const selectField = (name: string, label: string, value: string, onChange: (v: string) => void, options: readonly { readonly value: string; readonly label: string }[], required?: boolean) => {
    const errMsg = getFieldError(errors, name);
    return (
      <div key={name} style={{ marginBottom: "var(--space-4)", flex: 1, minWidth: "250px" }}>
        <label style={labelStyle}>
          {label} {required && <span style={{ color: "#EF4444" }}>*</span>}
        </label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={errMsg ? { ...errorInputStyle, backgroundColor: "#fff" } : { ...inputStyle, backgroundColor: "#fff" }}
        >
          <option value="">Selecione...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {errMsg && <p style={errorTextStyle}>{errMsg}</p>}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Empresa</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-4)" }}>
          {inputField("legal_name", "Razão Social", company.legal_name, (v) => setCompany((s) => ({ ...s, legal_name: v })), { required: true, placeholder: "Razão Social da empresa", maxLength: 255 })}
          {inputField("trade_name", "Nome Fantasia", company.trade_name, (v) => setCompany((s) => ({ ...s, trade_name: v })), { placeholder: "Nome Fantasia (opcional)", maxLength: 255 })}
          {inputField("tax_id", "CNPJ/CPF", company.tax_id, (v) => setCompany((s) => ({ ...s, tax_id: v })), { placeholder: "00.000.000/0001-00" })}
        </div>
      </div>

      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Fornecedor</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-4)" }}>
          {selectField("supplier_category", "Categoria", supplier.supplier_category, (v) => setSupplier((s) => ({ ...s, supplier_category: v as SupplierProfileFormData["supplier_category"] })), SUPPLIER_CATEGORIES, true)}
          {inputField("payment_terms", "Condições de Pagamento", supplier.payment_terms, (v) => setSupplier((s) => ({ ...s, payment_terms: v })), { placeholder: "Ex: 30 dias", maxLength: 255 })}
          {inputField("contract_reference", "Referência do Contrato", supplier.contract_reference, (v) => setSupplier((s) => ({ ...s, contract_reference: v })), { placeholder: "Nº do contrato", maxLength: 255 })}
        </div>
        <div style={{ marginBottom: 0 }}>
          <label style={labelStyle}>Observações</label>
          <textarea
            value={supplier.notes}
            onChange={(e) => setSupplier((s) => ({ ...s, notes: e.target.value }))}
            placeholder="Observações sobre o fornecedor..."
            maxLength={2000}
            rows={4}
            style={{
              width: "100%",
              padding: "var(--space-2) var(--space-3)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-sm)",
              outline: "none",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
          {getFieldError(errors, "notes") && <p style={errorTextStyle}>{getFieldError(errors, "notes")}</p>}
        </div>
      </div>

      <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          style={{
            padding: "var(--space-2) var(--space-4)",
            backgroundColor: "transparent",
            color: "var(--color-text-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            cursor: loading ? "default" : "pointer",
            fontSize: "var(--text-sm)",
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "var(--space-2) var(--space-4)",
            backgroundColor: "var(--color-primary)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius-md)",
            cursor: loading ? "default" : "pointer",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-medium)",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}
