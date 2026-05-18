# Usuários e Perfis de Acesso — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static Role enum with a dynamic roles system stored in DB, add a `/usuarios` admin screen to manage users and access profiles, and keep Fisioterapeuta ↔ User sync working.

**Architecture:** Permissions per role stored as `String[]` in a new `Role` model. At login, role name + permissions loaded from DB and stored in JWT (approach A — edge-compatible proxy, re-login needed after permission change). ADMIN role bypasses all permission checks. FisioModal gains a senha field; fisios/actions.ts updated to use `roleId`.

**Tech Stack:** Next.js 16 App Router (RSC + client), Prisma 7, NextAuth v5, bcryptjs, Tailwind CSS, TypeScript.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `prisma/schema.prisma` | Modify | Remove enum Role, add model Role, change User.roleId |
| `prisma/migrations/XXXXXX_role-system/migration.sql` | Create (via Prisma) | Schema + data migration |
| `prisma/seed.ts` | Modify | Use roleId instead of Role enum |
| `src/types/next-auth.d.ts` | Modify | Add permissions: string[], change role to string |
| `src/auth.ts` | Modify | Load permissions from DB in jwt callback |
| `src/auth.config.ts` | Modify | Pass through permissions in session callback |
| `src/proxy.ts` | Modify | Permission-based RBAC replacing hardcoded routes |
| `src/app/(app)/layout.tsx` | Modify | Nav links conditional on permissions |
| `src/app/(app)/fisios/FisioModal.tsx` | Modify | Add senha field |
| `src/app/(app)/fisios/actions.ts` | Modify | Use roleId lookup, use senha from form |
| `src/app/(app)/usuarios/actions.ts` | Create | CRUD for users and roles |
| `src/app/(app)/usuarios/page.tsx` | Create | RSC — loads users + roles |
| `src/app/(app)/usuarios/UsuariosClient.tsx` | Create | Tabs + tables |
| `src/app/(app)/usuarios/UserModal.tsx` | Create | Create/edit user modal |
| `src/app/(app)/usuarios/RoleModal.tsx` | Create | Create/edit role modal with permissions checklist |

---

### Task 1: Schema + Migration + Seed

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/XXXXXX_role-system/migration.sql` (Prisma generates the file, we edit it)
- Modify: `prisma/seed.ts`

**Context:**
- Current `enum Role { ADMIN FISIO }` and `User.role Role` must be replaced with `model Role` and `User.roleId String`
- Migration must insert 3 system roles BEFORE making `roleId` NOT NULL, because existing User rows need populating
- System role IDs are hardcoded strings (`'role-admin'`, `'role-fisio'`, `'role-recepcionista'`) so seed.ts can reference them reliably
- ADMIN role has empty `permissoes` — the proxy always allows ADMIN regardless of permissions
- `String[]` with `@default([])` maps to `TEXT[]` in PostgreSQL — works natively without extensions

- [ ] **Step 1: Update schema.prisma**

Replace the `enum Role` block and update `model User`. Final relevant sections of `prisma/schema.prisma`:

```prisma
model User {
  id       String   @id @default(cuid())
  email    String   @unique
  name     String?
  password String?
  ativo    Boolean  @default(true)

  role    Role   @relation(fields: [roleId], references: [id])
  roleId  String

  fisio    Fisioterapeuta? @relation(fields: [fisioId], references: [id])
  fisioId  String?

  accounts Account[]
  sessions Session[]

  createdAt DateTime @default(now())
}

model Role {
  id         String   @id @default(cuid())
  nome       String   @unique
  permissoes String[] @default([])
  sistema    Boolean  @default(false)
  usuarios   User[]
  criadoEm  DateTime @default(now())
}
```

Remove the old `enum Role { ADMIN FISIO }` block entirely.

- [ ] **Step 2: Generate migration (create-only)**

```bash
npx prisma migrate dev --name role-system --create-only
```

Expected: creates `prisma/migrations/YYYYMMDDHHMMSS_role-system/migration.sql` without applying it.

- [ ] **Step 3: Replace migration SQL content**

Open the generated `migration.sql` and replace its entire content with:

```sql
-- CreateTable: Role
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "permissoes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_nome_key" ON "Role"("nome");

-- Insert 3 system roles BEFORE touching User
INSERT INTO "Role" ("id", "nome", "permissoes", "sistema", "criadoEm") VALUES
  ('role-admin', 'ADMIN', ARRAY[]::TEXT[], true, NOW()),
  ('role-fisio', 'FISIO', ARRAY['/agenda', '/taping']::TEXT[], true, NOW()),
  ('role-recepcionista', 'RECEPCIONISTA', ARRAY['/agenda', '/pacientes', '/taping', '/pacotes', '/pagamentos']::TEXT[], true, NOW());

