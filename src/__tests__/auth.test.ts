import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getAuthorize() {
  const provider = authOptions.providers[0] as {
    options: {
      authorize: (
        credentials: { email?: string; password?: string } | undefined,
        req: { body?: unknown; query?: unknown; headers?: unknown; method?: string }
      ) => Promise<unknown>;
    };
  };

  return provider.options.authorize;
}

describe("authOptions credentials provider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("derives isAdmin from the Prisma role field", async () => {
    const findUniqueSpy = vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
      id: "user_123",
      email: "admin@example.com",
      name: "Admin User",
      passwordHash: "hashed-password",
      role: "admin",
    } as never);
    const compareSpy = vi.spyOn(bcrypt, "compare").mockResolvedValue(true as never);

    const authorize = getAuthorize();
    const user = (await authorize({
      email: "admin@example.com",
      password: "correct-horse-battery-staple",
    }, {
      body: undefined,
      query: undefined,
      headers: undefined,
      method: "POST",
    })) as { isAdmin?: boolean };

    expect(findUniqueSpy).toHaveBeenCalledWith({
      where: { email: "admin@example.com" },
    });
    expect(compareSpy).toHaveBeenCalledWith(
      "correct-horse-battery-staple",
      "hashed-password"
    );
    expect(user).toMatchObject({
      email: "admin@example.com",
      isAdmin: true,
    });
  });
});
