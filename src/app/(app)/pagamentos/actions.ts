// src/app/(app)/pagamentos/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";
import { FormaPagamento } from "@prisma/client";

const VALID_FORMAS: FormaPagamento[] = ["DINHEIRO", "PIX", "CARTAO", "TRANSFERENCIA"];

export async function createPagamento(formData: FormData) {
  await requireAdmin();

  const pacienteId = formData.get("pacienteId") as string;
  const valorStr = formData.get("valor") as string;
  const forma = formData.get("forma") as FormaPagamento;
  const dataPagamentoStr = formData.get("dataPagamento") as string;
  const agendamentoId = (formData.get("agendamentoId") as string) || null;
  const pacoteId = (formData.get("pacoteId") as string) || null;
  const observacao = (formData.get("observacao") as string) || null;

  if (!pacienteId || !valorStr || !forma || !dataPagamentoStr) {
    return { error: "Campos obrigatórios ausentes." };
  }

  if (!VALID_FORMAS.includes(forma)) return { error: "Forma de pagamento inválida." };

  const valor = parseFloat(valorStr);
  if (isNaN(valor) || valor <= 0) return { error: "Valor inválido." };

  // Midnight BRT = 03:00 UTC
  const dataPagamento = new Date(dataPagamentoStr + "T03:00:00.000Z");

  try {
    await prisma.pagamento.create({
      data: { pacienteId, valor, forma, dataPagamento, agendamentoId, pacoteId, observacao },
    });
  } catch {
    return { error: "Erro ao registrar pagamento. Agendamento pode já ter pagamento." };
  }

  revalidatePath("/pagamentos");
  return { success: true };
}

export async function updatePagamento(id: string, formData: FormData) {
  await requireAdmin();

  const valorStr = formData.get("valor") as string;
  const forma = formData.get("forma") as FormaPagamento;
  const dataPagamentoStr = formData.get("dataPagamento") as string;
  const agendamentoId = (formData.get("agendamentoId") as string) || null;
  const pacoteId = (formData.get("pacoteId") as string) || null;
  const observacao = (formData.get("observacao") as string) || null;

  if (!valorStr || !forma || !dataPagamentoStr) {
    return { error: "Campos obrigatórios ausentes." };
  }

  if (!VALID_FORMAS.includes(forma)) return { error: "Forma de pagamento inválida." };

  const valor = parseFloat(valorStr);
  if (isNaN(valor) || valor <= 0) return { error: "Valor inválido." };

  const dataPagamento = new Date(dataPagamentoStr + "T03:00:00.000Z");

  try {
    await prisma.pagamento.update({
      where: { id },
      data: { valor, forma, dataPagamento, agendamentoId, pacoteId, observacao },
    });
  } catch {
    return { error: "Erro ao atualizar pagamento." };
  }

  revalidatePath("/pagamentos");
  return { success: true };
}

export async function deletePagamento(id: string) {
  await requireAdmin();

  try {
    await prisma.pagamento.delete({ where: { id } });
  } catch {
    return { error: "Erro ao excluir pagamento." };
  }

  revalidatePath("/pagamentos");
  return { success: true };
}
