// src/app/(app)/pacotes/page.tsx
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { PacotesClient } from "./PacotesClient";

export default async function PacotesPage() {
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";

  const [pacotes, pacientes] = await Promise.all([
    prisma.pacoteSessoes.findMany({
      include: { paciente: { select: { id: true, nome: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.paciente.findMany({ select: { id: true, nome: true }, orderBy: { nome: "asc" } }),
  ]);

  const pacotesSer = pacotes.map((p) => ({
    id: p.id,
    totalSessoes: p.totalSessoes,
    sessoesUsadas: p.sessoesUsadas,
    dataInicio: p.dataInicio.toISOString(),
    dataExpiracao: p.dataExpiracao.toISOString(),
    validadeDias: p.validadeDias,
    valorTotal: p.valorTotal.toNumber(),
    pacienteId: p.pacienteId,
    paciente: p.paciente,
  }));

  return (
    <PacotesClient pacotes={pacotesSer} pacientes={pacientes} isAdmin={isAdmin} />
  );
}
