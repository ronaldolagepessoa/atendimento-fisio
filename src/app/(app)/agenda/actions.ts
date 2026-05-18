// src/app/(app)/agenda/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";
import { StatusAgendamento } from "@prisma/client";

export async function createAgendamento(formData: FormData) {
  await requireAdmin();

  const pacienteId = formData.get("pacienteId") as string;
  const fisioId = formData.get("fisioId") as string;
  const procedimentoId = formData.get("procedimentoId") as string;
  const pacoteId = (formData.get("pacoteId") as string) || null;
  const data = formData.get("data") as string;
  const hora = formData.get("hora") as string;

  if (!pacienteId || !fisioId || !procedimentoId || !data || !hora) {
    return { error: "Campos obrigatórios ausentes." };
  }

  // Interpreta entrada do usuário como BRT (UTC-3)
  const dataHora = new Date(`${data}T${hora}:00.000-03:00`);

  try {
    await prisma.agendamento.create({
      data: { pacienteId, fisioId, procedimentoId, pacoteId, dataHora },
    });
  } catch {
    return { error: "Erro ao criar agendamento." };
  }

  revalidatePath("/agenda");
  return { success: true };
}

export async function updateAgendamento(id: string, formData: FormData) {
  await requireAdmin();

  const pacienteId = formData.get("pacienteId") as string;
  const fisioId = formData.get("fisioId") as string;
  const procedimentoId = formData.get("procedimentoId") as string;
  const pacoteId = (formData.get("pacoteId") as string) || null;
  const data = formData.get("data") as string;
  const hora = formData.get("hora") as string;
  const status = formData.get("status") as StatusAgendamento;

  if (!pacienteId || !fisioId || !procedimentoId || !data || !hora) {
    return { error: "Campos obrigatórios ausentes." };
  }

  const validStatuses: StatusAgendamento[] = ["AGENDADO", "REALIZADO", "CANCELADO", "FALTOU"];
  if (!validStatuses.includes(status)) return { error: "Status inválido." };

  const dataHora = new Date(`${data}T${hora}:00.000-03:00`);

  try {
    await prisma.agendamento.update({
      where: { id },
      data: { pacienteId, fisioId, procedimentoId, pacoteId, dataHora, status },
    });
  } catch {
    return { error: "Erro ao atualizar agendamento." };
  }

  revalidatePath("/agenda");
  return { success: true };
}

export async function deleteAgendamento(id: string) {
  await requireAdmin();

  try {
    await prisma.agendamento.delete({ where: { id } });
  } catch {
    return { error: "Erro ao excluir agendamento. Pode haver pagamento vinculado." };
  }

  revalidatePath("/agenda");
  return { success: true };
}

export async function createFrequencia(formData: FormData) {
  await requireAdmin();

  const pacienteId = formData.get("pacienteId") as string;
  const fisioId = formData.get("fisioId") as string;
  const procedimentoId = formData.get("procedimentoId") as string;
  const diasSemana = formData.getAll("diasSemana").map(Number);
  const horario = formData.get("horario") as string;
  const dataInicioStr = formData.get("dataInicio") as string;
  const dataFimStr = formData.get("dataFim") as string;
  const descricao = (formData.get("descricao") as string) || null;

  if (!pacienteId || !fisioId || !procedimentoId || diasSemana.length === 0 || !horario || !dataInicioStr || !dataFimStr) {
    return { error: "Campos obrigatórios ausentes." };
  }

  // Midnight BRT = 03:00 UTC
  const dataInicio = new Date(dataInicioStr + "T03:00:00.000Z");
  const dataFim = new Date(dataFimStr + "T03:00:00.000Z");

  if (dataFim < dataInicio) {
    return { error: "Data fim deve ser posterior à data início." };
  }

  // Gera todas as datas da frequência
  const datas: Date[] = [];
  for (let cur = new Date(dataInicio); cur <= dataFim; cur.setUTCDate(cur.getUTCDate() + 1)) {
    // cur está em midnight BRT (03:00 UTC), então getUTCDay() == dia BRT
    if (diasSemana.includes(cur.getUTCDay())) {
      const dateStr = cur.toISOString().slice(0, 10);
      datas.push(new Date(`${dateStr}T${horario}:00.000-03:00`));
    }
  }

  if (datas.length === 0) {
    return { error: "Nenhum agendamento gerado com esses parâmetros." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const freq = await tx.frequenciaAgendamento.create({
        data: { pacienteId, fisioId, diasSemana, horario, dataInicio, dataFim, descricao },
      });
      await tx.agendamento.createMany({
        data: datas.map((dataHora) => ({
          pacienteId,
          fisioId,
          procedimentoId,
          dataHora,
          frequenciaId: freq.id,
        })),
      });
    });
  } catch {
    return { error: "Erro ao criar frequência." };
  }

  revalidatePath("/agenda");
  return { success: true, count: datas.length };
}

export async function deleteFrequencia(id: string) {
  await requireAdmin();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.agendamento.deleteMany({ where: { frequenciaId: id } });
      await tx.frequenciaAgendamento.delete({ where: { id } });
    });
  } catch {
    return { error: "Erro ao excluir frequência." };
  }

  revalidatePath("/agenda");
  return { success: true };
}
