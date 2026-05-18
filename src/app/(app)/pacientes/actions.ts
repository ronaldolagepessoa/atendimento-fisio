"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

function normalizarCpf(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

export async function createPaciente(formData: FormData) {
  await requireAdmin();

  const nome = formData.get("nome") as string;
  const telefone = formData.get("telefone") as string;
  const cpfRaw = (formData.get("cpf") as string) || "";
  const dataNascimentoStr = (formData.get("dataNascimento") as string) || "";
  const observacoes = (formData.get("observacoes") as string) || null;

  if (!nome?.trim()) return { error: "Nome é obrigatório." };
  if (!telefone?.trim()) return { error: "Telefone é obrigatório." };

  const cpf = cpfRaw.trim() ? normalizarCpf(cpfRaw) : null;
  const dataNascimento = dataNascimentoStr ? new Date(dataNascimentoStr) : null;

  try {
    await prisma.paciente.create({
      data: {
        nome: nome.trim(),
        telefone: telefone.trim(),
        cpf: cpf || null,
        dataNascimento,
        observacoes: observacoes?.trim() || null,
      },
    });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "CPF já cadastrado." };
    }
    return { error: "Erro ao criar paciente." };
  }

  revalidatePath("/pacientes");
  return { success: true };
}

export async function updatePaciente(id: string, formData: FormData) {
  await requireAdmin();

  const nome = formData.get("nome") as string;
  const telefone = formData.get("telefone") as string;
  const cpfRaw = (formData.get("cpf") as string) || "";
  const dataNascimentoStr = (formData.get("dataNascimento") as string) || "";
  const observacoes = (formData.get("observacoes") as string) || null;

  if (!nome?.trim()) return { error: "Nome é obrigatório." };
  if (!telefone?.trim()) return { error: "Telefone é obrigatório." };

  const cpf = cpfRaw.trim() ? normalizarCpf(cpfRaw) : null;
  const dataNascimento = dataNascimentoStr ? new Date(dataNascimentoStr) : null;

  try {
    await prisma.paciente.update({
      where: { id },
      data: {
        nome: nome.trim(),
        telefone: telefone.trim(),
        cpf: cpf || null,
        dataNascimento,
        observacoes: observacoes?.trim() || null,
      },
    });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "CPF já cadastrado." };
    }
    return { error: "Erro ao atualizar paciente." };
  }

  revalidatePath("/pacientes");
  revalidatePath(`/pacientes/${id}`);
  return { success: true };
}

export async function upsertCorPacienteFisio(
  pacienteId: string,
  fisioId: string,
  cor: string
) {
  await requireAdmin();

  try {
    await prisma.pacienteFisio.upsert({
      where: { pacienteId_fisioId: { pacienteId, fisioId } },
      create: { pacienteId, fisioId, corPersonalizada: cor },
      update: { corPersonalizada: cor },
    });
  } catch {
    return { error: "Erro ao salvar cor." };
  }

  revalidatePath(`/pacientes/${pacienteId}`);
  return { success: true };
}
