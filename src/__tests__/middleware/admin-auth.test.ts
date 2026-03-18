/**
 * Tests for admin route middleware / auth guard.
 * Ensures /admin/* routes require an authenticated admin session.
 * The middleware lives in src/middleware.ts (Next.js middleware).
 */
import { NextRequest, NextResponse } from "next/server";
import { middleware } from "@/middleware";

jest.mock("next-auth/jwt", () => ({
  getToken: jest.fn(),
}));

import { getToken } from "next-auth/jwt";
const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;

function makeAdminRequest(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    headers: { cookie: "next-auth.session-token=fake-token" },
  });
}

describe("admin middleware", () => {
  beforeEach(() => jest.clearAllMocks());

  it("redirects unauthenticated users from /admin to /auth/signin", async () => {
    mockGetToken.mockResolvedValue(null);
    const req = makeAdminRequest("/admin");
    const res = await middleware(req);
    expect(res?.status).toBe(307);
    expect(res?.headers.get("location")).toContain("/auth/signin");
  });

  it("redirects non-admin users from /admin to / (home)", async () => {
    mockGetToken.mockResolvedValue({ sub: "u2", email: "user@example.com", role: "user" } as any);
    const req = makeAdminRequest("/admin");
    const res = await middleware(req);
    expect(res?.status).toBe(307);
    const location = res?.headers.get("location") ?? "";
    expect(location).not.toContain("/admin");
  });

  it("allows admin users to access /admin", async () => {
    mockGetToken.mockResolvedValue({ sub: "u1", email: "admin@example.com", role: "admin" } as any);
    const req = makeAdminRequest("/admin");
    const res = await middleware(req);
    // NextResponse.next() returns status 200 or undefined (pass-through)
    expect(res?.status === 200 || res === undefined || res?.status !== 307).toBe(true);
  });

  it("allows admin users to access /admin/shipments", async () => {
    mockGetToken.mockResolvedValue({ sub: "u1", email: "admin@example.com", role: "admin" } as any);
    const req = makeAdminRequest("/admin/shipments");
    const res = await middleware(req);
    expect(res?.status === 200 || res === undefined || res?.status !== 307).toBe(true);
  });

  it("allows admin users to access /admin/donors", async () => {
    mockGetToken.mockResolvedValue({ sub: "u1", email: "admin@example.com", role: "admin" } as any);
    const req = makeAdminRequest("/admin/donors");
    const res = await middleware(req);
    expect(res?.status === 200 || res === undefined || res?.status !== 307).toBe(true);
  });

  it("allows admin users to access /admin/queue", async () => {
    mockGetToken.mockResolvedValue({ sub: "u1", email: "admin@example.com", role: "admin" } as any);
    const req = makeAdminRequest("/admin/queue");
    const res = await middleware(req);
    expect(res?.status === 200 || res === undefined || res?.status !== 307).toBe(true);
  });

  it("does not affect non-admin routes", async () => {
    mockGetToken.mockResolvedValue(null);
    const req = makeAdminRequest("/donate");
    const res = await middleware(req);
    // Should pass through without redirect
    expect(res?.status).not.toBe(307);
  });
});
