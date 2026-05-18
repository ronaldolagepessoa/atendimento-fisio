// src/app/(app)/taping/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";

export async function createTaping(formData: FormData) {
  await requireAdmin();

  const pacienteId = formData.get("pacienteId") as string;
  const fisioId = formData.get("fisioId") as string;
  const regiaCorporal = (formData.get("regiaCorporal") as string)?.trim();
  const dataAplicacaoStr = formData.get("dataAplicacao") as string;
  const dataRetiradaStr = formData.get("dataRetirada") as string;

  if (!pacienteId || !fisioId || !regiaCorporal || !dataAplicacaoStr || !dataRetiradaStr) {
    return { error: "Campos obrigatórios ausentes." };
  }

  const dataAplicacao = new Date(dataAplicacaoStr + "T03:00:00.000Z");
  const dataRetirada = new Date(dataRetiradaStr + "T03:00:00.000Z");

  if (dataRetirada < dataAplicacao) {
    return { error: "Data de retirada deve ser posterior à data de aplicação." };
  }

  try {
    await prisma.taping.create({
      data: { pacienteId, fisioId, regiaCorporal, dataAplicacao, dataRetirada },
    });
  } catch {
    return { error: "Erro ao registrar taping." };
  }

  revalidatePath("/taping");
  return { success: true };
}

export async function updateTaping(id: string, formData: FormData) {
  await requireAdmin();

  const regiaCorporal = (formData.get("regiaCorporal") as string)?.trim();
  const dataAplicacaoStr = formData.get("dataAplicacao") as string;
  const dataRetiradaStr = formData.get("dataRetirada") as string;
  const retirado = formData.get("retirado") === "on";

  if (!regiaCorporal || !dataAplicacaoStr || !dataRetiradaStr) {
    return { error: "Campos obrigatórios ausentes." };
  }

  const dataAplicacao = new Date(dataAplicacaoStr + "T03:00:00.000Z");
  const dataRetirada = new Date(dataRetiradaStr + "T03:00:00.000Z");

  if (dataRetirada < dataAplicacao) {
    return { error: "Data de retirada deve ser posterior à data de aplicação." };
  }

  try {
    await prisma.taping.update({
      where: { id },
      data: { regiaCorporal, dataAplicacao, dataRetirada, retirado },
    });
  } catch {
    return { error: "Erro ao atualizar taping." };
  }

  revalidatePath("/taping");
  return { success: true };
}

export async function deleteTaping(id: string) {
  await requireAdmin();

  try {
    await prisma.taping.delete({ where: { id } });
  } catch {
    return { error: "Erro ao excluir taping." };
  }

  revalidatePath("/taping");
  return { success: true };
}
