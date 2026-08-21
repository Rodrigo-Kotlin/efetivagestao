import type { ReactNode } from "react";

interface FieldFrameProps {
  controlId: string;
  label: ReactNode;
  required?: boolean;
  supportingText?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}

export function FieldFrame({
  controlId,
  label,
  required = false,
  supportingText,
  error,
  children,
}: FieldFrameProps) {
  return (
    <div className="eg-field" data-invalid={Boolean(error) || undefined}>
      <label className="eg-field__label" htmlFor={controlId}>
        {label}
        {required ? <span className="eg-field__required" aria-label="obrigatório">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="eg-field__message" id={`${controlId}-error`} role="alert">
          {error}
        </p>
      ) : supportingText ? (
        <p className="eg-field__support" id={`${controlId}-support`}>
          {supportingText}
        </p>
      ) : null}
    </div>
  );
}
