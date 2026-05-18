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
