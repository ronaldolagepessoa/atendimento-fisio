export const DAY_NAMES_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Retorna a segunda-feira (00:00 UTC) da semana que contém dateStr (YYYY-MM-DD). */
export function getWeekStart(dateStr?: string): Date {
  const base = dateStr ? new Date(dateStr + "T00:00:00.000Z") : new Date();
  const utcDay = base.getUTCDay(); // 0=Dom
  const daysToMonday = utcDay === 0 ? -6 : 1 - utcDay;
  const monday = new Date(base);
  monday.setUTCDate(base.getUTCDate() + daysToMonday);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

/** Retorna array com os 7 dias da semana a partir de weekStart. */
export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setUTCDate(d.getUTCDate() + i);
    return d;
  });
}

/** Formata Date para string "YYYY-MM-DD" (UTC). */
export function formatISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Avança ou recua `weeks` semanas a partir de dateStr (YYYY-MM-DD), retorna nova string. */
export function offsetWeek(dateStr: string, weeks: number): string {
  const d = new Date(dateStr + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return formatISODate(d);
}

/** Formata ISO timestamp para horário em BRT ("HH:MM"). */
export function formatTimeBRT(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formata Date (UTC) para label de coluna do calendário.
 * Exemplo: Date de segunda-feira 18/05 → "Seg 18/05"
 */
export function formatDayBRT(d: Date): string {
  const day = DAY_NAMES_SHORT[d.getUTCDay()];
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day} ${dd}/${mm}`;
}

/**
 * Converte ISO UTC timestamp para valores de input date/time em BRT.
 * Usa hardcode UTC-3 (sem ajuste de horário de verão).
 */
export function isoToBRTInputs(iso: string): { date: string; time: string } {
  // Subtrai 3h do UTC para obter horário BRT representado como se fosse UTC
  const d = new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000);
  return {
    date: d.toISOString().slice(0, 10),
    time: d.toISOString().slice(11, 16),
  };
}
