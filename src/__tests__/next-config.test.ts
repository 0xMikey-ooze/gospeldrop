import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config.mjs";

describe("next.config.mjs", () => {
  it("does not suppress lint or TypeScript build failures", () => {
    expect(nextConfig).not.toHaveProperty("eslint");
    expect(nextConfig).not.toHaveProperty("typescript");
  });
});
