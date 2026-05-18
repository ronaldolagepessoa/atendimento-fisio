"use client";

import { useActionState, useEffect } from "react";
import { createFisio, updateFisio } from "./actions";
import { cn } from "@/lib/utils";

type Fisio = {
  id: string;
  nome: string;
  email: string;
  cref: string | null;
  cor: string;
};

type Props = {
  fisio?: Fisio;
  onClose: () => void;
};

type ActionState = { error: string; success?: undefined } | { success: boolean; error?: undefined } | null;

export function FisioModal({ fisio, onClose }: Props) {
  const baseAction = fisio
    ? updateFisio.bind(null, fisio.id)
    : createFisio;

  // useActionState requires (state, formData) signature; wrap the server action
  const action = (_state: ActionState, formData: FormData) => baseAction(formData);

  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (state && "success" in state) onClose();
  }, [state, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">
          {fisio ? "Editar Fisioterapeuta" : "Novo Fisioterapeuta"}
        </h2>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              name="nome"
              defaultValue={fisio?.nome}
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              name="email"
              type="email"
              defaultValue={fisio?.email}
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">CREF</label>
            <input
              name="cref"
              defaultValue={fisio?.cref ?? ""}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Cor na agenda
            </label>
            <input
              name="cor"
              type="color"
              defaultValue={fisio?.cor ?? "#6366f1"}
              className="h-10 w-full cursor-pointer rounded-lg border border-zinc-300 p-1"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Senha {!fisio && <span className="text-red-500">*</span>}
            </label>
            <input
              name="senha"
              type="password"
              required={!fisio}
              placeholder={fisio ? "Deixe em branco para manter a senha atual" : ""}
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
