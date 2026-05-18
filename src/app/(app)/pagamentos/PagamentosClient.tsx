// src/app/(app)/pagamentos/PagamentosClient.tsx
"use client";

import { useState, useMemo } from "react";
import { PagamentoModal } from "./PagamentoModal";

export type PagamentoSer = {
  id: string;
  valor: number;
  forma: "DINHEIRO" | "PIX" | "CARTAO" | "TRANSFERENCIA";
  dataPagamento: string;
  observacao: string | null;
  pacienteId: string;
  paciente: { id: string; nome: string };
  agendamentoId: string | null;
  agendamento: { id: string; dataHora: string; procedimento: { nome: string } } | null;
  pacoteId: string | null;
  pacote: { id: string; totalSessoes: number; dataInicio: string } | null;
};

type Paciente = { id: string; nome: string };
type AgendamentoLink = { id: string; dataHora: string; pacienteId: string; procedimento: { nome: string } };
type PacoteLink = { id: string; pacienteId: string; totalSessoes: number; dataInicio: string };

type Props = {
  pagamentos: PagamentoSer[];
  pacientes: Paciente[];
  agendamentos: AgendamentoLink[];
  pacotes: PacoteLink[];
  isAdmin: boolean;
};

const FORMA_LABEL: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "PIX",
  CARTAO: "Cartão",
  TRANSFERENCIA: "Transferência",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateTimeBRT(iso: string) {
  const d = new Date(iso);
  const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return brt.toISOString().slice(0, 16).replace("T", " ");
}

export function PagamentosClient({ pagamentos, pacientes, agendamentos, pacotes, isAdmin }: Props) {
  const [filterMes, setFilterMes] = useState("");
  const [filterPacienteId, setFilterPacienteId] = useState("");
  const [editing, setEditing] = useState<PagamentoSer | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    return pagamentos.filter((p) => {
      if (filterPacienteId && p.pacienteId !== filterPacienteId) return false;
      if (filterMes && !p.dataPagamento.startsWith(filterMes)) return false;
      return true;
    });
  }, [pagamentos, filterPacienteId, filterMes]);

  const totalFiltrado = filtered.reduce((sum, p) => sum + p.valor, 0);

  const meses = useMemo(() => {
    const set = new Set(pagamentos.map((p) => p.dataPagamento.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [pagamentos]);

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Pagamentos</h1>
        {isAdmin && (
          <button
            onClick={() => setCreating(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + Registrar
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={filterPacienteId}
          onChange={(e) => setFilterPacienteId(e.target.value)}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
        >
          <option value="">Todos os pacientes</option>
          {pacientes.map((p) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
        <select
          value={filterMes}
          onChange={(e) => setFilterMes(e.target.value)}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
        >
          <option value="">Todos os meses</option>
          {meses.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        {(filterPacienteId || filterMes) && (
          <span className="self-center text-sm font-medium text-zinc-700">
            Total: {formatCurrency(totalFiltrado)}
          </span>
        )}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-sm text-zinc-400">Nenhum pagamento encontrado.</p>
        )}
        {filtered.map((pag) => (
          <div
            key={pag.id}
            className={`flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 ${isAdmin ? "cursor-pointer hover:border-indigo-300" : ""}`}
            onClick={() => isAdmin && setEditing(pag)}
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-zinc-900 truncate">{pag.paciente.nome}</p>
              <p className="text-sm text-zinc-500">
                {FORMA_LABEL[pag.forma]} · {formatDate(pag.dataPagamento)}
                {pag.agendamento && (
                  <span> · {pag.agendamento.procedimento.nome} ({formatDateTimeBRT(pag.agendamento.dataHora)})</span>
                )}
                {pag.pacote && !pag.agendamento && (
                  <span> · Pacote {pag.pacote.totalSessoes}s</span>
                )}
              </p>
            </div>
            <span className="ml-4 shrink-0 font-semibold text-zinc-900">{formatCurrency(pag.valor)}</span>
          </div>
        ))}
      </div>

      {creating && (
        <PagamentoModal
          pacientes={pacientes}
          agendamentos={agendamentos}
          pacotes={pacotes}
          isAdmin={isAdmin}
          onClose={() => setCreating(false)}
        />
      )}
      {editing && (
        <PagamentoModal
          pagamento={editing}
          pacientes={pacientes}
          agendamentos={agendamentos}
          pacotes={pacotes}
          isAdmin={isAdmin}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
