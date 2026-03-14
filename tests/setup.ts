import { vi, beforeEach } from "vitest";
import { resetAllMocks } from "./helpers/mock-prisma";
import { resetIdCounter } from "./helpers/fixtures";

// Mock NextAuth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// Reset all mocks before each test
beforeEach(() => {
  resetAllMocks();
  resetIdCounter();
  vi.clearAllMocks();
});

export { mockPrisma, resetAllMocks } from "./helpers/mock-prisma";
export * from "./helpers/fixtures";
