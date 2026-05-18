"use client";

import { useActionState, useEffect } from "react";
import { createProcedimento, updateProcedimento } from "./actions";
import { cn } from "@/lib/utils";

type Procedimento = { id: string; nome: string; valor: string | number };

type Props = {
  procedimento?: Procedimento;
  onClose: () => void;
};

export function ProcedimentoModal({ procedimento, onClose }: Props) {
  const baseAction = procedimento
    ? updateProcedimento.bind(null, procedimento.id)
    : createProcedimento;

  const wrappedAction = async (_state: unknown, formData: FormData) => {
    return baseAction(formData);
  };

  const [state, formAction, pending] = useActionState(wrappedAction, null);

  useEffect(() => {
    if (state && "success" in state) onClose();
  }, [state, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">
          {procedimento ? "Editar Procedimento" : "Novo Procedimento"}
        </h2>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              name="nome"
              defaultValue={procedimento?.nome}
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Valor (R$) <span className="text-red-500">*</span>
            </label>
            <input
              name="valor"
              type="number"
              step="0.01"
              min="0"
              defaultValue={
                procedimento
                  ? Number(procedimento.valor).toFixed(2)
                  : ""
              }
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {state && "error" in state && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className={cn(
                "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700",
                pending && "cursor-not-allowed opacity-60"
              )}
            >
              {pending ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
