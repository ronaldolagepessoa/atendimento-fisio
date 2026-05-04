import { auth } from "@/auth";

export async function requireAdmin() {
  const session = await auth();
  if (!session) throw new Error("Não autenticado.");
  if (session.user.role !== "ADMIN")
    throw new Error(
      "Acesso negado. Apenas a recepcionista pode realizar esta ação."
    );
  return session;
}
