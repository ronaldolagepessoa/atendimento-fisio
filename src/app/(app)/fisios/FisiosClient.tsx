"use client";

import { useState } from "react";
import { toggleFisioAtivo } from "./actions";
import { FisioModal } from "./FisioModal";
import { cn } from "@/lib/utils";

type Fisio = {
  id: string;
  nome: string;
  email: string;
  cref: string | null;
  cor: string;
  ativo: boolean;
};

export function FisiosClient({ fisios }: { fisios: Fisio[] }) {
  const [modal, setModal] = useState<{ open: boolean; fisio?: Fisio }>({ open: false });

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Fisioterapeutas</h1>
        <button
          onClick={() => setModal({ open: true })}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Novo Fisioterapeuta
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Cor</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Email</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">CREF</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {fisios.map((f) => (
              <tr key={f.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <span
                    className="inline-block h-6 w-6 rounded-full border border-zinc-200"
                    style={{ backgroundColor: f.cor }}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-zinc-900">{f.nome}</td>
                <td className="px-4 py-3 text-zinc-600">{f.email}</td>
                <td className="px-4 py-3 text-zinc-600">{f.cref ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      f.ativo
                        ? "bg-green-100 text-green-800"
                        : "bg-zinc-100 text-zinc-600"
                    )}
                  >
                    {f.ativo ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setModal({ open: true, fisio: f })}
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      Editar
                    </button>
                    <form action={async () => { await toggleFisioAtivo(f.id); }}>
                      <button
                        type="submit"
                        className={cn(
                          f.ativo ? "text-red-500 hover:text-red-700" : "text-green-600 hover:text-green-800"
                        )}
                      >
                        {f.ativo ? "Desativar" : "Ativar"}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {fisios.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  Nenhum fisioterapeuta cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal.open && (
        <FisioModal
          fisio={modal.fisio}
          onClose={() => setModal({ open: false })}
        />
      )}
    </>
  );
}
