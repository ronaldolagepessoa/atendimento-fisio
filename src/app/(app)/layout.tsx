import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-56 bg-slate-900 text-white flex flex-col p-4">
        <span className="font-bold text-lg mb-6">🏥 Fisio Clínica</span>
        <nav className="flex flex-col gap-1 text-sm text-slate-300">
          <a href="/agenda" className="hover:text-white px-3 py-2 rounded-lg hover:bg-slate-700">📅 Agenda</a>
          <a href="/pacientes" className="hover:text-white px-3 py-2 rounded-lg hover:bg-slate-700">👤 Pacientes</a>
          <a href="/taping" className="hover:text-white px-3 py-2 rounded-lg hover:bg-slate-700">🩹 Taping</a>
          {session.user.role === "ADMIN" && (
            <>
              <a href="/fisios" className="hover:text-white px-3 py-2 rounded-lg hover:bg-slate-700">🧑‍⚕️ Fisioterapeutas</a>
              <a href="/procedimentos" className="hover:text-white px-3 py-2 rounded-lg hover:bg-slate-700">💊 Procedimentos</a>
              <a href="/pacotes" className="hover:text-white px-3 py-2 rounded-lg hover:bg-slate-700">📦 Pacotes</a>
              <a href="/pagamentos" className="hover:text-white px-3 py-2 rounded-lg hover:bg-slate-700">💰 Pagamentos</a>
              <a href="/relatorios" className="hover:text-white px-3 py-2 rounded-lg hover:bg-slate-700">📊 Relatórios</a>
            </>
          )}
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