-- Add nullable roleId to User
ALTER TABLE "User" ADD COLUMN "roleId" TEXT;

-- Populate roleId from existing role enum values
UPDATE "User" SET "roleId" = 'role-admin' WHERE "role" = 'ADMIN';
UPDATE "User" SET "roleId" = 'role-fisio' WHERE "role" = 'FISIO';

-- Make roleId NOT NULL
ALTER TABLE "User" ALTER COLUMN "roleId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "Role"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old role column (enum values no longer needed)
ALTER TABLE "User" DROP COLUMN "role";

-- DropEnum
DROP TYPE "Role";
```

- [ ] **Step 4: Apply migration**

```bash
npx prisma migrate dev
```

Expected: `✔  Database schema is now in sync with your Prisma schema.` No errors.

- [ ] **Step 5: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: Prisma client regenerated without `Role` enum.

- [ ] **Step 6: Update seed.ts**

Replace `prisma/seed.ts` content:

```typescript
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env["DATABASE_URL"];
if (!connectionString) {
  throw new Error("DATABASE_URL não definida. Configure no .env antes de rodar o seed.");
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hash = await bcrypt.hash("admin123", 12);

  await prisma.user.upsert({
    where: { email: "admin@clinica.com" },
    update: {},
    create: {
      email: "admin@clinica.com",
      name: "Admin",
      password: hash,
      roleId: "role-admin",
    },
  });

  console.log("✅ Seed concluído — admin@clinica.com / admin123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 7: Lint**

```bash
npm run lint
```

Expected: 0 errors. (TypeScript will complain about `Role` enum imports in other files — those are fixed in later tasks. Lint should pass at schema level.)

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations prisma/seed.ts
git commit -m "feat: replace Role enum with dynamic Role model and migration"
```

---

### Task 2: Auth / JWT / Types / Proxy

**Files:**
- Modify: `src/types/next-auth.d.ts`
- Modify: `src/auth.ts`
- Modify: `src/auth.config.ts`
- Modify: `src/proxy.ts`
- Modify: `src/lib/auth-guard.ts`

**Context:**
- `session.user.role` changes from Prisma enum `Role` to plain `string` (role nome, e.g. `"ADMIN"`)
- `session.user.permissions` is a new `string[]` field (route prefixes)
- `auth.ts` authorize callback must include `{ role: string, permissions: string[] }` in returned user object
- `auth.ts` jwt callback stores these in the token
- `auth.config.ts` session callback (used by middleware) must forward `permissions` from token to session
- `proxy.ts` drops `ADMIN_ONLY_ROUTES` and hardcoded FISIO check; uses permissions array instead
- `auth-guard.ts` compares `session.user.role === "ADMIN"` — still works since role is the nome string "ADMIN"

- [ ] **Step 1: Update next-auth.d.ts**

Replace `src/types/next-auth.d.ts` content:

```typescript
import "next-auth";
import "next-auth/jwt";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: string;
    permissions: string[];
    fisioId?: string;
  }
  interface Session {
    user: {
      role: string;
      permissions: string[];
      fisioId?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    permissions?: string[];
    fisioId?: string;
  }
}
```

- [ ] **Step 2: Update auth.ts**

Replace `src/auth.ts` content:

```typescript
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
      session.user.role = token.role ?? "FISIO";
      session.user.permissions = token.permissions ?? [];
      session.user.fisioId = token.fisioId as string | undefined;
      return session;
    },
  },
});
```

- [ ] **Step 3: Update auth.config.ts**

Replace `src/auth.config.ts` content:

```typescript
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
      session.user.role = (token.role as string) ?? "FISIO";
      session.user.permissions = (token.permissions as string[]) ?? [];
      session.user.fisioId = token.fisioId as string | undefined;
      return session;
    },
  },
};
```

- [ ] **Step 4: Update proxy.ts**

Replace `src/proxy.ts` content:

```typescript
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthRoute = req.nextUrl.pathname.startsWith("/login");
  const isApiAuthRoute = req.nextUrl.pathname.startsWith("/api/auth");

  if (isApiAuthRoute) return NextResponse.next();

  if (!isLoggedIn && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/agenda", req.url));
  }

  const role = req.auth?.user?.role;
  const permissions: string[] = req.auth?.user?.permissions ?? [];

  if (role !== "ADMIN") {
    const allowed = permissions.some((p) =>
      req.nextUrl.pathname.startsWith(p)
    );
    if (!allowed) {
      return NextResponse.redirect(new URL("/agenda", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 5: Verify auth-guard.ts needs no change**

Open `src/lib/auth-guard.ts`. Confirm it compares `session.user.role !== "ADMIN"` (string comparison). No change needed since role is now the nome string "ADMIN".

- [ ] **Step 6: Lint**

```bash
npm run lint
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/types/next-auth.d.ts src/auth.ts src/auth.config.ts src/proxy.ts
git commit -m "feat: load permissions from DB into JWT, permission-based RBAC in proxy"
```

---

### Task 3: Nav links conditional on permissions

**Files:**
- Modify: `src/app/(app)/layout.tsx`

**Context:**
- `session.user.role === "ADMIN"` → show all links + "Usuários"
- Otherwise: show link only if `session.user.permissions` contains a prefix matching the route
- "Usuários" only shown to ADMIN (no other role gets /usuarios in permissions)

- [ ] **Step 1: Update layout.tsx**

Replace `src/app/(app)/layout.tsx` content:

```typescript
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";
  const permissions = session.user.permissions ?? [];
  const can = (route: string) =>
    isAdmin || permissions.some((p) => route.startsWith(p));

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-56 bg-slate-900 text-white flex flex-col p-4">
        <span className="font-bold text-lg mb-6">🏥 Fisio Clínica</span>
        <nav className="flex flex-col gap-1 text-sm text-slate-300">
          {can("/agenda") && (
            <Link href="/agenda" className="hover:text-white px-3 py-2 rounded-lg hover:bg-slate-700">📅 Agenda</Link>
          )}
          {can("/pacientes") && (
            <Link href="/pacientes" className="hover:text-white px-3 py-2 rounded-lg hover:bg-slate-700">👤 Pacientes</Link>
          )}
          {can("/taping") && (
            <Link href="/taping" className="hover:text-white px-3 py-2 rounded-lg hover:bg-slate-700">🩹 Taping</Link>
          )}
          {can("/fisios") && (
            <Link href="/fisios" className="hover:text-white px-3 py-2 rounded-lg hover:bg-slate-700">🧑‍⚕️ Fisioterapeutas</Link>
          )}
          {can("/procedimentos") && (
            <Link href="/procedimentos" className="hover:text-white px-3 py-2 rounded-lg hover:bg-slate-700">💊 Procedimentos</Link>
          )}
          {can("/pacotes") && (
            <Link href="/pacotes" className="hover:text-white px-3 py-2 rounded-lg hover:bg-slate-700">📦 Pacotes</Link>
          )}
          {can("/pagamentos") && (
            <Link href="/pagamentos" className="hover:text-white px-3 py-2 rounded-lg hover:bg-slate-700">💰 Pagamentos</Link>
          )}
          {can("/relatorios") && (
            <Link href="/relatorios" className="hover:text-white px-3 py-2 rounded-lg hover:bg-slate-700">📊 Relatórios</Link>
          )}
          {isAdmin && (
            <Link href="/usuarios" className="hover:text-white px-3 py-2 rounded-lg hover:bg-slate-700">👥 Usuários</Link>
          )}
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/layout.tsx
git commit -m "feat: nav links conditional on role permissions"
```

---

### Task 4: FisioModal senha field + fisios/actions.ts roleId

**Files:**
- Modify: `src/app/(app)/fisios/FisioModal.tsx`
- Modify: `src/app/(app)/fisios/actions.ts`

**Context:**
- Current `createFisio` uses `bcrypt.hash(email, 12)` as password — admin can't set it. Must use senha from form.
- Current `createFisio` uses `role: "FISIO"` (enum) → must use `roleId: "role-fisio"` (hardcoded system ID from migration)
- `updateFisio`: also support optional senha update; use `roleId` if creating/checking
- FisioModal: add senha field (required in create mode, optional in edit mode with placeholder hint)

- [ ] **Step 1: Update fisios/actions.ts**

Replace `src/app/(app)/fisios/actions.ts` content:

```typescript
"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

const FISIO_ROLE_ID = "role-fisio";

export async function createFisio(formData: FormData) {
  await requireAdmin();

  const nome = formData.get("nome") as string;
  const email = formData.get("email") as string;
  const cref = (formData.get("cref") as string) || null;
  const cor = (formData.get("cor") as string) || "#6366f1";
  const senha = (formData.get("senha") as string)?.trim();

  if (!nome?.trim() || !email?.trim()) {
    return { error: "Nome e email são obrigatórios." };
  }
  if (!senha) {
    return { error: "Senha é obrigatória." };
  }

  const senhaHash = await bcrypt.hash(senha, 12);

  try {
    await prisma.$transaction(async (tx) => {
      const fisio = await tx.fisioterapeuta.create({
        data: { nome: nome.trim(), email: email.trim(), cref: cref?.trim() || null, cor },
      });
      await tx.user.create({
        data: {
          name: nome.trim(),
          email: email.trim(),
          password: senhaHash,
          roleId: FISIO_ROLE_ID,
          fisioId: fisio.id,
        },
      });
    });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Email já cadastrado." };
    }
    return { error: "Erro ao criar fisioterapeuta." };
  }

  revalidatePath("/fisios");
  return { success: true };
}

export async function updateFisio(id: string, formData: FormData) {
  await requireAdmin();

  const nome = formData.get("nome") as string;
  const email = formData.get("email") as string;
  const cref = (formData.get("cref") as string) || null;
  const cor = (formData.get("cor") as string) || "#6366f1";
  const senha = (formData.get("senha") as string)?.trim() || null;

  if (!nome?.trim() || !email?.trim()) {
    return { error: "Nome e email são obrigatórios." };
  }

  const userUpdateData: {
    name: string;
    email: string;
    password?: string;
  } = { name: nome.trim(), email: email.trim() };
  if (senha) {
    userUpdateData.password = await bcrypt.hash(senha, 12);
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.fisioterapeuta.update({
        where: { id },
        data: { nome: nome.trim(), email: email.trim(), cref: cref?.trim() || null, cor },
      });
      await tx.user.updateMany({
        where: { fisioId: id },
        data: userUpdateData,
      });
    });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Email já cadastrado." };
    }
    return { error: "Erro ao atualizar fisioterapeuta." };
  }

  revalidatePath("/fisios");
  return { success: true };
}

export async function toggleFisioAtivo(id: string) {
  await requireAdmin();

  const fisio = await prisma.fisioterapeuta.findUnique({ where: { id } });
  if (!fisio) return { error: "Fisioterapeuta não encontrado." };

  const novoAtivo = !fisio.ativo;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.fisioterapeuta.update({ where: { id }, data: { ativo: novoAtivo } });
      await tx.user.updateMany({ where: { fisioId: id }, data: { ativo: novoAtivo } });
    });
  } catch {
    return { error: "Erro ao atualizar fisioterapeuta." };
  }

  revalidatePath("/fisios");
  return { success: true };
}
```

- [ ] **Step 2: Update FisioModal.tsx — add senha field**

Replace `src/app/(app)/fisios/FisioModal.tsx` content:

```typescript
"use client";

import { useActionState, useEffect } from "react";
import { createFisio, updateFisio } from "./actions";
import { cn } from "@/lib/utils";

type Fisio = {
  id: string;
  nome: string;
  email: string;
  cref: string | null;
  cor: string;
};

type Props = {
  fisio?: Fisio;
  onClose: () => void;
};

type ActionState = { error: string; success?: undefined } | { success: boolean; error?: undefined } | null;

export function FisioModal({ fisio, onClose }: Props) {
  const baseAction = fisio ? updateFisio.bind(null, fisio.id) : createFisio;
  const action = (_state: ActionState, formData: FormData) => baseAction(formData);
  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (state && "success" in state) onClose();
  }, [state, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">
          {fisio ? "Editar Fisioterapeuta" : "Novo Fisioterapeuta"}
        </h2>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              name="nome"
              defaultValue={fisio?.nome}
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              name="email"
              type="email"
              defaultValue={fisio?.email}
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">CREF</label>
            <input
              name="cref"
              defaultValue={fisio?.cref ?? ""}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Cor na agenda
            </label>
            <input
              name="cor"
              type="color"
              defaultValue={fisio?.cor ?? "#6366f1"}
              className="h-10 w-full cursor-pointer rounded-lg border border-zinc-300 p-1"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Senha {!fisio && <span className="text-red-500">*</span>}
            </label>
            <input
              name="senha"
              type="password"
              required={!fisio}
              placeholder={fisio ? "Deixe em branco para manter a senha atual" : ""}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {state && "error" in state && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className={cn(
                "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700",
                pending && "cursor-not-allowed opacity-60"
              )}
            >
              {pending ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Lint**

```bash
npm run lint
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/fisios/actions.ts" "src/app/(app)/fisios/FisioModal.tsx"
git commit -m "feat: add senha field to FisioModal, use roleId in fisio actions"
```

---

### Task 5: /usuarios — Server actions

**Files:**
- Create: `src/app/(app)/usuarios/actions.ts`

**Context:**
- All actions require `requireAdmin()`
- `createUser`: if role is FISIO (roleId === 'role-fisio'), also creates Fisioterapeuta
- `updateUser`: if user is FISIO (has fisioId), syncs Fisioterapeuta nome/email; optional senha update
- `toggleUserAtivo`: if fisioId present, syncs Fisioterapeuta.ativo; cannot deactivate own account
- `createRole`: validates unique nome, creates Role with parsed permissoes
- `updateRole`: cannot edit ADMIN role (sistema && nome === "ADMIN"); updates permissoes and nome
- `deleteRole`: cannot delete sistema roles; cannot delete if users are assigned
- `permissoes` from form: checklist sends multiple values with same field name — use `formData.getAll("permissoes")`

- [ ] **Step 1: Create actions.ts**

Create `src/app/(app)/usuarios/actions.ts`:

```typescript
"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

const FISIO_ROLE_ID = "role-fisio";

// ─── Users ───────────────────────────────────────────────────────────────────

export async function createUser(formData: FormData) {
  await requireAdmin();

  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const roleId = (formData.get("roleId") as string)?.trim();
  const senha = (formData.get("senha") as string)?.trim();
  const cref = (formData.get("cref") as string)?.trim() || null;
  const cor = (formData.get("cor") as string)?.trim() || "#6366f1";

  if (!name || !email || !roleId || !senha) {
    return { error: "Nome, email, perfil e senha são obrigatórios." };
  }

  const senhaHash = await bcrypt.hash(senha, 12);
  const isFisio = roleId === FISIO_ROLE_ID;

  try {
    await prisma.$transaction(async (tx) => {
      if (isFisio) {
        const fisio = await tx.fisioterapeuta.create({
          data: { nome: name, email, cref, cor },
        });
        await tx.user.create({
          data: { name, email, password: senhaHash, roleId, fisioId: fisio.id },
        });
      } else {
        await tx.user.create({
          data: { name, email, password: senhaHash, roleId },
        });
      }
    });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Email já cadastrado." };
    }
    return { error: "Erro ao criar usuário." };
  }

  revalidatePath("/usuarios");
  return { success: true };
}

export async function updateUser(id: string, formData: FormData) {
  await requireAdmin();

  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const roleId = (formData.get("roleId") as string)?.trim();
  const senha = (formData.get("senha") as string)?.trim() || null;

  if (!name || !email || !roleId) {
    return { error: "Nome, email e perfil são obrigatórios." };
  }

  const userUpdateData: { name: string; email: string; roleId: string; password?: string } = {
    name, email, roleId,
  };
  if (senha) userUpdateData.password = await bcrypt.hash(senha, 12);

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id }, data: userUpdateData });
      if (user.fisioId) {
        await tx.fisioterapeuta.update({
          where: { id: user.fisioId },
          data: { nome: name, email },
        });
      }
    });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Email já cadastrado." };
    }
    return { error: "Erro ao atualizar usuário." };
  }

  revalidatePath("/usuarios");
  return { success: true };
}

