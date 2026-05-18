// src/app/(app)/relatorios/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";

function getWeekBounds(semanaParam?: string) {
  let mondayUTC: Date;

  if (semanaParam && /^\d{4}-\d{2}-\d{2}$/.test(semanaParam)) {
    mondayUTC = new Date(semanaParam + "T03:00:00.000Z");
  } else {
    // Current Monday in BRT
    const nowBRT = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const day = nowBRT.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const daysToMon = day === 0 ? 6 : day - 1;
    const monBRT = new Date(nowBRT.getTime() - daysToMon * 86400000);
    mondayUTC = new Date(monBRT.toISOString().slice(0, 10) + "T03:00:00.000Z");
  }

  const weekEnd = new Date(mondayUTC);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const prevMonday = new Date(mondayUTC);
  prevMonday.setUTCDate(prevMonday.getUTCDate() - 7);
  const nextMonday = new Date(mondayUTC);
  nextMonday.setUTCDate(nextMonday.getUTCDate() + 7);

  // Convert UTC boundary back to BRT date string (subtract 3h → take YYYY-MM-DD)
  const toBRTDate = (d: Date) =>
    new Date(d.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return {
    weekStart: mondayUTC,
    weekEnd,
    mondayBRT: toBRTDate(mondayUTC),
    sundayBRT: toBRTDate(new Date(weekEnd.getTime() - 86400000)),
    prevMondayParam: toBRTDate(prevMonday),
    nextMondayParam: toBRTDate(nextMonday),
  };
}

function formatBRTDate(isoDate: string) {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const FORMA_LABEL: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "PIX",
  CARTAO: "Cartão",
  TRANSFERENCIA: "Transferência",
};

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>;
}) {
  const { semana } = await searchParams;
  const { weekStart, weekEnd, mondayBRT, sundayBRT, prevMondayParam, nextMondayParam } =
    getWeekBounds(semana);

  const now = new Date();

  const [agendamentos, pagamentos, tapingsPendentes, pacotesBaixos] = await Promise.all([
    prisma.agendamento.findMany({
      where: { dataHora: { gte: weekStart, lt: weekEnd } },
      include: { fisio: { select: { nome: true } } },
    }),
    prisma.pagamento.findMany({
      where: { dataPagamento: { gte: weekStart, lt: weekEnd } },
      select: { valor: true, forma: true },
    }),
    prisma.taping.findMany({
      where: { retirado: false, dataRetirada: { lt: now } },
      include: { paciente: { select: { nome: true } } },
      orderBy: { dataRetirada: "asc" },
    }),
    prisma.pacoteSessoes.findMany({
      where: { dataExpiracao: { gte: now } },
      include: { paciente: { select: { nome: true } } },
      orderBy: { dataExpiracao: "asc" },
    }),
  ]);

  // Session aggregation
  const realizadas = agendamentos.filter((a) => a.status === "REALIZADO").length;
  const canceladas = agendamentos.filter((a) => a.status === "CANCELADO").length;
  const faltou = agendamentos.filter((a) => a.status === "FALTOU").length;
  const agendadas = agendamentos.filter((a) => a.status === "AGENDADO").length;

  const fisioMap = new Map<string, { realizadas: number; total: number }>();
  for (const a of agendamentos) {
    const nome = a.fisio.nome;
    const cur = fisioMap.get(nome) ?? { realizadas: 0, total: 0 };
    cur.total++;
    if (a.status === "REALIZADO") cur.realizadas++;
    fisioMap.set(nome, cur);
  }
  const porFisio = Array.from(fisioMap.entries())
    .map(([nome, stats]) => ({ nome, ...stats }))
    .sort((a, b) => b.total - a.total);

  // Financial aggregation
  const totalRecebido = pagamentos.reduce((sum, p) => sum + p.valor.toNumber(), 0);
  const formaMap = new Map<string, { total: number; count: number }>();
  for (const p of pagamentos) {
    const cur = formaMap.get(p.forma) ?? { total: 0, count: 0 };
    cur.total += p.valor.toNumber();
    cur.count++;
    formaMap.set(p.forma, cur);
  }
  const porForma = Array.from(formaMap.entries()).map(([forma, stats]) => ({ forma, ...stats }));

  // Alerts
  const tapingsPendentesList = tapingsPendentes.map((t) => ({
    pacienteNome: t.paciente.nome,
    regiaCorporal: t.regiaCorporal,
    dataRetirada: t.dataRetirada.toISOString(),
  }));

  const pacotesBaixosList = pacotesBaixos
    .filter((p) => p.totalSessoes - p.sessoesUsadas <= 3)
    .map((p) => ({
      pacienteNome: p.paciente.nome,
      restantes: p.totalSessoes - p.sessoesUsadas,
      dataExpiracao: p.dataExpiracao.toISOString(),
    }));

  const totalAlertas = tapingsPendentesList.length + pacotesBaixosList.length;

  return (
    <div className="p-6 max-w-4xl space-y-6">
      {/* Header + navigation */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-zinc-900">Relatório Semanal</h1>
        <div className="flex items-center gap-3">
          <Link
            href={`/relatorios?semana=${prevMondayParam}`}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            ← Anterior
          </Link>
          <span className="text-sm font-medium text-zinc-700">
            {formatBRTDate(mondayBRT)} – {formatBRTDate(sundayBRT)}
          </span>
          <Link
            href={`/relatorios?semana=${nextMondayParam}`}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            Próxima →
          </Link>
        </div>
      </div>

      {/* Sessões */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-zinc-900">Sessões</h2>
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-zinc-50 p-3 text-center">
            <p className="text-2xl font-bold text-zinc-900">{realizadas}</p>
            <p className="text-xs text-zinc-500">Realizadas</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3 text-center">
            <p className="text-2xl font-bold text-zinc-900">{agendadas}</p>
            <p className="text-xs text-zinc-500">Agendadas</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3 text-center">
            <p className="text-2xl font-bold text-zinc-900">{canceladas}</p>
            <p className="text-xs text-zinc-500">Canceladas</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3 text-center">
            <p className="text-2xl font-bold text-zinc-900">{faltou}</p>
            <p className="text-xs text-zinc-500">Faltou</p>
          </div>
        </div>

        {porFisio.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-zinc-100">
                <th className="py-2 text-left font-medium text-zinc-500">Fisioterapeuta</th>
                <th className="py-2 text-right font-medium text-zinc-500">Realizadas</th>
                <th className="py-2 text-right font-medium text-zinc-500">Total</th>
              </tr>
            </thead>
            <tbody>
              {porFisio.map((f) => (
                <tr key={f.nome} className="border-t border-zinc-100">
                  <td className="py-2 text-zinc-700">{f.nome}</td>
                  <td className="py-2 text-right text-zinc-700">{f.realizadas}</td>
                  <td className="py-2 text-right text-zinc-500">{f.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-zinc-400">Nenhuma sessão nesta semana.</p>
        )}
      </div>

      {/* Financeiro */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-zinc-900">Financeiro</h2>
        <p className="mb-3 text-3xl font-bold text-zinc-900">{formatCurrency(totalRecebido)}</p>
        {porForma.length === 0 ? (
          <p className="text-sm text-zinc-400">Nenhum pagamento nesta semana.</p>
        ) : (
          <div className="space-y-2">
            {porForma.map((f) => (
              <div key={f.forma} className="flex items-center justify-between text-sm">
                <span className="text-zinc-600">
                  {FORMA_LABEL[f.forma] ?? f.forma} ({f.count}x)
                </span>
                <span className="font-medium text-zinc-900">{formatCurrency(f.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alertas */}
      {totalAlertas > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="mb-4 text-base font-semibold text-amber-900">
            ⚠ Alertas ({totalAlertas})
          </h2>

          {tapingsPendentesList.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-sm font-medium text-amber-800">
                Tapings para retirar ({tapingsPendentesList.length})
              </p>
              <ul className="space-y-1">
                {tapingsPendentesList.map((t, i) => (
                  <li key={i} className="text-sm text-amber-700">
                    {t.pacienteNome} — {t.regiaCorporal} (retirar desde{" "}
                    {formatDate(t.dataRetirada)})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {pacotesBaixosList.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-amber-800">
                Pacotes com poucas sessões ({pacotesBaixosList.length})
              </p>
              <ul className="space-y-1">
                {pacotesBaixosList.map((p, i) => (
                  <li key={i} className="text-sm text-amber-700">
                    {p.pacienteNome} —{" "}
                    {p.restantes === 0
                      ? "nenhuma sessão restante"
                      : `${p.restantes} sessão${p.restantes !== 1 ? "ões" : ""} restante${p.restantes !== 1 ? "s" : ""}`}{" "}
                    (expira {formatDate(p.dataExpiracao)})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
