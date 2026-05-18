"use client";

import { useActionState, useEffect, useRef } from "react";
import { createFrequencia } from "./actions";
import { cn } from "@/lib/utils";
import type { Paciente, Fisio, Procedimento } from "./AgendaClient";

const DIAS = [
  { label: "Dom", value: 0 },
  { label: "Seg", value: 1 },
  { label: "Ter", value: 2 },
  { label: "Qua", value: 3 },
  { label: "Qui", value: 4 },
  { label: "Sex", value: 5 },
  { label: "Sáb", value: 6 },
];

type Props = {
  pacientes: Paciente[];
  fisios: Fisio[];
  procedimentos: Procedimento[];
  onClose: () => void;
};

type ActionResult = { success?: boolean; error?: string; count?: number } | null;

export function FrequenciaModal({ pacientes, fisios, procedimentos, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const wrappedAction = async (_state: ActionResult, fd: FormData) =>
    createFrequencia(fd);

  const [state, formAction, isPending] = useActionState(wrappedAction, null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-auto rounded-xl shadow-2xl p-0 w-full max-w-lg backdrop:bg-black/40"
    >
      <form action={formAction} className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">
            Nova frequência recorrente
          </h2>
          <button
            type="button"
            onClick={onClose}
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
        {state?.success && (
          <p className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
            ✓ {state.count} agendamentos gerados com sucesso.
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

          {/* Data início */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Data início *
            </label>
            <input
              type="date"
              name="dataInicio"
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Data fim */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Data fim *
            </label>
            <input
              type="date"
              name="dataFim"
              required
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
              name="horario"
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Descrição
            </label>
            <input
              type="text"
              name="descricao"
              placeholder="Ex: Pós-operatório"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Dias da semana */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Dias da semana *
            </label>
            <div className="flex gap-3 flex-wrap">
              {DIAS.map((d) => (
                <label
                  key={d.value}
                  className="flex items-center gap-1.5 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    name="diasSemana"
                    value={d.value}
                    className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-zinc-700">{d.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50 transition-colors"
          >
            Fechar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className={cn(
              "rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 transition-colors",
              isPending && "opacity-50 cursor-not-allowed"
            )}
          >
            {isPending ? "Gerando..." : "Gerar agendamentos"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
