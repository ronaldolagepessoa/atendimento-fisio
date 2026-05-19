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
  const cref = (formData.get("cref") as string)?.trim() || null;
  const cor = (formData.get("cor") as string)?.trim() || null;

  if (!name || !email || !roleId) {
    return { error: "Nome, email e perfil são obrigatórios." };
  }

  const userUpdateData: {
    name: string;
    email: string;
    roleId: string;
    password?: string;
  } = { name, email, roleId };
  if (senha) userUpdateData.password = await bcrypt.hash(senha, 12);

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id }, data: userUpdateData });
      if (user.fisioId) {
        await tx.fisioterapeuta.update({
          where: { id: user.fisioId },
          data: {
            nome: name,
            email,
            ...(cref !== null && cref !== "" ? { cref } : {}),
            ...(cor ? { cor } : {}),
          },
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
  const currentUserId = session.user.id;
  if (currentUserId === id) {
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
    return {
      error: `Este perfil possui ${role._count.usuarios} usuário(s) vinculado(s).`,
    };
  }

  await prisma.role.delete({ where: { id } });
  revalidatePath("/usuarios");
  return { success: true };
}
