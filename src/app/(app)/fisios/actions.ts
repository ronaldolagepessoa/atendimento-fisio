"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function createFisio(formData: FormData) {
  await requireAdmin();

  const nome = formData.get("nome") as string;
  const email = formData.get("email") as string;
  const cref = (formData.get("cref") as string) || null;
  const cor = (formData.get("cor") as string) || "#6366f1";

  if (!nome?.trim() || !email?.trim()) {
    return { error: "Nome e email são obrigatórios." };
  }

  const senhaHash = await bcrypt.hash(email, 12);

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
          role: "FISIO",
          fisioId: fisio.id,
        },
      });
    });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
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

  if (!nome?.trim() || !email?.trim()) {
    return { error: "Nome e email são obrigatórios." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.fisioterapeuta.update({
        where: { id },
        data: { nome: nome.trim(), email: email.trim(), cref: cref?.trim() || null, cor },
      });
      await tx.user.updateMany({
        where: { fisioId: id },
        data: { name: nome.trim(), email: email.trim() },
      });
    });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
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

  await prisma.$transaction(async (tx) => {
    await tx.fisioterapeuta.update({ where: { id }, data: { ativo: novoAtivo } });
    await tx.user.updateMany({ where: { fisioId: id }, data: { ativo: novoAtivo } });
  });

  revalidatePath("/fisios");
  return { success: true };
}
