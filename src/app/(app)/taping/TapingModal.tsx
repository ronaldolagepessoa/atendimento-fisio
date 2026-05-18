// src/app/(app)/taping/TapingModal.tsx
"use client";

import { useActionState, useCallback, useEffect, useRef } from "react";
import { createTaping, updateTaping, deleteTaping } from "./actions";
import { TapingSer } from "./TapingClient";

type ActionResult = { error: string } | { success: boolean } | null;
type Paciente = { id: string; nome: string };
type Fisio = { id: string; nome: string };

type Props = {
  taping?: TapingSer;
  pacientes: Paciente[];
  fisios: Fisio[];
  isAdmin: boolean;
  onClose: () => void;
};

function todayBRT(): string {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function TapingModal({ taping, pacientes, fisios, isAdmin, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const wrappedCreate = useCallback(
    (_state: ActionResult, fd: FormData) => createTaping(fd),
    []
  );
  const wrappedUpdate = useCallback(
    (_state: ActionResult, fd: FormData) => updateTaping(taping!.id, fd),
    [taping]
  );

  const [state, formAction, isPending] = useActionState(
    taping ? wrappedUpdate : wrappedCreate,
    null
  );

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    if (state && "success" in state) onClose();
  }, [state, onClose]);

  async function handleDelete() {
    if (!taping) return;
    if (!confirm("Excluir este taping?")) return;
    const result = await deleteTaping(taping.id);
    if (result && "error" in result) {
      alert(result.error);
    } else {
      onClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="taping-modal-title"
      onClose={onClose}
      className="w-full max-w-md rounded-2xl p-0 shadow-xl backdrop:bg-black/40"
    >
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="taping-modal-title" className="text-lg font-semibold text-zinc-900">
            {taping ? "Editar Taping" : "Novo Taping"}
          </h2>
          <button onClick={onClose} aria-label="Fechar" className="text-zinc-400 hover:text-zinc-600">✕</button>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Paciente *</label>
            <select
              name="pacienteId"
              required
              defaultValue={taping?.pacienteId ?? ""}
              disabled={!!taping}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-50 disabled:text-zinc-400"
            >
              <option value="">Selecionar…</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
            {taping && (
              <input type="hidden" name="pacienteId" value={taping.pacienteId} />
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Fisioterapeuta *</label>
            <select
              name="fisioId"
              required
              defaultValue={taping?.fisioId ?? ""}
              disabled={!!taping}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-50 disabled:text-zinc-400"
            >
              <option value="">Selecionar…</option>
              {fisios.map((f) => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
            {taping && (
              <input type="hidden" name="fisioId" value={taping.fisioId} />
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Região Corporal *</label>
            <input
              type="text"
              name="regiaCorporal"
              required
              placeholder="ex: Joelho direito"
              defaultValue={taping?.regiaCorporal ?? ""}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Data de Aplicação *</label>
            <input
              type="date"
              name="dataAplicacao"
              required
              defaultValue={taping ? taping.dataAplicacao.slice(0, 10) : todayBRT()}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Data de Retirada *</label>
            <input
              type="date"
              name="dataRetirada"
              required
              defaultValue={taping ? taping.dataRetirada.slice(0, 10) : ""}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>

          {taping && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="retirado"
                name="retirado"
                value="on"
                defaultChecked={taping.retirado}
                className="h-4 w-4 rounded border-zinc-300 text-indigo-600"
              />
              <label htmlFor="retirado" className="text-sm font-medium text-zinc-700">
                Taping retirado
              </label>
            </div>
          )}

          {state && "error" in state && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <div className="flex gap-3 pt-2">
            {taping && isAdmin && (
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Excluir
              </button>
            )}
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isPending ? "Salvando…" : taping ? "Salvar" : "Registrar"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </dialog>
  );
}
