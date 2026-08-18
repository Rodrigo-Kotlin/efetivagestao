const SENSITIVE_KEYS = new Set([
  "password",
  "access_token",
  "refresh_token",
  "token",
  "secret",
  "key",
  "authorization",
]);

function sanitize(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      result[k] = "[REDACTED]";
    } else {
      result[k] = v;
    }
  }
  return result;
}

export const logger = {
  debug(message: string, data?: Record<string, unknown>) {
    if (import.meta.env.DEV) {
      console.debug(`[DEBUG] ${message}`, data ? sanitize(data) : "");
    }
  },
  info(message: string, data?: Record<string, unknown>) {
    if (import.meta.env.DEV) {
      console.info(`[INFO] ${message}`, data ? sanitize(data) : "");
    }
  },
  warn(message: string, data?: Record<string, unknown>) {
    console.warn(`[WARN] ${message}`, data ? sanitize(data) : "");
  },
  error(message: string, data?: Record<string, unknown>) {
    console.error(`[ERROR] ${message}`, data ? sanitize(data) : "");
  },
};
