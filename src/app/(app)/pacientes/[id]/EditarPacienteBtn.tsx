"use client";

import { useState } from "react";
import { PacienteModal } from "../PacienteModal";

type Paciente = {
  id: string;
  nome: string;
  telefone: string;
  cpf: string | null;
  dataNascimento: string | null; // ISO string — Dates cannot cross server→client boundary
  observacoes: string | null;
};

export function EditarPacienteBtn({ paciente }: { paciente: Paciente }) {
  const [open, setOpen] = useState(false);

  // Convert ISO string back to Date for PacienteModal compatibility
  const pacienteModal = {
    ...paciente,
    dataNascimento: paciente.dataNascimento ? new Date(paciente.dataNascimento) : null,
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
      >
        Editar dados
      </button>
      {open && (
        <PacienteModal paciente={pacienteModal} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
