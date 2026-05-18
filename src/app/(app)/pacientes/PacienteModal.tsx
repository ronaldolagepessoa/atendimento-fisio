"use client";

import { useActionState, useEffect } from "react";
import { createPaciente, updatePaciente } from "./actions";
import { cn } from "@/lib/utils";

type Paciente = {
  id: string;
  nome: string;
  telefone: string;
  cpf: string | null;
  dataNascimento: Date | null;
  observacoes: string | null;
};

type Props = {
  paciente?: Paciente;
  onClose: () => void;
};

export function PacienteModal({ paciente, onClose }: Props) {
  const baseAction = paciente
    ? updatePaciente.bind(null, paciente.id)
    : createPaciente;

  const wrappedAction = async (_state: unknown, formData: FormData) => {
    return baseAction(formData);
  };

  const [state, formAction, pending] = useActionState(wrappedAction, null);

  useEffect(() => {
    if (state && "success" in state) onClose();
  }, [state, onClose]);

  const dataFormatada = paciente?.dataNascimento
    ? new Date(paciente.dataNascimento).toISOString().split("T")[0]
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">
          {paciente ? "Editar Paciente" : "Novo Paciente"}
        </h2>

        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                name="nome"
                defaultValue={paciente?.nome}
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Telefone (WhatsApp) <span className="text-red-500">*</span>
              </label>
              <input
                name="telefone"
                defaultValue={paciente?.telefone}
                placeholder="(11) 99999-9999"
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">CPF</label>
              <input
                name="cpf"
                defaultValue={paciente?.cpf ?? ""}
                placeholder="000.000.000-00"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Data de nascimento
              </label>
              <input
                name="dataNascimento"
                type="date"
                defaultValue={dataFormatada}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Observações
            </label>
            <textarea
              name="observacoes"
              defaultValue={paciente?.observacoes ?? ""}
              rows={3}
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
