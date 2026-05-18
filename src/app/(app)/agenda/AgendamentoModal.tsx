"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { createAgendamento, updateAgendamento, deleteAgendamento } from "./actions";
import { isoToBRTInputs } from "@/lib/agenda";
import { cn } from "@/lib/utils";
import type { AgendamentoSer, Paciente, Fisio, Procedimento, Pacote } from "./AgendaClient";

type Props = {
  agendamento?: AgendamentoSer;
  pacientes: Paciente[];
  fisios: Fisio[];
  procedimentos: Procedimento[];
  pacotes: Pacote[];
  onClose: () => void;
};

type ActionResult = { success?: boolean; error?: string } | null;

export function AgendamentoModal({
  agendamento,
  pacientes,
  fisios,
  procedimentos,
  pacotes,
  onClose,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedPacienteId, setSelectedPacienteId] = useState(
    agendamento?.paciente.id ?? ""
  );

  const wrappedCreate = useCallback(
    (_state: ActionResult, fd: FormData) => createAgendamento(fd),
    []
  );
  const wrappedUpdate = useCallback(
    (_state: ActionResult, fd: FormData) => updateAgendamento(agendamento!.id, fd),
    [agendamento]
  );

  const [state, formAction, isPending] = useActionState(
    agendamento ? wrappedUpdate : wrappedCreate,
    null
  );

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    if (state?.success) onClose();
  }, [state, onClose]);

  const brtInputs = agendamento ? isoToBRTInputs(agendamento.dataHora) : null;
  const filteredPacotes = pacotes.filter((p) => p.pacienteId === selectedPacienteId);

  async function handleDelete() {
    if (!agendamento) return;
    if (!confirm("Excluir este agendamento?")) return;
    const result = await deleteAgendamento(agendamento.id);
    if ((result as { error?: string })?.error) {
      alert((result as { error?: string }).error);
      return;
    }
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="agendamento-modal-title"
      className="m-auto rounded-xl shadow-2xl p-0 w-full max-w-lg backdrop:bg-black/40"
    >
      <form action={formAction} className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="agendamento-modal-title" className="text-lg font-semibold text-zinc-900">
            {agendamento ? "Editar agendamento" : "Novo agendamento"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-zinc-400 hover:text-zinc-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {state?.error && (
          <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Paciente */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Paciente *
            </label>
            <select
              name="pacienteId"
              required
              value={selectedPacienteId}
              onChange={(e) => setSelectedPacienteId(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Selecione...</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Fisioterapeuta */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Fisioterapeuta *
            </label>
            <select
              name="fisioId"
              required
              defaultValue={agendamento?.fisio.id ?? ""}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Selecione...</option>
              {fisios.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Procedimento */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Procedimento *
            </label>
            <select
              name="procedimentoId"
              required
              defaultValue={agendamento?.procedimento.id ?? ""}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Selecione...</option>
              {procedimentos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Data */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Data *
            </label>
            <input
              type="date"
              name="data"
              required
              defaultValue={brtInputs?.date ?? ""}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Horário */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Horário *
            </label>
            <input
              type="time"
              name="hora"
              required
              defaultValue={brtInputs?.time ?? ""}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Pacote */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Pacote (opcional)
            </label>
            <select
              name="pacoteId"
              defaultValue={agendamento?.pacoteId ?? ""}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Sem pacote</option>
              {filteredPacotes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sessoesUsadas}/{p.totalSessoes} sessões usadas
                </option>
              ))}
            </select>
          </div>

          {/* Status — apenas na edição */}
          {agendamento && (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Status
              </label>
              <select
                name="status"
                defaultValue={agendamento.status}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="AGENDADO">Agendado</option>
                <option value="REALIZADO">Realizado</option>
                <option value="CANCELADO">Cancelado</option>
                <option value="FALTOU">Faltou</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          {agendamento ? (
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              Excluir
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={cn(
                "rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 transition-colors",
                isPending && "opacity-50 cursor-not-allowed"
              )}
            >
              {isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
