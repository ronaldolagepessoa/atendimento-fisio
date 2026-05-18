// src/app/(app)/taping/TapingClient.tsx
"use client";

import { useState } from "react";
import { TapingModal } from "./TapingModal";

export type TapingSer = {
  id: string;
  regiaCorporal: string;
  dataAplicacao: string;
  dataRetirada: string;
  retirado: boolean;
  pacienteId: string;
  fisioId: string;
  paciente: { id: string; nome: string };
  fisio: { id: string; nome: string };
};

type Paciente = { id: string; nome: string };
type Fisio = { id: string; nome: string };

type Props = {
  tapings: TapingSer[];
  pacientes: Paciente[];
  fisios: Fisio[];
  isAdmin: boolean;
};

export function effectiveTapingStatus(t: TapingSer): "ATIVO" | "PENDENTE_RETIRADA" | "RETIRADO" {
  if (t.retirado) return "RETIRADO";
  if (new Date(t.dataRetirada) < new Date()) return "PENDENTE_RETIRADA";
  return "ATIVO";
}

const STATUS_BADGE: Record<string, string> = {
  ATIVO: "bg-emerald-100 text-emerald-700",
  PENDENTE_RETIRADA: "bg-amber-100 text-amber-700",
  RETIRADO: "bg-zinc-100 text-zinc-500",
};

const STATUS_LABEL: Record<string, string> = {
  ATIVO: "Ativo",
  PENDENTE_RETIRADA: "Retirar!",
  RETIRADO: "Retirado",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function TapingClient({ tapings, pacientes, fisios, isAdmin }: Props) {
  const [filterPacienteId, setFilterPacienteId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [editingTaping, setEditingTaping] = useState<TapingSer | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = tapings.filter((t) => {
    if (filterPacienteId && t.pacienteId !== filterPacienteId) return false;
    if (filterStatus && effectiveTapingStatus(t) !== filterStatus) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Taping</h1>
        {isAdmin && (
          <button
            onClick={() => setCreating(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + Novo Taping
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
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
        >
          <option value="">Todos os status</option>
          <option value="ATIVO">Ativo</option>
          <option value="PENDENTE_RETIRADA">Retirar!</option>
          <option value="RETIRADO">Retirado</option>
        </select>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-sm text-zinc-400">Nenhum taping encontrado.</p>
        )}
        {filtered.map((taping) => {
          const status = effectiveTapingStatus(taping);
          const isPendente = status === "PENDENTE_RETIRADA";

          return (
            <div
              key={taping.id}
              className={`rounded-xl border bg-white p-4 ${isAdmin ? "cursor-pointer hover:border-indigo-300" : ""} ${isPendente ? "border-amber-300" : "border-zinc-200"}`}
              onClick={() => isAdmin && setEditingTaping(taping)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-zinc-900 truncate">{taping.paciente.nome}</p>
                  <p className="text-sm text-zinc-700 font-medium">{taping.regiaCorporal}</p>
                  <p className="text-sm text-zinc-500">
                    {taping.fisio.nome} · Aplicado: {formatDate(taping.dataAplicacao)}
                  </p>
                  <p className={`text-sm ${isPendente ? "text-amber-600 font-medium" : "text-zinc-500"}`}>
                    Retirar: {formatDate(taping.dataRetirada)}
                    {isPendente && " ⚠ Prazo vencido"}
                  </p>
                </div>
                <div className="shrink-0">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[status]}`}>
                    {STATUS_LABEL[status]}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {creating && (
        <TapingModal
          pacientes={pacientes}
          fisios={fisios}
          isAdmin={isAdmin}
          onClose={() => setCreating(false)}
        />
      )}
      {editingTaping && (
        <TapingModal
          taping={editingTaping}
          pacientes={pacientes}
          fisios={fisios}
          isAdmin={isAdmin}
          onClose={() => setEditingTaping(null)}
        />
      )}
    </div>
  );
}
