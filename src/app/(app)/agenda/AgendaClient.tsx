"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getWeekStart,
  getWeekDays,
  formatISODate,
  offsetWeek,
  slotIndex,
  slotToLocalISO,
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

const START_HOUR = 7;
const END_HOUR = 18;
const SLOT_COUNT = (END_HOUR - START_HOUR) * 2; // 22

const TIME_SLOTS = Array.from({ length: SLOT_COUNT }, (_, i) => ({
  hour: START_HOUR + Math.floor(i / 2),
  minutes: (i % 2) * 30,
  label: i % 2 === 0 ? `${String(START_HOUR + Math.floor(i / 2)).padStart(2, "0")}h` : "",
  isHalf: i % 2 === 1,
}));

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

const STATUS_LEGEND = [
  { key: "AGENDADO", label: "Agendado", cls: "bg-blue-100" },
  { key: "REALIZADO", label: "Realizado", cls: "bg-green-100" },
  { key: "FALTOU", label: "Faltou", cls: "bg-orange-100" },
  { key: "CANCELADO", label: "Cancelado", cls: "bg-zinc-200" },
];

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
  const [modal, setModal] = useState<{
    open: boolean;
    agendamento?: AgendamentoSer;
    defaultDataHora?: string;
  }>({ open: false });
  const [freqModal, setFreqModal] = useState(false);
  const [nowSlot, setNowSlot] = useState<{ si: number; pct: number } | null>(null);

  const weekStart = useMemo(() => getWeekStart(weekStr), [weekStr]);
  // Seg–Sáb: primeiros 6 dias da semana (índices 0–5, Dom é índice 6)
  const weekDays = useMemo(() => getWeekDays(weekStart).slice(0, 6), [weekStart]);

  // Map: "YYYY-MM-DD_slotIdx" → AgendamentoSer[]
  const byDaySlot = useMemo(() => {
    const map = new Map<string, AgendamentoSer[]>();
    for (const a of agendamentos) {
      const dayKey = a.dataHora.slice(0, 10);
      const si = slotIndex(a.dataHora);
      if (si < 0 || si >= SLOT_COUNT) continue;
      const key = `${dayKey}_${si}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [agendamentos]);

  const todayStr = formatISODate(new Date());
  const currentWeekStr = formatISODate(getWeekStart());
  const isCurrentWeek = weekStr === currentWeekStr;

  // Indicador de hora atual — atualiza a cada minuto
  useEffect(() => {
    if (!isCurrentWeek) {
      setNowSlot(null);
      return;
    }
    const update = () => {
      const brt = new Date(Date.now() - 3 * 60 * 60 * 1000);
      const h = brt.getUTCHours();
      const m = brt.getUTCMinutes();
      if (h < START_HOUR || h >= END_HOUR) { setNowSlot(null); return; }
      setNowSlot({
        si: (h - START_HOUR) * 2 + (m >= 30 ? 1 : 0),
        pct: ((m % 30) / 30) * 100,
      });
    };
    update();
    const t = setInterval(update, 60_000);
    return () => clearInterval(t);
  }, [isCurrentWeek]);

  const weekLabel = (() => {
    const start = weekDays[0];
    const end = weekDays[5];
    const fmt = (d: Date) =>
      `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    return `${fmt(start)} – ${fmt(end)} ${start.getUTCFullYear()}`;
  })();

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex-shrink-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-white border-b border-zinc-200">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Agenda</h1>
          <p className="text-xs text-zinc-500 mt-0.5">{weekLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => router.push(`/agenda?week=${offsetWeek(weekStr, -1)}`)}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50 transition-colors"
          >
            ← Anterior
          </button>
          <button
            onClick={() => router.push(`/agenda?week=${currentWeekStr}`)}
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

      {/* Grade calendário */}
      <div className="flex-1 overflow-auto">
        <div
          className="grid"
          style={{ gridTemplateColumns: "52px repeat(6, minmax(100px, 1fr))", minWidth: "700px" }}
        >
          {/* Corner sticky */}
          <div className="sticky top-0 z-10 bg-white border-b-2 border-zinc-200" />

          {/* Cabeçalho dos dias — sticky */}
          {weekDays.map((day) => {
            const dayKey = day.toISOString().slice(0, 10);
            const isToday = dayKey === todayStr;
            return (
              <div
                key={dayKey}
                className={cn(
                  "sticky top-0 z-10 bg-white border-b-2 border-zinc-200 border-r border-r-zinc-100",
                  "flex flex-col items-center justify-center py-2 gap-0.5"
                )}
              >
                <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium">
                  {["seg", "ter", "qua", "qui", "sex", "sáb"][day.getUTCDay() === 0 ? 6 : day.getUTCDay() - 1]}
                </span>
                <span
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold",
                    isToday ? "bg-indigo-600 text-white" : "text-zinc-700"
                  )}
                >
                  {day.getUTCDate()}
                </span>
              </div>
            );
          })}

          {/* Linhas de horário */}
          {TIME_SLOTS.map((slot, si) => (
            <React.Fragment key={si}>
              {/* Rótulo de hora */}
              <div
                key={`tl-${si}`}
                className={cn(
                  "flex items-start justify-end pr-2 pt-1 text-[10px] text-zinc-400 font-medium",
                  "border-r border-zinc-200 bg-white",
                  slot.isHalf
                    ? "border-b border-dashed border-zinc-100 h-10"
                    : "border-b border-zinc-100 h-10"
                )}
              >
                {slot.label}
              </div>

              {/* Células dos dias */}
              {weekDays.map((day) => {
                const dayKey = day.toISOString().slice(0, 10);
                const isToday = dayKey === todayStr;
                const cellAppts = byDaySlot.get(`${dayKey}_${si}`) ?? [];
                const showNow = isCurrentWeek && isToday && nowSlot?.si === si;

                return (
                  <div
                    key={`${dayKey}-${si}`}
                    className={cn(
                      "relative h-10 border-r border-zinc-100 group",
                      slot.isHalf
                        ? "border-b border-dashed border-zinc-100"
                        : "border-b border-zinc-100",
                      isToday && "bg-indigo-50/30",
                      isAdmin && cellAppts.length === 0 && "cursor-pointer hover:bg-indigo-50/60"
                    )}
                    onClick={() => {
                      if (isAdmin && cellAppts.length === 0) {
                        setModal({ open: true, defaultDataHora: slotToLocalISO(dayKey, si) });
                      }
                    }}
                  >
                    {/* Hint "+" em slot vazio */}
                    {isAdmin && cellAppts.length === 0 && (
                      <span className="absolute inset-0 flex items-center justify-center text-indigo-300 text-lg opacity-0 group-hover:opacity-100 pointer-events-none select-none">
                        +
                      </span>
                    )}

                    {/* Cards de agendamento */}
                    {cellAppts.map((a, ai) => {
                      const total = cellAppts.length;
                      const pctW = total > 1 ? `${Math.floor(90 / total)}%` : undefined;
                      const pctL = total > 1 ? `${3 + ai * (Math.floor(90 / total) + 2)}%` : "3px";
                      return (
                        <div
                          key={a.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isAdmin) setModal({ open: true, agendamento: a });
                          }}
                          className={cn(
                            "absolute top-[2px] bottom-[2px] rounded-md border-l-[3px] px-1.5 py-0.5 overflow-hidden",
                            "shadow-sm transition-all z-10",
                            isAdmin && "cursor-pointer hover:brightness-95 hover:shadow-md",
                            !isAdmin && "cursor-default",
                            STATUS_BG[a.status]
                          )}
                          style={{
                            borderLeftColor: a.fisio.cor,
                            left: pctL,
                            right: total > 1 ? "auto" : "3px",
                            width: pctW,
                          }}
                        >
                          <div className="text-[10px] font-semibold truncate leading-tight">
                            {a.paciente.nome}
                          </div>
                          <div className="text-[9px] text-zinc-500 truncate leading-tight">
                            {String(slot.hour).padStart(2, "0")}:{String(slot.minutes).padStart(2, "0")} · {a.procedimento.nome}
                          </div>
                          <span
                            className={cn(
                              "inline-block rounded-full px-1.5 py-px text-[8px] font-semibold leading-tight mt-0.5",
                              STATUS_BADGE[a.status]
                            )}
                          >
                            {STATUS_LABEL[a.status]}
                          </span>
                        </div>
                      );
                    })}

                    {/* Linha de hora atual */}
                    {showNow && (
                      <div
                        className="absolute left-0 right-0 z-20 pointer-events-none"
                        style={{ top: `${nowSlot!.pct}%` }}
                      >
                        <div className="relative h-0.5 bg-red-500">
                          <div className="absolute -left-1 -top-[3px] w-2.5 h-2.5 rounded-full bg-red-500" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 bg-white border-t border-zinc-200 text-xs text-zinc-500 flex-wrap">
        <span className="font-semibold text-zinc-400">Fisios:</span>
        {fisios.map((f) => (
          <span key={f.id} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: f.cor }} />
            {f.nome}
          </span>
        ))}
        <span className="font-semibold text-zinc-400 ml-2">Status:</span>
        {STATUS_LEGEND.map(({ key, label, cls }) => (
          <span key={key} className="flex items-center gap-1">
            <span className={cn("w-3 h-2 rounded inline-block", cls)} />
            {label}
          </span>
        ))}
      </div>

      {/* Modais */}
      {modal.open && (
        <AgendamentoModal
          agendamento={modal.agendamento}
          defaultDataHora={modal.defaultDataHora}
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
