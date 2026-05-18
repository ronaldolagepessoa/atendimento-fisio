"use client";

import { useState } from "react";
import { toggleProcedimentoAtivo } from "./actions";
import { ProcedimentoModal } from "./ProcedimentoModal";
import { cn } from "@/lib/utils";

type Procedimento = {
  id: string;
  nome: string;
  valor: string | number;
  ativo: boolean;
};

export function ProcedimentosClient({ procedimentos }: { procedimentos: Procedimento[] }) {
  const [modal, setModal] = useState<{ open: boolean; proc?: Procedimento }>({ open: false });

  const formatarValor = (v: string | number) =>
    Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Procedimentos</h1>
        <button
          onClick={() => setModal({ open: true })}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Novo Procedimento
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Valor</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {procedimentos.map((p) => (
              <tr key={p.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3 font-medium text-zinc-900">{p.nome}</td>
                <td className="px-4 py-3 text-zinc-600">{formatarValor(p.valor)}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      p.ativo
                        ? "bg-green-100 text-green-800"
                        : "bg-zinc-100 text-zinc-600"
                    )}
                  >
                    {p.ativo ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setModal({ open: true, proc: p })}
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      Editar
                    </button>
                    <form action={async () => { await toggleProcedimentoAtivo(p.id); }}>
                      <button
                        type="submit"
                        className={cn(
                          p.ativo ? "text-red-500 hover:text-red-700" : "text-green-600 hover:text-green-800"
                        )}
                      >
                        {p.ativo ? "Desativar" : "Ativar"}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {procedimentos.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  Nenhum procedimento cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal.open && (
        <ProcedimentoModal
          procedimento={modal.proc}
          onClose={() => setModal({ open: false })}
        />
      )}
    </>
  );
}