export async function toggleUserAtivo(id: string) {
  const session = await requireAdmin();
  if (session.user.sub === id || (session.user as { id?: string }).id === id) {
    return { error: "Você não pode desativar sua própria conta." };
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { error: "Usuário não encontrado." };

  const novoAtivo = !user.ativo;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { ativo: novoAtivo } });
      if (user.fisioId) {
        await tx.fisioterapeuta.update({
          where: { id: user.fisioId },
          data: { ativo: novoAtivo },
        });
      }
    });
  } catch {
    return { error: "Erro ao atualizar usuário." };
  }

  revalidatePath("/usuarios");
  return { success: true };
}

// ─── Roles ───────────────────────────────────────────────────────────────────

export async function createRole(formData: FormData) {
  await requireAdmin();

  const nome = (formData.get("nome") as string)?.trim();
  const permissoes = formData.getAll("permissoes") as string[];

  if (!nome) return { error: "Nome do perfil é obrigatório." };

  try {
    await prisma.role.create({ data: { nome, permissoes } });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Já existe um perfil com esse nome." };
    }
    return { error: "Erro ao criar perfil." };
  }

  revalidatePath("/usuarios");
  return { success: true };
}

export async function updateRole(id: string, formData: FormData) {
  await requireAdmin();

  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) return { error: "Perfil não encontrado." };
  if (role.sistema && role.nome === "ADMIN") {
    return { error: "O perfil ADMIN não pode ser editado." };
  }

  const nome = (formData.get("nome") as string)?.trim();
  const permissoes = formData.getAll("permissoes") as string[];

  if (!nome) return { error: "Nome do perfil é obrigatório." };

  try {
    await prisma.role.update({ where: { id }, data: { nome, permissoes } });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Já existe um perfil com esse nome." };
    }
    return { error: "Erro ao atualizar perfil." };
  }

  revalidatePath("/usuarios");
  return { success: true };
}

