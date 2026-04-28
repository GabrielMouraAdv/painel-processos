import Link from "next/link";
import { getServerSession } from "next-auth";
import { AlertCircle, Building2, FileText, TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { BANCAS, parseBancasParam } from "@/lib/bancas";
import { authOptions } from "@/lib/auth";
import {
  ANOS_DISPONIVEIS,
  computeStatusNota,
  diasEmAtraso,
  formatBRL,
  STATUS_NOTA,
} from "@/lib/financeiro";
import { prisma } from "@/lib/prisma";

import { FinanceiroFiltros } from "./financeiro-filtros";

function asString(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

export default async function FinanceiroDashboardPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;

  const anoAtual = new Date().getFullYear();
  const anoParam = parseInt(asString(searchParams.ano), 10);
  const ano = ANOS_DISPONIVEIS.includes(anoParam) ? anoParam : anoAtual;
  const bancasFiltro = parseBancasParam(searchParams.banca);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Notas do ano (com filtro de banca via contrato.bancasSlug)
  const notas = await prisma.notaFiscal.findMany({
    where: {
      anoReferencia: ano,
      contrato: {
        municipio: { escritorioId },
        ...(bancasFiltro.length > 0 && {
          bancasSlug: { hasSome: bancasFiltro },
        }),
      },
    },
    include: {
      contrato: {
        select: {
          id: true,
          bancasSlug: true,
          municipio: { select: { id: true, nome: true, uf: true } },
        },
      },
    },
    orderBy: [{ dataVencimento: "asc" }],
  });

  // Contratos ativos
  const contratosAtivos = await prisma.contratoMunicipal.count({
    where: {
      ativo: true,
      municipio: { escritorioId },
      ...(bancasFiltro.length > 0 && {
        bancasSlug: { hasSome: bancasFiltro },
      }),
    },
  });

  // KPIs
  let totalRecebido = 0;
  let totalAReceber = 0;
  let totalEmAtraso = 0;
  let qtdEmAtraso = 0;
  // Por banca
  const bancaStats = new Map<
    string,
    { recebido: number; aberto: number; atraso: number; qtdAtraso: number }
  >();
  // Por municipio (devedores)
  const devedores = new Map<
    string,
    { nome: string; uf: string; aberto: number; atraso: number }
  >();

  for (const n of notas) {
    const valor = Number(n.valorNota);
    const valorPago = n.valorPago ? Number(n.valorPago) : 0;
    const status = computeStatusNota(
      { pago: n.pago, dataVencimento: n.dataVencimento },
      hoje,
    );
    const slugs = n.contrato.bancasSlug;

    if (status === STATUS_NOTA.PAGA) {
      totalRecebido += valorPago > 0 ? valorPago : valor;
      for (const s of slugs) {
        const cur = bancaStats.get(s) ?? {
          recebido: 0,
          aberto: 0,
          atraso: 0,
          qtdAtraso: 0,
        };
        cur.recebido += valorPago > 0 ? valorPago : valor;
        bancaStats.set(s, cur);
      }
    } else if (status === STATUS_NOTA.A_VENCER) {
      totalAReceber += valor;
      for (const s of slugs) {
        const cur = bancaStats.get(s) ?? {
          recebido: 0,
          aberto: 0,
          atraso: 0,
          qtdAtraso: 0,
        };
        cur.aberto += valor;
        bancaStats.set(s, cur);
      }
    } else {
      totalEmAtraso += valor;
      qtdEmAtraso++;
      for (const s of slugs) {
        const cur = bancaStats.get(s) ?? {
          recebido: 0,
          aberto: 0,
          atraso: 0,
          qtdAtraso: 0,
        };
        cur.atraso += valor;
        cur.qtdAtraso++;
        bancaStats.set(s, cur);
      }
      const m = n.contrato.municipio;
      if (m) {
        const cur = devedores.get(m.id) ?? {
          nome: m.nome,
          uf: m.uf,
          aberto: 0,
          atraso: 0,
        };
        cur.atraso += valor;
        devedores.set(m.id, cur);
      }
    }
  }

  const maiorDevedor = Array.from(devedores.entries())
    .sort((a, b) => b[1].atraso - a[1].atraso)
    .slice(0, 1)[0];

  const notasVencidas = notas
    .filter(
      (n) =>
        computeStatusNota(
          { pago: n.pago, dataVencimento: n.dataVencimento },
          hoje,
        ) === STATUS_NOTA.VENCIDA,
    )
    .sort(
      (a, b) =>
        a.dataVencimento.getTime() - b.dataVencimento.getTime(),
    );

  const kpis = [
    {
      label: "Total Recebido (ano)",
      value: formatBRL(totalRecebido),
      icon: TrendingUp,
      tone: "emerald" as const,
    },
    {
      label: "Total a Receber",
      value: formatBRL(totalAReceber),
      icon: Wallet,
      tone: "amber" as const,
    },
    {
      label: "Em Atraso",
      value: formatBRL(totalEmAtraso),
      sub: `${qtdEmAtraso} nota${qtdEmAtraso === 1 ? "" : "s"}`,
      icon: TrendingDown,
      tone: "red" as const,
    },
    {
      label: "Contratos Ativos",
      value: String(contratosAtivos),
      icon: FileText,
      tone: "navy" as const,
    },
    {
      label: "Maior Devedor",
      value: maiorDevedor ? maiorDevedor[1].nome : "—",
      sub: maiorDevedor ? formatBRL(maiorDevedor[1].atraso) : undefined,
      icon: Building2,
      tone: "slate" as const,
    },
  ];

  const toneBg: Record<string, string> = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    red: "border-red-200 bg-red-50 text-red-900",
    navy: "border-blue-200 bg-blue-50 text-blue-900",
    slate: "border-slate-200 bg-slate-50 text-slate-800",
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-3 py-4 sm:px-6 sm:py-8 md:px-8">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Financeiro
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-brand-navy">
          Dashboard Financeiro
        </h1>
        <p className="text-sm text-muted-foreground">
          Honorarios contratuais municipais e honorarios pessoais por causa.
        </p>
      </header>

      <FinanceiroFiltros anoSelecionado={ano} />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div
              key={k.label}
              className={`flex flex-col gap-1 rounded-lg border p-4 ${toneBg[k.tone]}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
                  {k.label}
                </p>
                <Icon className="h-4 w-4 opacity-70" aria-hidden="true" />
              </div>
              <p className="text-xl font-bold leading-tight">{k.value}</p>
              {k.sub && (
                <p className="text-[11px] opacity-80">{k.sub}</p>
              )}
            </div>
          );
        })}
      </section>

      {/* Resumo por banca */}
      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-brand-navy">
          Resumo por banca ({ano})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2">Banca</th>
                <th className="py-2 text-right">Recebido</th>
                <th className="py-2 text-right">Em aberto</th>
                <th className="py-2 text-right">Em atraso</th>
              </tr>
            </thead>
            <tbody>
              {BANCAS.filter((b) => bancaStats.has(b.slug)).map((b) => {
                const s = bancaStats.get(b.slug)!;
                return (
                  <tr key={b.slug} className="border-b last:border-b-0">
                    <td className="py-2 font-medium">{b.nome}</td>
                    <td className="py-2 text-right text-emerald-700">
                      {formatBRL(s.recebido)}
                    </td>
                    <td className="py-2 text-right text-amber-700">
                      {formatBRL(s.aberto)}
                    </td>
                    <td className="py-2 text-right text-red-700">
                      {formatBRL(s.atraso)}
                    </td>
                  </tr>
                );
              })}
              {bancaStats.size === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-4 text-center text-muted-foreground"
                  >
                    Sem dados no recorte selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Notas vencidas */}
      <section className="rounded-lg border-2 border-red-200 bg-red-50 p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-900">
          <AlertCircle className="h-4 w-4" />
          Notas vencidas ({notasVencidas.length})
        </h2>
        {notasVencidas.length === 0 ? (
          <p className="text-sm text-red-800">
            Nenhuma nota vencida no recorte selecionado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-red-300 text-left text-xs uppercase tracking-wide text-red-900">
                  <th className="py-2">Municipio</th>
                  <th className="py-2">Mes/Ano</th>
                  <th className="py-2 text-right">Valor</th>
                  <th className="py-2 text-right">Vencimento</th>
                  <th className="py-2 text-right">Atraso</th>
                </tr>
              </thead>
              <tbody>
                {notasVencidas.slice(0, 20).map((n) => {
                  const dias = diasEmAtraso(n.dataVencimento, hoje);
                  return (
                    <tr
                      key={n.id}
                      className="border-b border-red-200 last:border-b-0"
                    >
                      <td className="py-2 font-medium">
                        {n.contrato.municipio?.nome ?? "—"}
                      </td>
                      <td className="py-2">
                        {String(n.mesReferencia).padStart(2, "0")}/
                        {n.anoReferencia}
                      </td>
                      <td className="py-2 text-right">
                        {formatBRL(Number(n.valorNota))}
                      </td>
                      <td className="py-2 text-right">
                        {n.dataVencimento.toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-2 text-right text-red-700">
                        {dias}d
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {notasVencidas.length > 20 && (
              <p className="mt-2 text-xs text-red-700">
                +{notasVencidas.length - 20} outras notas vencidas. Use os
                filtros para refinar ou veja em{" "}
                <Link
                  href="/app/financeiro/municipios"
                  className="underline hover:text-red-900"
                >
                  Honorarios Municipais
                </Link>
                .
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
