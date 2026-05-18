"use client";

import { useTransition } from "react";
import { upsertCorPacienteFisio } from "../actions";

type Props = {
  pacienteId: string;
  fisioId: string;
  corAtual: string;
  isAdmin: boolean;
};

export function CorFisioForm({ pacienteId, fisioId, corAtual, isAdmin }: Props) {
  const [isPending, startTransition] = useTransition();

  if (!isAdmin) {
    return (
      <span
        className="inline-block h-6 w-6 rounded-full border border-zinc-200"
        style={{ backgroundColor: corAtual }}
      />
    );
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const novaCor = e.target.value;
    startTransition(async () => {
      await upsertCorPacienteFisio(pacienteId, fisioId, novaCor);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        defaultValue={corAtual}
        onChange={handleChange}
        disabled={isPending}
        className="h-8 w-8 cursor-pointer rounded border border-zinc-300 p-0.5"
        title="Alterar cor deste paciente para este fisio"
      />
      {isPending && <span className="text-xs text-zinc-400">Salvando…</span>}
    </div>
  );
}