export async function deleteRole(id: string) {
  await requireAdmin();

  const role = await prisma.role.findUnique({
    where: { id },
    include: { _count: { select: { usuarios: true } } },
  });
  if (!role) return { error: "Perfil não encontrado." };
  if (role.sistema) return { error: "Perfis de sistema não podem ser excluídos." };
  if (role._count.usuarios > 0) {
    return { error: `Este perfil possui ${role._count.usuarios} usuário(s) vinculado(s).` };
  }

  await prisma.role.delete({ where: { id } });
  revalidatePath("/usuarios");
  return { success: true };
}
```

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/usuarios/actions.ts"
git commit -m "feat: server actions for user and role CRUD"
```

---

### Task 6: /usuarios — Page + UI Components

**Files:**
- Create: `src/app/(app)/usuarios/page.tsx`
- Create: `src/app/(app)/usuarios/UsuariosClient.tsx`
- Create: `src/app/(app)/usuarios/UserModal.tsx`
- Create: `src/app/(app)/usuarios/RoleModal.tsx`

**Context:**
- RSC `page.tsx` loads all users (with role nome) and all roles (with user count)
- `UsuariosClient` has two tabs: "Usuários" (table) and "Perfis de Acesso" (list)
- `UserModal`: create/edit user; if roleId === 'role-fisio', shows cref + cor fields
- `RoleModal`: create/edit role; checklist of 8 routes; ADMIN role shows disabled checklist with "ADMIN tem acesso total" message
- System roles (sistema=true): no delete button; ADMIN role: no edit permissions button
- Toggle ativo: shows "Ativar" / "Desativar" button inline in table
- The 8 configurable route prefixes: `/agenda`, `/pacientes`, `/taping`, `/pacotes`, `/pagamentos`, `/procedimentos`, `/fisios`, `/relatorios`
- `session.user.id` available as `session.user.sub` in NextAuth v5 JWT strategy — used to prevent self-deactivation

