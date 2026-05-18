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
      authorize: () => null,
    }),
  ],
  callbacks: {
    authorized({ auth }) {
      return !!auth;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.permissions = (user as { permissions: string[] }).permissions;
        token.fisioId = (user as { fisioId?: string }).fisioId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role ?? "FISIO";
      session.user.permissions = token.permissions ?? [];
      session.user.fisioId = token.fisioId;
      return session;
    },
  },
};
