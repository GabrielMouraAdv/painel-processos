const FERIADOS = new Set<string>([
  "2025-01-01",
  "2025-03-03",
  "2025-03-04",
  "2025-04-18",
  "2025-04-21",
  "2025-05-01",
  "2025-06-19",
  "2025-09-07",
  "2025-10-12",
  "2025-11-02",
  "2025-11-15",
  "2025-12-25",
  "2026-01-01",
  "2026-02-16",
  "2026-02-17",
  "2026-04-03",
  "2026-04-21",
  "2026-05-01",
  "2026-06-04",
  "2026-09-07",
  "2026-10-12",
  "2026-11-02",
  "2026-11-15",
  "2026-12-25",
  "2027-01-01",
  "2027-02-08",
  "2027-02-09",
  "2027-03-26",
  "2027-04-21",
  "2027-05-01",
  "2027-05-27",
  "2027-09-07",
  "2027-10-12",
  "2027-11-02",
  "2027-11-15",
  "2027-12-25",
]);

function toIsoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDayLocal(d: Date | string): Date {
  const base = typeof d === "string" ? new Date(`${d}T00:00:00`) : new Date(d);
  base.setHours(0, 0, 0, 0);
  return base;
}

export function ehDiaUtil(data: Date | string): boolean {
  const d = startOfDayLocal(data);
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return false;
  if (FERIADOS.has(toIsoDay(d))) return false;
  return true;
}

export function calcularDataVencimento(
  dataInicio: Date | string,
  diasUteis: number,
): Date {
  const d = startOfDayLocal(dataInicio);
  let restantes = diasUteis;
  while (restantes > 0) {
    d.setDate(d.getDate() + 1);
    if (ehDiaUtil(d)) restantes--;
  }
  return d;
}

export function diasUteisEntre(
  dataInicio: Date | string,
  dataFim: Date | string,
): number {
  const a = startOfDayLocal(dataInicio);
  const b = startOfDayLocal(dataFim);
  const sinal = b.getTime() < a.getTime() ? -1 : 1;
  const inicio = sinal === 1 ? a : b;
  const fim = sinal === 1 ? b : a;
  let dias = 0;
  const cursor = new Date(inicio);
  while (cursor.getTime() < fim.getTime()) {
    cursor.setDate(cursor.getDate() + 1);
    if (ehDiaUtil(cursor)) dias++;
  }
  return dias * sinal;
}

export function diasUteisRestantes(
  dataFim: Date | string,
  hoje: Date = new Date(),
): number {
  return diasUteisEntre(hoje, dataFim);
}
