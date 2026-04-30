/**
 * Tests for auth.ts - verifies that the schema field `role` is used,
 * not the non-existent `isAdmin` boolean.
 */

import { authOptions } from "@/lib/auth";

// Mock prisma
const mockFindUnique = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

// Mock bcryptjs
const mockCompare = jest.fn();
jest.mock("bcryptjs", () => ({
  compare: (...args: unknown[]) => mockCompare(...args),
}));

describe("authOptions - credentials provider authorize", () => {
  const credentialsProvider = authOptions.providers[0] as any;
  const authorize = credentialsProvider.options?.authorize || credentialsProvider.authorize;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when credentials are missing", async () => {
    const result = await authorize(null, {});
    expect(result).toBeNull();
  });

  it("returns null when user is not found", async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await authorize({ email: "unknown@example.com", password: "pass" }, {});
    expect(result).toBeNull();
  });

  it("returns null when password does not match", async () => {
    mockFindUnique.mockResolvedValue({
      id: "1",
      email: "user@example.com",
      name: "Test",
      passwordHash: "hash",
      role: "user",
    });
    mockCompare.mockResolvedValue(false);
    const result = await authorize({ email: "user@example.com", password: "wrong" }, {});
    expect(result).toBeNull();
  });

  it("returns user object with isAdmin=false for role=user", async () => {
    mockFindUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "Jane",
      passwordHash: "hash",
      role: "user",
    });
    mockCompare.mockResolvedValue(true);
    const result = await authorize({ email: "user@example.com", password: "correct" }, {});
    expect(result).not.toBeNull();
    expect(result.isAdmin).toBe(false);
    expect(result.email).toBe("user@example.com");
  });

  it("returns user object with isAdmin=true for role=admin", async () => {
    mockFindUnique.mockResolvedValue({
      id: "admin-1",
      email: "admin@gospeldrop.org",
      name: "Admin",
      passwordHash: "hash",
      role: "admin",
    });
    mockCompare.mockResolvedValue(true);
    const result = await authorize({ email: "admin@gospeldrop.org", password: "correct" }, {});
    expect(result).not.toBeNull();
    expect(result.isAdmin).toBe(true);
  });
});
