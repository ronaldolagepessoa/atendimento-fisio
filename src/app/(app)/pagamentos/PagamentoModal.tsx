// src/app/(app)/pagamentos/PagamentoModal.tsx
"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { createPagamento, updatePagamento, deletePagamento } from "./actions";
import { PagamentoSer } from "./PagamentosClient";

type ActionResult = { error: string } | { success: boolean } | null;
type Paciente = { id: string; nome: string };
type AgendamentoLink = { id: string; dataHora: string; pacienteId: string; procedimento: { nome: string } };
type PacoteLink = { id: string; pacienteId: string; totalSessoes: number; dataInicio: string };

type Props = {
  pagamento?: PagamentoSer;
  pacientes: Paciente[];
  agendamentos: AgendamentoLink[];
  pacotes: PacoteLink[];
  isAdmin: boolean;
  onClose: () => void;
};

function todayBRT(): string {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function formatDateTimeBRT(iso: string): string {
  const d = new Date(iso);
  const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return brt.toISOString().slice(0, 16).replace("T", " ");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function PagamentoModal({ pagamento, pacientes, agendamentos, pacotes, isAdmin, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [selectedPacienteId, setSelectedPacienteId] = useState(
    pagamento?.pacienteId ?? ""
  );

  const wrappedCreate = useCallback(
    (_state: ActionResult, fd: FormData) => createPagamento(fd),
    []
  );
  const wrappedUpdate = useCallback(
    (_state: ActionResult, fd: FormData) => updatePagamento(pagamento!.id, fd),
    [pagamento]
  );

  const [state, formAction, isPending] = useActionState(
    pagamento ? wrappedUpdate : wrappedCreate,
    null
  );

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    if (state && "success" in state) onClose();
  }, [state, onClose]);

  async function handleDelete() {
    if (!pagamento) return;
    if (!confirm("Excluir este pagamento?")) return;
    const result = await deletePagamento(pagamento.id);
    if (result && "error" in result) {
      alert(result.error);
    } else {
      onClose();
    }
  }

  const filteredAgendamentos = agendamentos.filter((a) => a.pacienteId === selectedPacienteId);
  const filteredPacotes = pacotes.filter((p) => p.pacienteId === selectedPacienteId);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="pagamento-modal-title"
      onClose={onClose}
      className="w-full max-w-md rounded-2xl p-0 shadow-xl backdrop:bg-black/40"
    >
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="pagamento-modal-title" className="text-lg font-semibold text-zinc-900">
            {pagamento ? "Editar Pagamento" : "Registrar Pagamento"}
          </h2>
          <button onClick={onClose} aria-label="Fechar" className="text-zinc-400 hover:text-zinc-600">✕</button>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Paciente</label>
            {pagamento ? (
              <>
                <input type="hidden" name="pacienteId" value={pagamento.pacienteId} />
                <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                  {pagamento.paciente.nome}
                </p>
              </>
            ) : (
              <select
                name="pacienteId"
                required
                value={selectedPacienteId}
                onChange={(e) => setSelectedPacienteId(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="">Selecionar…</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Valor (R$)</label>
            <input
              type="number"
              name="valor"
              min={0.01}
              step="0.01"
              required
              defaultValue={pagamento?.valor ?? ""}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Forma</label>
            <select
              name="forma"
              required
              defaultValue={pagamento?.forma ?? "PIX"}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="DINHEIRO">Dinheiro</option>
              <option value="PIX">PIX</option>
              <option value="CARTAO">Cartão</option>
              <option value="TRANSFERENCIA">Transferência</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Data do Pagamento</label>
            <input
              type="date"
              name="dataPagamento"
              required
              defaultValue={pagamento ? pagamento.dataPagamento.slice(0, 10) : todayBRT()}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Sessão (opcional)
            </label>
            <select
              name="agendamentoId"
              defaultValue={pagamento?.agendamentoId ?? ""}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="">— sem vínculo —</option>
              {pagamento?.agendamento && (
                <option value={pagamento.agendamento.id}>
                  {pagamento.agendamento.procedimento.nome} ({formatDateTimeBRT(pagamento.agendamento.dataHora)})
                </option>
              )}
              {filteredAgendamentos
                .filter((a) => !pagamento?.agendamento || a.id !== pagamento.agendamento?.id)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.procedimento.nome} ({formatDateTimeBRT(a.dataHora)})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Pacote (opcional)
            </label>
            <select
              name="pacoteId"
              defaultValue={pagamento?.pacoteId ?? ""}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="">— sem vínculo —</option>
              {filteredPacotes.map((p) => (
                <option key={p.id} value={p.id}>
                  Pacote {p.totalSessoes}s — início {formatDate(p.dataInicio)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Observação</label>
            <textarea
              name="observacao"
              rows={2}
              defaultValue={pagamento?.observacao ?? ""}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>

          {state && "error" in state && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <div className="flex gap-3 pt-2">
            {pagamento && isAdmin && (
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Excluir
              </button>
            )}
            <button
              type="submit"
              disabled={isPending}
              className="ml-auto rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isPending ? "Salvando…" : pagamento ? "Salvar" : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
