// src/app/(app)/pacotes/PacotesClient.tsx
"use client";

import { useState } from "react";
import { PacoteModal } from "./PacoteModal";

export type PacoteSer = {
  id: string;
  totalSessoes: number;
  sessoesUsadas: number;
  dataInicio: string;
  dataExpiracao: string;
  validadeDias: number;
  valorTotal: number;
  pacienteId: string;
  paciente: { id: string; nome: string };
};

type Paciente = { id: string; nome: string };

type Props = {
  pacotes: PacoteSer[];
  pacientes: Paciente[];
  isAdmin: boolean;
};

export function effectiveStatus(p: PacoteSer): "ATIVO" | "EXPIRADO" | "ESGOTADO" {
  if (p.sessoesUsadas >= p.totalSessoes) return "ESGOTADO";
  if (new Date(p.dataExpiracao) < new Date()) return "EXPIRADO";
  return "ATIVO";
}

const STATUS_BADGE: Record<string, string> = {
  ATIVO: "bg-emerald-100 text-emerald-700",
  EXPIRADO: "bg-zinc-100 text-zinc-500",
  ESGOTADO: "bg-red-100 text-red-600",
};

const STATUS_LABEL: Record<string, string> = {
  ATIVO: "Ativo",
  EXPIRADO: "Expirado",
  ESGOTADO: "Esgotado",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PacotesClient({ pacotes, pacientes, isAdmin }: Props) {
  const [filterPacienteId, setFilterPacienteId] = useState("");
  const [editingPacote, setEditingPacote] = useState<PacoteSer | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = filterPacienteId
    ? pacotes.filter((p) => p.pacienteId === filterPacienteId)
    : pacotes;

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Pacotes de Sessões</h1>
        {isAdmin && (
          <button
            onClick={() => setCreating(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + Novo Pacote
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="mb-4">
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
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-sm text-zinc-400">Nenhum pacote encontrado.</p>
        )}
        {filtered.map((pacote) => {
          const status = effectiveStatus(pacote);
          const restantes = pacote.totalSessoes - pacote.sessoesUsadas;
          const alertBaixo = status === "ATIVO" && restantes <= 3;

          return (
            <div
              key={pacote.id}
              className={`rounded-xl border bg-white p-4 ${isAdmin ? "cursor-pointer hover:border-indigo-300" : ""} ${alertBaixo ? "border-amber-300" : "border-zinc-200"}`}
              onClick={() => isAdmin && setEditingPacote(pacote)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-zinc-900 truncate">{pacote.paciente.nome}</p>
                  <p className="text-sm text-zinc-500">
                    {pacote.sessoesUsadas}/{pacote.totalSessoes} sessões
                    {alertBaixo && (
                      <span className="ml-2 font-medium text-amber-600">
                        ⚠ {restantes} restante{restantes !== 1 ? "s" : ""}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {formatDate(pacote.dataInicio)} → {formatDate(pacote.dataExpiracao)} ({pacote.validadeDias}d)
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[status]}`}>
                    {STATUS_LABEL[status]}
                  </span>
                  <span className="text-sm font-semibold text-zinc-900">{formatCurrency(pacote.valorTotal)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {creating && (
        <PacoteModal
          pacientes={pacientes}
          isAdmin={isAdmin}
          onClose={() => setCreating(false)}
        />
      )}
      {editingPacote && (
        <PacoteModal
          pacote={editingPacote}
          pacientes={pacientes}
          isAdmin={isAdmin}
          onClose={() => setEditingPacote(null)}
        />
      )}
    </div>
  );
}
