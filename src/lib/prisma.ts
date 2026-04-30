import { PrismaClient } from "@prisma/client";

declare global {
  var prismaInstance: PrismaClient | undefined;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!global.prismaInstance) {
      global.prismaInstance = new PrismaClient();
    }
    const val = (global.prismaInstance as any)[prop];
    return typeof val === "function" ? val.bind(global.prismaInstance) : val;
  },
});
