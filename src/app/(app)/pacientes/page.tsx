import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { PacientesClient } from "./PacientesClient";

export default async function PacientesPage() {
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";

  const pacientes = await prisma.paciente.findMany({
    orderBy: { nome: "asc" },
  });

  return (
    <div className="p-6">
      <PacientesClient pacientes={pacientes} isAdmin={isAdmin} />
    </div>
  );
}