- [ ] **Step 1: Create page.tsx**

Create `src/app/(app)/usuarios/page.tsx`:

```typescript
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UsuariosClient } from "./UsuariosClient";

export default async function UsuariosPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/agenda");

  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      include: { role: { select: { id: true, nome: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.role.findMany({
      include: { _count: { select: { usuarios: true } } },
      orderBy: { criadoEm: "asc" },
    }),
  ]);

  const usersSer = users.map((u) => ({
    id: u.id,
    name: u.name ?? "",
    email: u.email,
    ativo: u.ativo,
    roleId: u.roleId,
    roleNome: u.role.nome,
    fisioId: u.fisioId,
  }));

  const rolesSer = roles.map((r) => ({
    id: r.id,
    nome: r.nome,
    permissoes: r.permissoes,
    sistema: r.sistema,
    userCount: r._count.usuarios,
  }));

  const currentUserId = session?.user.sub ?? "";

  return (
    <UsuariosClient
      users={usersSer}
      roles={rolesSer}
      currentUserId={currentUserId}
    />
  );
}
```

- [ ] **Step 2: Create RoleModal.tsx**

Create `src/app/(app)/usuarios/RoleModal.tsx`:

```typescript
"use client";

import { useActionState, useEffect } from "react";
import { createRole, updateRole } from "./actions";
import { cn } from "@/lib/utils";

export type RoleSer = {
  id: string;
  nome: string;
  permissoes: string[];
  sistema: boolean;
  userCount: number;
};

const ROTAS = [
  { prefix: "/agenda", label: "Agenda" },
  { prefix: "/pacientes", label: "Pacientes" },
  { prefix: "/taping", label: "Taping" },
  { prefix: "/pacotes", label: "Pacotes" },
  { prefix: "/pagamentos", label: "Pagamentos" },
  { prefix: "/procedimentos", label: "Procedimentos" },
  { prefix: "/fisios", label: "Fisioterapeutas" },
  { prefix: "/relatorios", label: "Relatórios" },
];

type Props = {
  role?: RoleSer;
  onClose: () => void;
};

type ActionState = { error: string; success?: undefined } | { success: boolean; error?: undefined } | null;

export function RoleModal({ role, onClose }: Props) {
  const baseAction = role ? updateRole.bind(null, role.id) : createRole;
  const action = (_state: ActionState, formData: FormData) => baseAction(formData);
  const [state, formAction, pending] = useActionState(action, null);

  const isAdminRole = role?.sistema && role.nome === "ADMIN";

  useEffect(() => {
    if (state && "success" in state) onClose();
  }, [state, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">
          {role ? "Editar Perfil" : "Novo Perfil de Acesso"}
        </h2>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              name="nome"
              defaultValue={role?.nome}
              required
              disabled={role?.sistema}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-zinc-50 disabled:text-zinc-400"
            />
            {role?.sistema && (
              <input type="hidden" name="nome" value={role.nome} />
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              Permissões de acesso
            </label>
            {isAdminRole ? (
              <p className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
                O perfil ADMIN tem acesso total ao sistema.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {ROTAS.map((rota) => (
                  <label
                    key={rota.prefix}
                    className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm cursor-pointer hover:bg-zinc-50"
                  >
                    <input
                      type="checkbox"
                      name="permissoes"
                      value={rota.prefix}
                      defaultChecked={role?.permissoes.includes(rota.prefix)}
                      className="accent-indigo-600"
                    />
                    {rota.label}
                  </label>
                ))}
              </div>
            )}
          </div>

          {state && "error" in state && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending || isAdminRole}
              className={cn(
                "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700",
                (pending || isAdminRole) && "cursor-not-allowed opacity-60"
              )}
            >
              {pending ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create UserModal.tsx**

Create `src/app/(app)/usuarios/UserModal.tsx`:

```typescript
"use client";

