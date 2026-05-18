// src/app/(app)/taping/page.tsx
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { TapingClient } from "./TapingClient";

export default async function TapingPage() {
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";

  const [tapings, pacientes, fisios] = await Promise.all([
    prisma.taping.findMany({
      include: {
        paciente: { select: { id: true, nome: true } },
        fisio: { select: { id: true, nome: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.paciente.findMany({ select: { id: true, nome: true }, orderBy: { nome: "asc" } }),
    prisma.fisioterapeuta.findMany({ select: { id: true, nome: true }, orderBy: { nome: "asc" } }),
  ]);

  const tapingsSer = tapings.map((t) => ({
    id: t.id,
    regiaCorporal: t.regiaCorporal,
    dataAplicacao: t.dataAplicacao.toISOString(),
    dataRetirada: t.dataRetirada.toISOString(),
    retirado: t.retirado,
    pacienteId: t.pacienteId,
    fisioId: t.fisioId,
    paciente: t.paciente,
    fisio: t.fisio,
  }));

  return (
    <TapingClient tapings={tapingsSer} pacientes={pacientes} fisios={fisios} isAdmin={isAdmin} />
  );
}
