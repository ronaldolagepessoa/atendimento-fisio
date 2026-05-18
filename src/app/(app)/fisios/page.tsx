import { prisma } from "@/lib/prisma";
import { FisiosClient } from "./FisiosClient";

export default async function FisiosPage() {
  const fisios = await prisma.fisioterapeuta.findMany({
    orderBy: { nome: "asc" },
  });

  return (
    <div className="p-6">
      <FisiosClient fisios={fisios} />
    </div>
  );
}
