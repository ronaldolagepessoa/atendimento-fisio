// src/app/(app)/pacotes/PacoteModal.tsx
"use client";

import { useActionState, useCallback, useEffect, useRef } from "react";
import { createPacote, updatePacote, deletePacote } from "./actions";
import { PacoteSer } from "./PacotesClient";

type ActionResult = { error: string } | { success: boolean } | null;
type Paciente = { id: string; nome: string };

type Props = {
  pacote?: PacoteSer;
  pacientes: Paciente[];
  isAdmin: boolean;
  pacienteId?: string;
  onClose: () => void;
};

function todayBRT(): string {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function PacoteModal({ pacote, pacientes, isAdmin, pacienteId, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const wrappedCreate = useCallback(
    (_state: ActionResult, fd: FormData) => createPacote(fd),
    []
  );
  const wrappedUpdate = useCallback(
    (_state: ActionResult, fd: FormData) => updatePacote(pacote!.id, fd),
    [pacote]
  );

  const [state, formAction, isPending] = useActionState(
    pacote ? wrappedUpdate : wrappedCreate,
    null
  );

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    if (state && "success" in state) onClose();
  }, [state, onClose]);

  async function handleDelete() {
    if (!pacote) return;
    if (!confirm("Excluir este pacote?")) return;
    const result = await deletePacote(pacote.id);
    if (result && "error" in result) {
      alert(result.error);
    } else {
      onClose();
    }
  }

  const preFilledPacienteId = pacienteId ?? pacote?.pacienteId;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="pacote-modal-title"
      onClose={onClose}
      className="w-full max-w-md rounded-2xl p-0 shadow-xl backdrop:bg-black/40"
    >
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="pacote-modal-title" className="text-lg font-semibold text-zinc-900">
            {pacote ? "Editar Pacote" : "Novo Pacote"}
          </h2>
          <button onClick={onClose} aria-label="Fechar" className="text-zinc-400 hover:text-zinc-600">✕</button>
        </div>

        <form action={formAction} className="space-y-4">
          {preFilledPacienteId ? (
            <input type="hidden" name="pacienteId" value={preFilledPacienteId} />
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Paciente</label>
              <select
                name="pacienteId"
                required
                defaultValue={pacote?.pacienteId ?? ""}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="">Selecionar…</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Total de Sessões</label>
            <input
              type="number"
              name="totalSessoes"
              min={1}
              required
              defaultValue={pacote?.totalSessoes ?? 10}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Data de Início</label>
            <input
              type="date"
              name="dataInicio"
              required
              defaultValue={pacote ? pacote.dataInicio.slice(0, 10) : todayBRT()}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Validade (dias)</label>
            <input
              type="number"
              name="validadeDias"
              min={1}
              required
              defaultValue={pacote?.validadeDias ?? 40}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Valor Total (R$)</label>
            <input
              type="number"
              name="valorTotal"
              min={0}
              step="0.01"
              required
              defaultValue={pacote?.valorTotal ?? ""}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>

          {state && "error" in state && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <div className="flex gap-3 pt-2">
            {pacote && isAdmin && (
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Excluir
              </button>
            )}
            <button
              type="submit"
              disabled={isPending}
              className="ml-auto rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isPending ? "Salvando…" : pacote ? "Salvar" : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
