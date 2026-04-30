import { afterEach, describe, expect, it } from "vitest";
import { clearEnvCache, parseEnv } from "@/lib/env";

const validEnv = {
  DATABASE_URL: "postgresql://user:password@localhost:5432/gospeldrop",
  NEXTAUTH_URL: "https://gospeldrop.example.com",
  NEXTAUTH_SECRET: "super-secret-value-with-at-least-thirty-two-chars",
  STRIPE_SECRET_KEY: "sk_test_1234567890",
  EMAIL_FROM: "hello@gospeldrop.example.com",
};

describe("parseEnv", () => {
  afterEach(() => {
    clearEnvCache();
  });

  it("parses the required server environment variables", () => {
    const env = parseEnv(validEnv);

    expect(env.DATABASE_URL).toBe(validEnv.DATABASE_URL);
    expect(env.NEXTAUTH_URL).toBe(validEnv.NEXTAUTH_URL);
    expect(env.SMTP_PORT).toBe(587);
    expect(env.SMTP_SECURE).toBe(false);
  });

  it("rejects missing required secrets", () => {
    expect(() =>
      parseEnv({
        ...validEnv,
        NEXTAUTH_SECRET: "",
      })
    ).toThrow(/NEXTAUTH_SECRET/i);
  });

  it("rejects partial SMTP credentials", () => {
    expect(() =>
      parseEnv({
        ...validEnv,
        SMTP_HOST: "smtp.example.com",
      })
    ).toThrow(/SMTP_USER|SMTP_PASS/i);
  });
});
