# Usuários e Perfis de Acesso — Design

## Objetivo

Substituir o sistema de roles estático (enum) por um sistema de roles dinâmicos com permissões configuráveis por rota. Adicionar tela de administração `/usuarios` para gerenciar usuários e perfis de acesso. Manter espelhamento entre `Fisioterapeuta` e `User` para fisios.

---

## Abordagem

**Permissões no JWT (Approach A):** ao fazer login, as permissões do role são carregadas do banco e armazenadas no JWT. O `proxy.ts` verifica o JWT sem tocar o banco (edge-compatible). Mudanças de permissão exigem re-login para valer — aceitável para clínica com ~3 fisios.

---

## 1. Schema — modelo de dados

### Substituição do enum Role

Remove o `enum Role { ADMIN FISIO }` e cria o model `Role`:

```prisma
model Role {
  id         String   @id @default(cuid())
  nome       String   @unique
  permissoes String[] // prefixos de rota permitidos
  sistema    Boolean  @default(false) // não pode ser deletado
  usuarios   User[]
  criadoEm   DateTime @default(now())
}
```

### User

```prisma
model User {
  // substituir:
  // role    Role    @default(FISIO)  ← enum antigo
  // por:
  roleId  String
  role    Role    @relation(fields: [roleId], references: [id])
  // demais campos inalterados
}
```

### Roles sistema (seed)

| Nome | `sistema` | Permissões default | Permissões editáveis |
|------|-----------|-------------------|----------------------|
| ADMIN | true | todas (tratado como `*` no proxy) | não |
| FISIO | true | `/agenda`, `/taping` | sim |
| RECEPCIONISTA | true | `/agenda`, `/pacientes`, `/taping`, `/pacotes`, `/pagamentos` | sim |

Roles customizados podem ser criados/deletados livremente pelo admin. Roles `sistema = true` não podem ser deletados; ADMIN não tem permissões editáveis (sempre acessa tudo).

### Migração de dados

A migration SQL deve:
1. Criar tabela `Role`
2. Inserir os 3 roles sistema
3. Adicionar coluna `User.roleId` nullable
4. Popular `roleId` com base no enum atual (`ADMIN` → role ADMIN, `FISIO` → role FISIO)
5. Tornar `roleId` NOT NULL
6. Remover coluna `User.role` (enum antigo) e o enum

---

## 2. Auth / JWT

### `src/auth.ts` — carregamento de permissões

```typescript
async jwt({ token, user }) {
  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { role: { select: { nome: true, permissoes: true, sistema: true } } },
    });
    token.role = dbUser.role.nome;
    token.permissions = dbUser.role.permissoes; // string[]
    token.fisioId = dbUser.fisioId ?? undefined;
  }
  return token;
},
async session({ session, token }) {
  session.user.role = token.role;
  session.user.permissions = token.permissions;
  session.user.fisioId = token.fisioId;
  return session;
},
```

### `src/types/next-auth.d.ts`

Adicionar ao `JWT` e `Session.user`:
```typescript
permissions: string[]
```

### `src/proxy.ts` — nova lógica RBAC

```typescript
const role = req.auth?.user?.role;
const permissions: string[] = req.auth?.user?.permissions ?? [];

if (role !== "ADMIN") {
  const allowed = permissions.some(p =>
    req.nextUrl.pathname.startsWith(p)
  );
  if (!allowed) return NextResponse.redirect(new URL("/agenda", req.url));
}
```

Remove a constante `ADMIN_ONLY_ROUTES` e a checagem hardcoded de `"FISIO"`.

### `src/lib/auth-guard.ts`

`requireAdmin()` mantido (compara `session.user.role === "ADMIN"`).

---

## 3. Fisio ↔ User — espelhamento

Fisioterapeuta e seu User são sempre criados/atualizados em par. Qualquer tela que crie ou edite um fisio deve sincronizar o User vinculado.

| Operação | Efeito |
|----------|--------|
| Criar Fisio | Cria `Fisioterapeuta` + `User` (nome, email, senha hasheada, roleId=FISIO) |
| Editar nome/email do Fisio | Atualiza `User.name` e `User.email` |
| Editar nome/email do User FISIO | Atualiza `Fisioterapeuta.nome` e `Fisioterapeuta.email` |
| Desativar Fisio (`ativo=false`) | `User.ativo = false` |

**Campos ao criar Fisio (em qualquer tela):** nome, email, cref (opcional), cor, senha inicial.

Usuários não-FISIO (RECEPCIONISTA, custom) têm apenas `User` — sem `Fisioterapeuta`.

**Campos ao criar User não-FISIO:** nome, email, perfil (select), senha inicial.

---

## 4. Tela `/usuarios`

Route ADMIN-only (coberta pelo proxy via permissões). RSC com Client Component para interatividade.

### Aba "Usuários"

- Tabela: nome, email, perfil, status (ativo/inativo), ações
- "+ Novo Usuário" → modal:
  - Campos base: nome, email, perfil (select de roles), senha inicial
  - Se perfil = FISIO → campos extras: cref (opcional), cor (picker)
  - Cria `User` + `Fisioterapeuta` se FISIO
- Editar → modal pré-preenchido; senha vazia = mantém a atual
- Desativar: `ativo = false` (não deleta); User ADMIN: botão desativar/deletar oculto
- Reativar: botão visível em usuários inativos

### Aba "Perfis de Acesso"

- Lista de roles: nome, nº permissões, nº usuários, ações
- Roles `sistema`: sem botão deletar; ADMIN sem botão editar permissões
- "+ Novo Perfil" → modal: nome + checklist de rotas
- Editar → modal com checklist das 8 rotas configuráveis:
  `/agenda`, `/pacientes`, `/taping`, `/pacotes`, `/pagamentos`, `/procedimentos`, `/fisioterapeutas`, `/relatorios`
- Deletar role: bloqueado se tiver usuários vinculados

### Arquivos

| Arquivo | Ação |
|---------|------|
| `src/app/(app)/usuarios/page.tsx` | Criar — RSC, carrega users + roles |
| `src/app/(app)/usuarios/UsuariosClient.tsx` | Criar — tabs, tabelas, modais |
| `src/app/(app)/usuarios/actions.ts` | Criar — CRUD users e roles |

---

## 5. Nav (`layout.tsx`)

Links condicionais por `session.user.permissions`:
- ADMIN: vê todos os links + "Usuários"
- Outros: veem apenas as rotas em `permissions`
- "Usuários" aparece somente se `role === "ADMIN"`

---

## 6. Fisioterapeutas — sync

**`src/app/(app)/fisioterapeutas/FisioModal.tsx`:**
- Adicionar campo "Senha" (obrigatório no modo criação, opcional no modo edição) ao formulário

**`src/app/(app)/fisioterapeutas/actions.ts`:**
- `createFisio`: após criar `Fisioterapeuta`, cria `User` vinculado (email, nome, senha hasheada, roleId=FISIO, fisioId)
- `updateFisio`: se nome/email mudar, atualiza `User` correspondente (`fisioId = fisio.id`); se senha enviada, atualiza `User.password`
- `toggleFisioAtivo`: sincroniza `User.ativo`

---

## Fora do escopo

- Reset de senha via email (fluxo de convite)
- Autenticação por provedor externo (Google, etc.)
- Permissões por ação (apenas por rota)
- Log de auditoria de acessos
