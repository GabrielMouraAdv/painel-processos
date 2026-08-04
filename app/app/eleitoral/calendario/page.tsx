import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { exigirPaginaEleitoral } from "@/lib/eleitoral-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

function parseMes(raw: string | undefined): { ano: number; mes: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(raw ?? "");
  if (m) {
    const ano = Number(m[1]);
    const mes = Number(m[2]) - 1;
    if (mes >= 0 && mes <= 11) return { ano, mes };
  }
  const agora = new Date();
  return { ano: agora.getUTCFullYear(), mes: agora.getUTCMonth() };
}

function mesParam(ano: number, mes: number): string {
  return `${ano}-${String(mes + 1).padStart(2, "0")}`;
}

export default async function EleitoralCalendarioPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await exigirPaginaEleitoral();
  const escritorioId = session.user.escritorioId;

  const { ano, mes } = parseMes(
    typeof searchParams.mes === "string" ? searchParams.mes : undefined,
  );

  const inicioMes = new Date(Date.UTC(ano, mes, 1));
  const fimMes = new Date(Date.UTC(ano, mes + 1, 0, 23, 59, 59, 999));

  const prazos = await prisma.prazoEleitoral.findMany({
    where: {
      data: { gte: inicioMes, lte: fimMes },
      processo: { escritorioId },
    },
    orderBy: { data: "asc" },
    include: {
      processo: { select: { id: true, numero: true, apelido: true } },
      responsavel: { select: { nome: true } },
    },
  });

  const porDia = new Map<number, typeof prazos>();
  for (const p of prazos) {
    const dia = p.data.getUTCDate();
    const lista = porDia.get(dia) ?? [];
    lista.push(p);
    porDia.set(dia, lista);
  }

  const primeiroDiaSemana = inicioMes.getUTCDay();
  const diasNoMes = fimMes.getUTCDate();

  const agora = new Date();
  const hojeAno = agora.getUTCFullYear();
  const hojeMes = agora.getUTCMonth();
  const hojeDia = agora.getUTCDate();

  const celulas: Array<number | null> = [
    ...Array.from({ length: primeiroDiaSemana }, () => null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ];
  while (celulas.length % 7 !== 0) celulas.push(null);

  const anterior =
    mes === 0 ? mesParam(ano - 1, 11) : mesParam(ano, mes - 1);
  const proximo = mes === 11 ? mesParam(ano + 1, 0) : mesParam(ano, mes + 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Calendario de prazos</h1>
          <p className="text-sm text-muted-foreground">
            {prazos.length} prazo(s) em {MESES[mes]} de {ano}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/app/eleitoral/calendario?mes=${anterior}`}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <span className="min-w-[160px] text-center text-sm font-semibold">
            {MESES[mes]} {ano}
          </span>
          <Button asChild variant="outline" size="sm">
            <Link href={`/app/eleitoral/calendario?mes=${proximo}`}>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[840px] rounded-md border">
          <div className="grid grid-cols-7 border-b bg-muted/50">
            {DIAS_SEMANA.map((d) => (
              <div
                key={d}
                className="px-2 py-2 text-center text-xs font-semibold uppercase text-muted-foreground"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {celulas.map((dia, idx) => {
              const ehHoje =
                dia !== null &&
                ano === hojeAno &&
                mes === hojeMes &&
                dia === hojeDia;
              const doDia = dia !== null ? (porDia.get(dia) ?? []) : [];
              return (
                <div
                  key={idx}
                  className={`min-h-[110px] border-b border-r p-1.5 ${
                    dia === null ? "bg-muted/30" : ""
                  } ${ehHoje ? "bg-amber-50" : ""}`}
                >
                  {dia !== null && (
                    <>
                      <p
                        className={`mb-1 text-right text-xs font-semibold ${
                          ehHoje ? "text-amber-700" : "text-muted-foreground"
                        }`}
                      >
                        {dia}
                      </p>
                      <div className="space-y-1">
                        {doDia.map((p) => {
                          const vencido =
                            !p.cumprido &&
                            Date.UTC(ano, mes, dia ?? 1) <
                              Date.UTC(hojeAno, hojeMes, hojeDia);
                          return (
                            <Link
                              key={p.id}
                              href={`/app/eleitoral/processos/${p.processo.id}`}
                              className={`block truncate rounded px-1.5 py-1 text-[11px] font-medium leading-tight ${
                                p.cumprido
                                  ? "bg-emerald-100 text-emerald-800"
                                  : vencido
                                    ? "bg-red-100 text-red-800"
                                    : "bg-brand-navy/10 text-brand-navy"
                              }`}
                              title={`${p.tarefa} — ${
                                p.processo.apelido ?? p.processo.numero
                              }${p.responsavel ? ` (${p.responsavel.nome})` : ""}`}
                            >
                              {p.hora ? `${p.hora} ` : ""}
                              {p.tarefa}
                              {" · "}
                              {p.processo.apelido ?? p.processo.numero}
                            </Link>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-brand-navy/10" /> Pendente
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-red-100" /> Vencido
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-emerald-100" /> Cumprido
        </span>
      </div>
    </div>
  );
}
