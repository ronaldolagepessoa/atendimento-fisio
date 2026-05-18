// src/app/(app)/agenda/page.tsx
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getWeekStart, formatISODate } from "@/lib/agenda";
import { AgendaClient } from "./AgendaClient";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;

  const weekStart = getWeekStart(week);
  const weekStr = formatISODate(weekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";

  const [agendamentos, pacientes, fisios, procedimentos, pacotes] = await Promise.all([
    prisma.agendamento.findMany({
      where: { dataHora: { gte: weekStart, lt: weekEnd } },
      include: {
        paciente: { select: { id: true, nome: true } },
        fisio: { select: { id: true, nome: true, cor: true } },
        procedimento: { select: { id: true, nome: true } },
      },
      orderBy: { dataHora: "asc" },
    }),
    prisma.paciente.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.fisioterapeuta.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, cor: true },
    }),
    prisma.procedimento.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.pacoteSessoes.findMany({
      where: { status: "ATIVO" },
      select: { id: true, pacienteId: true, totalSessoes: true, sessoesUsadas: true },
    }),
  ]);

  // Serializar DateTime → string antes de passar ao client component
  const agendamentosSer = agendamentos.map((a) => ({
    id: a.id,
    dataHora: a.dataHora.toISOString(),
    status: a.status,
    notificacaoEnviada: a.notificacaoEnviada,
    pacoteId: a.pacoteId,
    frequenciaId: a.frequenciaId,
    paciente: a.paciente,
    fisio: a.fisio,
    procedimento: a.procedimento,
  }));

  return (
    <AgendaClient
      weekStr={weekStr}
      agendamentos={agendamentosSer}
      pacientes={pacientes}
      fisios={fisios}
      procedimentos={procedimentos}
      pacotes={pacotes}
      isAdmin={isAdmin}
    />
  );
}
