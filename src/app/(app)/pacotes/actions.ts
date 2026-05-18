// src/app/(app)/pacotes/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";

export async function createPacote(formData: FormData) {
  await requireAdmin();

  const pacienteId = formData.get("pacienteId") as string;
  const totalSessoesStr = formData.get("totalSessoes") as string;
  const valorTotalStr = formData.get("valorTotal") as string;
  const dataInicioStr = formData.get("dataInicio") as string;
  const validadeDiasStr = formData.get("validadeDias") as string;

  if (!pacienteId || !totalSessoesStr || !valorTotalStr || !dataInicioStr || !validadeDiasStr) {
    return { error: "Campos obrigatórios ausentes." };
  }

  const totalSessoes = parseInt(totalSessoesStr, 10);
  const validadeDias = parseInt(validadeDiasStr, 10);
  const valorTotal = parseFloat(valorTotalStr);

  if (isNaN(totalSessoes) || totalSessoes < 1) return { error: "Total de sessões inválido." };
  if (isNaN(validadeDias) || validadeDias < 1) return { error: "Validade inválida." };
  if (isNaN(valorTotal) || valorTotal < 0) return { error: "Valor inválido." };

  // Midnight BRT = 03:00 UTC
  const dataInicio = new Date(dataInicioStr + "T03:00:00.000Z");
  const dataExpiracao = new Date(dataInicio);
  dataExpiracao.setUTCDate(dataExpiracao.getUTCDate() + validadeDias);

  try {
    await prisma.pacoteSessoes.create({
      data: { pacienteId, totalSessoes, valorTotal, dataInicio, validadeDias, dataExpiracao },
    });
  } catch {
    return { error: "Erro ao criar pacote." };
  }

  revalidatePath("/pacotes");
  revalidatePath("/pacientes");
  return { success: true };
}

export async function updatePacote(id: string, formData: FormData) {
  await requireAdmin();

  const totalSessoesStr = formData.get("totalSessoes") as string;
  const valorTotalStr = formData.get("valorTotal") as string;
  const dataInicioStr = formData.get("dataInicio") as string;
  const validadeDiasStr = formData.get("validadeDias") as string;

  if (!totalSessoesStr || !valorTotalStr || !dataInicioStr || !validadeDiasStr) {
    return { error: "Campos obrigatórios ausentes." };
  }

  const totalSessoes = parseInt(totalSessoesStr, 10);
  const validadeDias = parseInt(validadeDiasStr, 10);
  const valorTotal = parseFloat(valorTotalStr);

  if (isNaN(totalSessoes) || totalSessoes < 1) return { error: "Total de sessões inválido." };
  if (isNaN(validadeDias) || validadeDias < 1) return { error: "Validade inválida." };
  if (isNaN(valorTotal) || valorTotal < 0) return { error: "Valor inválido." };

  const dataInicio = new Date(dataInicioStr + "T03:00:00.000Z");
  const dataExpiracao = new Date(dataInicio);
  dataExpiracao.setUTCDate(dataExpiracao.getUTCDate() + validadeDias);

  try {
    await prisma.pacoteSessoes.update({
      where: { id },
      data: { totalSessoes, valorTotal, dataInicio, validadeDias, dataExpiracao },
    });
  } catch {
    return { error: "Erro ao atualizar pacote." };
  }

  revalidatePath("/pacotes");
  revalidatePath("/pacientes");
  return { success: true };
}

export async function deletePacote(id: string) {
  await requireAdmin();

  try {
    await prisma.pacoteSessoes.delete({ where: { id } });
  } catch {
    return { error: "Erro ao excluir pacote. Pode haver pagamento vinculado." };
  }

  revalidatePath("/pacotes");
  revalidatePath("/pacientes");
  return { success: true };
}
