"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

export async function createProcedimento(formData: FormData) {
  await requireAdmin();

  const nome = formData.get("nome") as string;
  const valorStr = formData.get("valor") as string;
  const valor = parseFloat(valorStr);

  if (!nome?.trim()) return { error: "Nome é obrigatório." };
  if (isNaN(valor) || valor < 0) return { error: "Valor inválido." };

  try {
    await prisma.procedimento.create({
      data: { nome: nome.trim(), valor },
    });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Procedimento já cadastrado." };
    }
    return { error: "Erro ao criar procedimento." };
  }

  revalidatePath("/procedimentos");
  return { success: true };
}

export async function updateProcedimento(id: string, formData: FormData) {
  await requireAdmin();

  const nome = formData.get("nome") as string;
  const valorStr = formData.get("valor") as string;
  const valor = parseFloat(valorStr);

  if (!nome?.trim()) return { error: "Nome é obrigatório." };
  if (isNaN(valor) || valor < 0) return { error: "Valor inválido." };

  try {
    await prisma.procedimento.update({
      where: { id },
      data: { nome: nome.trim(), valor },
    });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Procedimento já cadastrado." };
    }
    return { error: "Erro ao atualizar procedimento." };
  }

  revalidatePath("/procedimentos");
  return { success: true };
}

export async function toggleProcedimentoAtivo(id: string) {
  await requireAdmin();

  const proc = await prisma.procedimento.findUnique({ where: { id } });
  if (!proc) return { error: "Procedimento não encontrado." };

  try {
    await prisma.procedimento.update({
      where: { id },
      data: { ativo: !proc.ativo },
    });
  } catch {
    return { error: "Erro ao atualizar procedimento." };
  }

  revalidatePath("/procedimentos");
  return { success: true };
}
