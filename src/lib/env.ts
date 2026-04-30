import { z } from "zod";

const smtpConfigSchema = z
  .object({
    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_SECURE: z
      .union([z.boolean(), z.enum(["true", "false"])])
      .optional()
      .transform((value) => value === true || value === "true"),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASS: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    const hasHost = Boolean(value.SMTP_HOST);
    const hasUser = Boolean(value.SMTP_USER);
    const hasPass = Boolean(value.SMTP_PASS);

    if (hasHost && (!hasUser || !hasPass)) {
      if (!hasUser) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["SMTP_USER"],
          message: "SMTP_USER is required when SMTP_HOST is set",
        });
      }

      if (!hasPass) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["SMTP_PASS"],
          message: "SMTP_PASS is required when SMTP_HOST is set",
        });
      }
    }
  });

const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    NEXTAUTH_URL: z.url({ message: "NEXTAUTH_URL must be a valid URL" }),
    NEXTAUTH_SECRET: z
      .string()
      .min(32, "NEXTAUTH_SECRET must be at least 32 characters long"),
    STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
    EMAIL_FROM: z.email("EMAIL_FROM must be a valid email address"),
    ADMIN_EMAIL: z
      .email("ADMIN_EMAIL must be a valid email address")
      .default("admin@gospeldrop.org"),
  })
  .and(smtpConfigSchema);

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function parseEnv(source: Partial<Record<string, string | boolean | undefined>>): AppEnv {
  return envSchema.parse(source);
}

export function getEnv(): AppEnv {
  if (!cachedEnv) {
    cachedEnv = parseEnv(process.env);
  }

  return cachedEnv;
}

export function clearEnvCache() {
  cachedEnv = null;
}
