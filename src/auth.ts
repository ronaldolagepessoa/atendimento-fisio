import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";

const DUMMY_HASH = "$2b$12$dummy.hash.to.prevent.timing.attack.padding";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string" ? credentials.email : null;
        const password =
          typeof credentials?.password === "string"
            ? credentials.password
            : null;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { role: { select: { nome: true, permissoes: true } } },
        });

        if (!user || !user.password) {
          await bcrypt.compare("dummy", DUMMY_HASH);
          return null;
        }

        if (!user.ativo) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role.nome,
          permissions: user.role.permissoes,
          fisioId: user.fisioId ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.permissions = (user as { permissions: string[] }).permissions;
        token.fisioId = (user as { fisioId?: string }).fisioId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.role = token.role ?? "FISIO";
      session.user.permissions = token.permissions ?? [];
      session.user.fisioId = token.fisioId;
      return session;
    },
  },
});
