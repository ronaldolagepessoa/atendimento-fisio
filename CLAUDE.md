# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**atendimento-fisio** — physiotherapy clinic management system. ~3 physios, ~100 patients. Features: scheduling, session packages, taping alerts, payments, WhatsApp notifications, weekly reports.

GitHub remote: `git@github.com:ronaldolagepessoa/atendimento-fisio.git`

## Commands

```bash
npm run dev       # start dev server (http://localhost:3000)
npm run build     # production build
npm run lint      # ESLint

npx prisma generate          # regenerate Prisma client after schema changes
npx prisma migrate dev       # create + apply migration (dev)
npx prisma migrate deploy    # apply migrations (prod/CI)
npx prisma db seed           # seed admin user

docker compose up -d         # start local postgres (port 5432)
docker compose down          # stop postgres
```

## Architecture

```
src/
  app/
    (auth)/login/       # public login page + server action
    (app)/              # protected area (requires auth)
      layout.tsx        # sidebar + shell, role-conditional nav links
      agenda/           # scheduling
      pacientes/        # patient management
      fisioterapeutas/  # physio management
      procedimentos/    # procedure catalog
      pacotes/          # session packages
      pagamentos/       # payment registration (ADMIN only)
      relatorios/       # reports (ADMIN only)
      taping/           # taping alerts
    api/auth/           # NextAuth v5 route handlers
  auth.ts               # NextAuth full config (Node.js runtime, Prisma adapter)
  auth.config.ts        # NextAuth edge-safe config (no Prisma, used by proxy.ts)
  proxy.ts              # Next.js 16 route proxy (auth + RBAC enforcement)
  lib/
    prisma.ts           # PrismaClient singleton (PrismaPg adapter)
    auth-guard.ts       # requireAdmin() for server actions
    utils.ts            # cn() helper (clsx + tailwind-merge)
  types/next-auth.d.ts  # module augmentation for Role + fisioId

prisma/
  schema.prisma         # full domain schema
  migrations/           # SQL migration history
  seed.ts               # upsert admin@clinica.com / admin123

prisma.config.ts        # Prisma 7 config — DATABASE_URL, seed command
Dockerfile              # multi-stage: deps → builder → runner (standalone)
docker-compose.yml      # local postgres:16-alpine
```

## Roles & Access

| Route | ADMIN | FISIO |
|---|---|---|
| /agenda | ✅ | ✅ |
| /pacientes | ✅ | ✅ |
| /taping | ✅ | ✅ |
| /fisioterapeutas | ✅ | ❌ → /agenda |
| /procedimentos | ✅ | ❌ → /agenda |
| /pacotes | ✅ | ❌ → /agenda |
| /pagamentos | ✅ | ❌ → /agenda |
| /relatorios | ✅ | ❌ → /agenda |

## Environment Variables

Copy `.env.example` → `.env` and `.env.local` for local dev.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | NextAuth JWT signing secret (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`) |
| `ZAPI_INSTANCE_ID` | Z-API WhatsApp instance (future) |
| `ZAPI_TOKEN` | Z-API token (future) |
| `ZAPI_CLIENT_TOKEN` | Z-API client token (future) |

Local dev DATABASE_URL: `postgresql://postgres:postgres@localhost:5432/fisio_dev`

## Key Decisions

- **Prisma 7**: DATABASE_URL lives in `prisma.config.ts`, not `schema.prisma`. Driver adapter (`PrismaPg`) required — instantiate via `new PrismaPg({ connectionString })`.
- **NextAuth v5 split config**: `auth.config.ts` (edge-safe, no Prisma) used by `proxy.ts`; `auth.ts` (full, Node.js only) used by server components and actions.
- **next-auth/providers/credentials** with `strategy: "jwt"` — no DB sessions.
- **Docker CMD**: `node node_modules/prisma/build/index.js migrate deploy && node server.js` — Prisma CLI called directly (no npx in runner).
- **Next.js 16**: middleware file renamed to `proxy.ts`.
