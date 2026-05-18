"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PacienteModal } from "./PacienteModal";

type Paciente = {
  id: string;
  nome: string;
  telefone: string;
  cpf: string | null;
  dataNascimento: Date | null;
  observacoes: string | null;
};

type Props = {
  pacientes: Paciente[];
  isAdmin: boolean;
};

function formatarCpf(cpf: string | null) {
  if (!cpf) return "—";
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatarData(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

export function PacientesClient({ pacientes, isAdmin }: Props) {
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState<{ open: boolean; paciente?: Paciente }>({ open: false });

  const filtrados = useMemo(
    () =>
      pacientes.filter((p) =>
        p.nome.toLowerCase().includes(busca.toLowerCase())
      ),
    [pacientes, busca]
  );

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Pacientes</h1>
        <div className="flex gap-2">
          <input
            type="search"
            placeholder="Buscar por nome…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {isAdmin && (
            <button
              onClick={() => setModal({ open: true })}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              + Novo Paciente
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Telefone</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">CPF</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Nascimento</th>
              {isAdmin && (
                <th className="px-4 py-3 text-left font-medium text-zinc-600">Ações</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtrados.map((p) => (
              <tr key={p.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/pacientes/${p.id}`}
                    className="font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    {p.nome}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-600">{p.telefone}</td>
                <td className="px-4 py-3 text-zinc-600">{formatarCpf(p.cpf)}</td>
                <td className="px-4 py-3 text-zinc-600">{formatarData(p.dataNascimento)}</td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setModal({ open: true, paciente: p })}
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      Editar
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td
                  colSpan={isAdmin ? 5 : 4}
                  className="px-4 py-8 text-center text-zinc-500"
                >
                  {busca ? "Nenhum paciente encontrado." : "Nenhum paciente cadastrado."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal.open && (
        <PacienteModal
          paciente={modal.paciente}
          onClose={() => setModal({ open: false })}
        />
      )}
    </>
  );
}
