// src/app/(app)/pagamentos/page.tsx
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { PagamentosClient } from "./PagamentosClient";

export default async function PagamentosPage() {
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";

  const [pagamentos, pacientes, agendamentosSemPagamento, pacotes] = await Promise.all([
    prisma.pagamento.findMany({
      include: {
        paciente: { select: { id: true, nome: true } },
        agendamento: {
          select: {
            id: true,
            dataHora: true,
            procedimento: { select: { nome: true } },
          },
        },
        pacote: { select: { id: true, totalSessoes: true, dataInicio: true } },
      },
      orderBy: { dataPagamento: "desc" },
    }),
    prisma.paciente.findMany({
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
    prisma.agendamento.findMany({
      where: { pagamento: null, status: "REALIZADO" },
      select: {
        id: true,
        dataHora: true,
        pacienteId: true,
        procedimento: { select: { nome: true } },
      },
      orderBy: { dataHora: "desc" },
      take: 300,
    }),
    prisma.pacoteSessoes.findMany({
      select: { id: true, pacienteId: true, totalSessoes: true, dataInicio: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const pagamentosSer = pagamentos.map((p) => ({
    id: p.id,
    valor: p.valor.toNumber(),
    forma: p.forma,
    dataPagamento: p.dataPagamento.toISOString(),
    observacao: p.observacao,
    pacienteId: p.pacienteId,
    paciente: p.paciente,
    agendamentoId: p.agendamentoId,
    agendamento: p.agendamento
      ? {
          id: p.agendamento.id,
          dataHora: p.agendamento.dataHora.toISOString(),
          procedimento: p.agendamento.procedimento,
        }
      : null,
    pacoteId: p.pacoteId,
    pacote: p.pacote
      ? {
          id: p.pacote.id,
          totalSessoes: p.pacote.totalSessoes,
          dataInicio: p.pacote.dataInicio.toISOString(),
        }
      : null,
  }));

  const agendamentosSer = agendamentosSemPagamento.map((a) => ({
    id: a.id,
    dataHora: a.dataHora.toISOString(),
    pacienteId: a.pacienteId,
    procedimento: a.procedimento,
  }));

  const pacotesSer = pacotes.map((p) => ({
    id: p.id,
    pacienteId: p.pacienteId,
    totalSessoes: p.totalSessoes,
    dataInicio: p.dataInicio.toISOString(),
  }));

  return (
    <PagamentosClient
      pagamentos={pagamentosSer}
      pacientes={pacientes}
      agendamentos={agendamentosSer}
      pacotes={pacotesSer}
      isAdmin={isAdmin}
    />
  );
}
