import Link from "next/link";
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
          <Link href="/agenda" className="hover:text-white px-3 py-2 rounded-lg hover:bg-slate-700">📅 Agenda</Link>
          <Link href="/pacientes" className="hover:text-white px-3 py-2 rounded-lg hover:bg-slate-700">👤 Pacientes</Link>
          <Link href="/taping" className="hover:text-white px-3 py-2 rounded-lg hover:bg-slate-700">🩹 Taping</Link>
          {session.user.role === "ADMIN" && (
            <>
              <Link href="/fisios" className="hover:text-white px-3 py-2 rounded-lg hover:bg-slate-700">🧑‍⚕️ Fisioterapeutas</Link>
              <Link href="/procedimentos" className="hover:text-white px-3 py-2 rounded-lg hover:bg-slate-700">💊 Procedimentos</Link>
              <Link href="/pacotes" className="hover:text-white px-3 py-2 rounded-lg hover:bg-slate-700">📦 Pacotes</Link>
              <Link href="/pagamentos" className="hover:text-white px-3 py-2 rounded-lg hover:bg-slate-700">💰 Pagamentos</Link>
              <Link href="/relatorios" className="hover:text-white px-3 py-2 rounded-lg hover:bg-slate-700">📊 Relatórios</Link>
            </>
          )}
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
