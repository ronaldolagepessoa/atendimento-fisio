import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      // authorize runs only in the Node.js context (auth.ts), not here
      authorize: () => null,
    }),
  ],
  callbacks: {
    authorized({ auth }) {
      return !!auth;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: "ADMIN" | "FISIO" }).role;
        token.fisioId = (user as { fisioId?: string }).fisioId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = (token.role as "ADMIN" | "FISIO") ?? "FISIO";
      session.user.fisioId = token.fisioId as string | undefined;
      return session;
    },
  },
};
