import { prisma } from "@/lib/prisma";
import { ProcedimentosClient } from "./ProcedimentosClient";

export default async function ProcedimentosPage() {
  const raw = await prisma.procedimento.findMany({
    orderBy: { nome: "asc" },
  });

  const procedimentos = raw.map((p) => ({
    ...p,
    valor: p.valor.toNumber(),
  }));

  return (
    <div className="p-6">
      <ProcedimentosClient procedimentos={procedimentos} />
    </div>
  );
}
