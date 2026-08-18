import { describe, it, expect, vi } from "vitest";

vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");

describe("config", () => {
  it("exports config object with required fields", async () => {
    const { config } = await import("@/lib/config");
    expect(config).toBeDefined();
    expect(config.supabaseUrl).toBe("https://test.supabase.co");
    expect(config.supabaseAnonKey).toBe("test-anon-key");
    expect(typeof config.isDev).toBe("boolean");
    expect(typeof config.isProd).toBe("boolean");
  });
});
