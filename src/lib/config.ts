function requireEnv(name: string): string {
  const value = import.meta.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `[CONFIG] Variável de ambiente obrigatória não configurada: ${name}. ` +
        `Copie .env.example para .env e preencha os valores.`
    );
  }
  return value;
}

export const config = {
  supabaseUrl: requireEnv("VITE_SUPABASE_URL"),
  supabaseAnonKey: requireEnv("VITE_SUPABASE_ANON_KEY"),
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;
