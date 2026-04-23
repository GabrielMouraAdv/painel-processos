export type Urgencia = "urgente" | "proximo" | "normal";

export function diasAte(data: Date, hoje: Date = startOfDay(new Date())): number {
  const d = startOfDay(data).getTime();
  const base = hoje.getTime();
  return Math.round((d - base) / (1000 * 60 * 60 * 24));
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function urgenciaDe(data: Date, cumprido: boolean): Urgencia {
  if (cumprido) return "normal";
  const dias = diasAte(data);
  if (dias <= 7) return "urgente";
  if (dias <= 14) return "proximo";
  return "normal";
}
