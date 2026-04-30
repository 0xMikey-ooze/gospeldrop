import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { getEnv } from "./env";

export function getAuthOptions(): NextAuthOptions {
  return {
    providers: [
      CredentialsProvider({
        name: "credentials",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) return null;
          try {
            const user = await prisma.user.findUnique({
              where: { email: credentials.email },
            });
            if (!user) return null;
            const valid = await bcrypt.compare(credentials.password, user.passwordHash);
            if (!valid) return null;
            return { id: user.id, email: user.email, name: user.name, role: user.role };
          } catch {
            return null;
          }
        },
      }),
    ],
    secret: getEnv().NEXTAUTH_SECRET,
    session: { strategy: "jwt" },
    pages: { signIn: "/auth/signin" },
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.id = user.id;
          token.role = user.role;
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          if (!token.id) {
            throw new Error("Session token is missing user id");
          }

          session.user.id = token.id;
          session.user.role = token.role ?? "user";
        }
        return session;
      },
    },
  };
}

