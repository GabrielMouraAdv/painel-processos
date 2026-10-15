// Datas "so de dia" (andamento, julgamento): gravadas ao meio-dia UTC.
//
// O input type="date" envia "aaaa-mm-dd"; new Date("aaaa-mm-dd") vira 00:00 UTC,
// que no Brasil (UTC-3) e 21h do dia anterior e aparecia com um dia a menos.
// Ao meio-dia UTC o dia e o mesmo em qualquer fuso do Brasil, no servidor e no navegador.

const SO_DIA = /^\d{4}-\d{2}-\d{2}$/;

export function dataDia(v: string | Date): Date {
  if (typeof v === "string" && SO_DIA.test(v)) {
    return new Date(`${v}T12:00:00.000Z`);
  }
  const d = v instanceof Date ? new Date(v.getTime()) : new Date(v);
  if (
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
  ) {
    d.setUTCHours(12);
  }
  return d;
}

const fmtRecife = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Recife",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Dia ("aaaa-mm-dd") de uma data ja gravada. Registros antigos de data pura
// estao a 00:00 UTC (vale o dia UTC); os demais valem no fuso de Recife.
export function diaDe(v: string | Date): string {
  const d = v instanceof Date ? v : new Date(v);
  const meiaNoiteUtc =
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0;
  return meiaNoiteUtc ? d.toISOString().slice(0, 10) : fmtRecife.format(d);
}

// Hoje no fuso de Recife, como "aaaa-mm-dd" (valor inicial de input type="date").
export function hojeDia(): string {
  return fmtRecife.format(new Date());
}

// Formata uma data so de dia sem depender do fuso de quem renderiza
// (servidor em UTC ou navegador em UTC-3).
export function formatarDia(
  v: string | Date | null | undefined,
  estilo: "curta" | "media" = "curta",
): string {
  if (!v) return "-";
  const meioDia = new Date(`${diaDe(v)}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(
    "pt-BR",
    estilo === "media"
      ? { dateStyle: "medium", timeZone: "UTC" }
      : { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" },
  ).format(meioDia);
}
