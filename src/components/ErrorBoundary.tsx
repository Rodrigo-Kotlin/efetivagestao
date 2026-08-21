import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui";
import { logger } from "@/lib/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("ErrorBoundary capturou erro", {
      message: error.message,
      componentStack: errorInfo.componentStack ?? "N/A",
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div
            role="alert"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "100vh",
              padding: "var(--space-8)",
              textAlign: "center",
            }}
          >
            <h1 style={{ fontSize: "var(--text-2xl)", marginBottom: "var(--space-4)" }}>
              Algo deu errado
            </h1>
            <p
              style={{
                color: "var(--color-text-secondary)",
                marginBottom: "var(--space-6)",
                maxWidth: "400px",
              }}
            >
              Ocorreu um erro inesperado. Por favor, recarregue a página ou entre em contato
              com o suporte.
            </p>
            <Button onClick={() => window.location.reload()}>
              Recarregar Página
            </Button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