import { useActionState, useEffect, useState } from "react";
import { createUser, updateUser } from "./actions";
import { cn } from "@/lib/utils";
import type { RoleSer } from "./RoleModal";

export type UserSer = {
  id: string;
  name: string;
  email: string;
  ativo: boolean;
  roleId: string;
  roleNome: string;
  fisioId: string | null;
};

type Props = {
  user?: UserSer;
  roles: RoleSer[];
  onClose: () => void;
};

type ActionState = { error: string; success?: undefined } | { success: boolean; error?: undefined } | null;

const FISIO_ROLE_ID = "role-fisio";

export function UserModal({ user, roles, onClose }: Props) {
  const baseAction = user ? updateUser.bind(null, user.id) : createUser;
  const action = (_state: ActionState, formData: FormData) => baseAction(formData);
  const [state, formAction, pending] = useActionState(action, null);
  const [selectedRoleId, setSelectedRoleId] = useState(user?.roleId ?? "");

  useEffect(() => {
    if (state && "success" in state) onClose();
  }, [state, onClose]);

  const isFisio = selectedRoleId === FISIO_ROLE_ID;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">
          {user ? "Editar Usuário" : "Novo Usuário"}
        </h2>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              defaultValue={user?.name}
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              name="email"
              type="email"
              defaultValue={user?.email}
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Perfil de acesso <span className="text-red-500">*</span>
            </label>
            <select
              name="roleId"
              defaultValue={user?.roleId}
              required
              onChange={(e) => setSelectedRoleId(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Selecione um perfil</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome}
                </option>
              ))}
            </select>
          </div>

          {isFisio && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">CREF</label>
                <input
                  name="cref"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Cor na agenda
                </label>
                <input
                  name="cor"
                  type="color"
                  defaultValue="#6366f1"
                  className="h-10 w-full cursor-pointer rounded-lg border border-zinc-300 p-1"
                />
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Senha {!user && <span className="text-red-500">*</span>}
            </label>
            <input
              name="senha"
              type="password"
              required={!user}
              placeholder={user ? "Deixe em branco para manter a senha atual" : ""}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {state && "error" in state && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className={cn(
                "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700",
                pending && "cursor-not-allowed opacity-60"
              )}
            >
              {pending ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create UsuariosClient.tsx**

Create `src/app/(app)/usuarios/UsuariosClient.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { toggleUserAtivo, deleteRole } from "./actions";
import { cn } from "@/lib/utils";
import { UserModal, type UserSer } from "./UserModal";
import { RoleModal, type RoleSer } from "./RoleModal";

type Props = {
  users: UserSer[];
  roles: RoleSer[];
  currentUserId: string;
};

type Tab = "usuarios" | "perfis";

export function UsuariosClient({ users, roles, currentUserId }: Props) {
  const [tab, setTab] = useState<Tab>("usuarios");
  const [userModal, setUserModal] = useState<{ open: boolean; user?: UserSer }>({ open: false });
  const [roleModal, setRoleModal] = useState<{ open: boolean; role?: RoleSer }>({ open: false });
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleToggleUser = (id: string) => {
    startTransition(async () => {
      const res = await toggleUserAtivo(id);
      if ("error" in res) setFeedback(res.error);
    });
  };

  const handleDeleteRole = (id: string, nome: string) => {
    if (!confirm(`Excluir o perfil "${nome}"?`)) return;
    startTransition(async () => {
      const res = await deleteRole(id);
      if ("error" in res) setFeedback(res.error);
    });
  };

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Usuários</h1>

      {feedback && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 flex justify-between">
          {feedback}
          <button onClick={() => setFeedback(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-200 mb-6">
        <button
          onClick={() => setTab("usuarios")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors",
            tab === "usuarios"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          )}
        >
          👥 Usuários
        </button>
        <button
          onClick={() => setTab("perfis")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors",
            tab === "perfis"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          )}
        >
          🔐 Perfis de Acesso
        </button>
      </div>

      {/* Tab: Usuários */}
      {tab === "usuarios" && (
        <div>
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setUserModal({ open: true })}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              + Novo Usuário
            </button>
          </div>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">Nome</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">Perfil</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isCurrentUser = u.id === currentUserId;
                  const isAdmin = u.roleNome === "ADMIN";
                  return (
                    <tr key={u.id} className="border-t border-zinc-100">
                      <td className="px-4 py-3 text-zinc-800 font-medium">{u.name}</td>
                      <td className="px-4 py-3 text-zinc-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                          isAdmin ? "bg-indigo-100 text-indigo-700" : "bg-zinc-100 text-zinc-600"
                        )}>
                          {u.roleNome}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                          u.ativo ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-400"
                        )}>
                          {u.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setUserModal({ open: true, user: u })}
                            className="text-xs text-indigo-600 hover:text-indigo-800"
                          >
                            Editar
                          </button>
                          {!isAdmin && !isCurrentUser && (
                            <button
                              onClick={() => handleToggleUser(u.id)}
                              disabled={isPending}
                              className="text-xs text-zinc-500 hover:text-zinc-700"
                            >
                              {u.ativo ? "Desativar" : "Ativar"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Perfis */}
      {tab === "perfis" && (
        <div>
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setRoleModal({ open: true })}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              + Novo Perfil
            </button>
          </div>
          <div className="space-y-3">
            {roles.map((r) => {
              const isAdminRole = r.sistema && r.nome === "ADMIN";
              return (
                <div key={r.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900">{r.nome}</span>
                      {r.sistema && (
                        <span className="text-xs bg-zinc-100 text-zinc-500 rounded-full px-2 py-0.5">sistema</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!isAdminRole && (
                        <button
                          onClick={() => setRoleModal({ open: true, role: r })}
                          className="text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          Editar
                        </button>
                      )}
                      {!r.sistema && (
                        <button
                          onClick={() => handleDeleteRole(r.id, r.nome)}
                          disabled={isPending}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {r.userCount} usuário(s) · {isAdminRole ? "Acesso total" : r.permissoes.length === 0 ? "Nenhuma permissão" : r.permissoes.join(", ")}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      {userModal.open && (
        <UserModal
          user={userModal.user}
          roles={roles}
          onClose={() => setUserModal({ open: false })}
        />
      )}
      {roleModal.open && (
        <RoleModal
          role={roleModal.role}
          onClose={() => setRoleModal({ open: false })}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Lint**

```bash
npm run lint
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/usuarios/"
git commit -m "feat: /usuarios admin screen — manage users and access profiles"
```

---

## Self-Review

**Spec coverage:**
- Dynamic roles in DB with configurable permissoes ✅ (Task 1)
- Permissions stored in JWT at login ✅ (Task 2)
- Permission-based RBAC in proxy.ts ✅ (Task 2)
- Nav links conditional on permissions ✅ (Task 3)
- Fisio ↔ User sync maintained ✅ (Task 4 + Task 5 createUser/updateUser/toggleUserAtivo)
- Senha field in FisioModal ✅ (Task 4)
- /usuarios screen with tabs ✅ (Task 6)
- Usuários tab: create/edit/toggle ativo ✅ (Task 6)
- Perfis tab: create/edit/delete with checklist ✅ (Task 6)
- ADMIN role: no delete, no permission edit ✅ (Tasks 5 + 6)
- Sistema roles: no delete ✅ (Tasks 5 + 6)
- Cannot deactivate own account ✅ (Task 5 toggleUserAtivo)
- FISIO user creation: shows cref + cor fields ✅ (Task 6 UserModal)
- Migration with data migration SQL ✅ (Task 1)
- Seed updated to use roleId ✅ (Task 1)

**Placeholder scan:** No TBDs. All code complete.

**Type consistency:**
- `UserSer` defined in `UserModal.tsx`, imported in `UsuariosClient.tsx` ✅
- `RoleSer` defined in `RoleModal.tsx`, imported in `UserModal.tsx` and `UsuariosClient.tsx` ✅
- `FISIO_ROLE_ID = "role-fisio"` used consistently in `actions.ts` (fisios) and `actions.ts` (usuarios) and `UserModal.tsx` ✅
- `toggleUserAtivo` in actions returns `{ error } | { success }` — matches pattern in UsuariosClient ✅

**⚠️ Note for admin after deploy:** The FISIO role default permissions are `/agenda` and `/taping`. If existing FISIO users previously had access to `/pacientes` (which the old RBAC allowed), the admin should update the FISIO role permissions to include `/pacientes` via the `/usuarios → Perfis de Acesso` screen.
