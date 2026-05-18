"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  getWeekStart,
  getWeekDays,
  formatDayBRT,
  formatTimeBRT,
  formatISODate,
  offsetWeek,
} from "@/lib/agenda";
import { cn } from "@/lib/utils";
import { AgendamentoModal } from "./AgendamentoModal";
import { FrequenciaModal } from "./FrequenciaModal";

export type AgendamentoSer = {
  id: string;
  dataHora: string;
  status: "AGENDADO" | "REALIZADO" | "CANCELADO" | "FALTOU";
  notificacaoEnviada: boolean;
  pacoteId: string | null;
  frequenciaId: string | null;
  paciente: { id: string; nome: string };
  fisio: { id: string; nome: string; cor: string };
  procedimento: { id: string; nome: string };
};

export type Paciente = { id: string; nome: string };
export type Fisio = { id: string; nome: string; cor: string };
export type Procedimento = { id: string; nome: string };
export type Pacote = { id: string; pacienteId: string; totalSessoes: number; sessoesUsadas: number };

type Props = {
  weekStr: string;
  agendamentos: AgendamentoSer[];
  pacientes: Paciente[];
  fisios: Fisio[];
  procedimentos: Procedimento[];
  pacotes: Pacote[];
  isAdmin: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  AGENDADO: "Agendado",
  REALIZADO: "Realizado",
  CANCELADO: "Cancelado",
  FALTOU: "Faltou",
};

const STATUS_BG: Record<string, string> = {
  AGENDADO: "bg-blue-50 text-blue-900",
  REALIZADO: "bg-green-50 text-green-900",
  CANCELADO: "bg-zinc-100 text-zinc-400",
  FALTOU: "bg-orange-50 text-orange-900",
};

const STATUS_BADGE: Record<string, string> = {
  AGENDADO: "bg-blue-100 text-blue-700",
  REALIZADO: "bg-green-100 text-green-700",
  CANCELADO: "bg-zinc-200 text-zinc-500",
  FALTOU: "bg-orange-100 text-orange-700",
};

export function AgendaClient({
  weekStr,
  agendamentos,
  pacientes,
  fisios,
  procedimentos,
  pacotes,
  isAdmin,
}: Props) {
  const router = useRouter();
  const [modal, setModal] = useState<{ open: boolean; agendamento?: AgendamentoSer }>({
    open: false,
  });
  const [freqModal, setFreqModal] = useState(false);

  const weekDays = useMemo(() => getWeekDays(getWeekStart(weekStr)), [weekStr]);

  const byDay = useMemo(() => {
    const map = new Map<string, AgendamentoSer[]>();
    for (const a of agendamentos) {
      const key = a.dataHora.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [agendamentos]);

  const todayStr = formatISODate(new Date());

  const weekLabel = (() => {
    const start = formatDayBRT(weekDays[0]).slice(4);
    const end = formatDayBRT(weekDays[6]).slice(4);
    const year = weekDays[0].getUTCFullYear();
    return `${start} – ${end} ${year}`;
  })();

  return (
    <div className="p-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Agenda</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{weekLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => router.push(`/agenda?week=${offsetWeek(weekStr, -1)}`)}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50 transition-colors"
          >
            ← Anterior
          </button>
          <button
            onClick={() => router.push(`/agenda?week=${formatISODate(getWeekStart())}`)}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50 transition-colors"
          >
            Hoje
          </button>
          <button
            onClick={() => router.push(`/agenda?week=${offsetWeek(weekStr, 1)}`)}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50 transition-colors"
          >
            Próxima →
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => setFreqModal(true)}
                className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                ↻ Frequência
              </button>
              <button
                onClick={() => setModal({ open: true })}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 transition-colors"
              >
                + Agendamento
              </button>
            </>
          )}
        </div>
      </div>

      {/* Grade semanal */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 gap-2 min-w-[700px]">
          {weekDays.map((day) => {
            const dayKey = day.toISOString().slice(0, 10);
            const dayAgendamentos = byDay.get(dayKey) ?? [];
            const isToday = dayKey === todayStr;

            return (
              <div key={dayKey}>
                <div
                  className={cn(
                    "text-center text-xs font-semibold py-2 rounded mb-1",
                    isToday
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-100 text-zinc-600"
                  )}
                >
                  {formatDayBRT(day)}
                </div>
                <div className="space-y-1 min-h-[120px] rounded-lg bg-zinc-50 p-1">
                  {dayAgendamentos.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => {
                        if (isAdmin) setModal({ open: true, agendamento: a });
                      }}
                      className={cn(
                        "w-full text-left rounded-md p-2 text-xs border-l-4 transition-all",
                        STATUS_BG[a.status],
                        isAdmin && "cursor-pointer hover:brightness-95",
                        !isAdmin && "cursor-default"
                      )}
                      style={{ borderLeftColor: a.fisio.cor }}
                    >
                      <div className="font-semibold truncate">{a.paciente.nome}</div>
                      <div className="text-zinc-500 truncate mt-0.5">
                        {formatTimeBRT(a.dataHora)} · {a.procedimento.nome}
                      </div>
                      <div className="text-zinc-400 truncate">{a.fisio.nome}</div>
                      <span
                        className={cn(
                          "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
                          STATUS_BADGE[a.status]
                        )}
                      >
                        {STATUS_LABEL[a.status]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modais */}
      {modal.open && (
        <AgendamentoModal
          agendamento={modal.agendamento}
          pacientes={pacientes}
          fisios={fisios}
          procedimentos={procedimentos}
          pacotes={pacotes}
          onClose={() => setModal({ open: false })}
        />
      )}
      {freqModal && (
        <FrequenciaModal
          pacientes={pacientes}
          fisios={fisios}
          procedimentos={procedimentos}
          onClose={() => setFreqModal(false)}
        />
      )}
    </div>
  );
}
