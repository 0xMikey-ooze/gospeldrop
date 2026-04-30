// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Prisma migration baseline", () => {
  it("tracks the schema in versioned migration files", () => {
    const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
    const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });
    const migrationDirectories = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    expect(migrationDirectories.length).toBeGreaterThan(0);
    expect(
      fs.existsSync(path.join(migrationsDir, "migration_lock.toml"))
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(
          migrationsDir,
          migrationDirectories[0],
          "migration.sql"
        )
      )
    ).toBe(true);
  });
});
