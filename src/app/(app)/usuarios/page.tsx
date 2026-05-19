import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UsuariosClient } from "./UsuariosClient";

export default async function UsuariosPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/agenda");

  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      include: {
        role: { select: { id: true, nome: true } },
        fisio: { select: { cref: true, cor: true } },
      },
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
    cref: u.fisio?.cref ?? null,
    cor: u.fisio?.cor ?? null,
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
