// src/app/(app)/pacientes/[id]/PacotesSection.tsx
"use client";

import { useState } from "react";
import { PacoteSer, effectiveStatus } from "../../pacotes/PacotesClient";
import { PacoteModal } from "../../pacotes/PacoteModal";

type Paciente = { id: string; nome: string };

type Props = {
  pacotes: PacoteSer[];
  pacienteId: string;
  pacienteNome: string;
  isAdmin: boolean;
};

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

export function PacotesSection({ pacotes, pacienteId, pacienteNome, isAdmin }: Props) {
  const [editingPacote, setEditingPacote] = useState<PacoteSer | null>(null);
  const [creating, setCreating] = useState(false);

  const pacienteLista: Paciente[] = [{ id: pacienteId, nome: pacienteNome }];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Pacotes de Sessões
        </h2>
        {isAdmin && (
          <button
            onClick={() => setCreating(true)}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
          >
            + Novo Pacote
          </button>
        )}
      </div>

      {pacotes.length === 0 && (
        <p className="text-sm text-zinc-400">Nenhum pacote cadastrado.</p>
      )}

      <div className="space-y-3">
        {pacotes.map((pacote) => {
          const status = effectiveStatus(pacote);
          const restantes = pacote.totalSessoes - pacote.sessoesUsadas;
          const alertBaixo = status === "ATIVO" && restantes <= 3;

          return (
            <div
              key={pacote.id}
              className={`rounded-lg border p-3 ${isAdmin ? "cursor-pointer hover:border-indigo-300" : ""} ${alertBaixo ? "border-amber-300" : "border-zinc-100"}`}
              onClick={() => isAdmin && setEditingPacote(pacote)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-700">
                    {pacote.sessoesUsadas}/{pacote.totalSessoes} sessões
                    {alertBaixo && (
                      <span className="ml-2 text-amber-600 font-medium">
                        ⚠ {restantes} restante{restantes !== 1 ? "s" : ""}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {formatDate(pacote.dataInicio)} → {formatDate(pacote.dataExpiracao)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
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
          pacientes={pacienteLista}
          pacienteId={pacienteId}
          isAdmin={isAdmin}
          onClose={() => setCreating(false)}
        />
      )}
      {editingPacote && (
        <PacoteModal
          pacote={editingPacote}
          pacientes={pacienteLista}
          pacienteId={pacienteId}
          isAdmin={isAdmin}
          onClose={() => setEditingPacote(null)}
        />
      )}
    </div>
  );
}
