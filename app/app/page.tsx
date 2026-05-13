import Link from "next/link";
import { getServerSession } from "next-auth";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  DollarSign,
  Landmark,
  Scale,
} from "lucide-react";

import { authOptions } from "@/lib/auth";
import { parseBancasParam } from "@/lib/bancas";
import { diasUteisEntre } from "@/lib/dias-uteis";
import {
  computeStatusNota,
  formatBRL,
  podeAcessarFinanceiro,
  STATUS_NOTA,
} from "@/lib/financeiro";
import { filtroVisibilidadeCompromissos } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { fasesEmPauta } from "@/lib/processo-labels";

export default async function ModuloHomePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;
  const bancasFiltro = parseBancasParam(searchParams.banca);
  const podeFinanceiro = podeAcessarFinanceiro(
    session!.user.role,
    session!.user.bancaSlug ?? null,
  );
  const tceBase: { escritorioId: string; bancasSlug?: { hasSome: string[] } } = {
    escritorioId,
    ...(bancasFiltro.length > 0 && {
      bancasSlug: { hasSome: bancasFiltro },
    }),
  };

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fimHoje = new Date(hoje);
  fimHoje.setHours(23, 59, 59, 999);
  const em7 = new Date(hoje);
  em7.setDate(em7.getDate() + 7);
  em7.setHours(23, 59, 59, 999);
  const em15 = new Date(hoje);
  em15.setDate(em15.getDate() + 15);
  em15.setHours(23, 59, 59, 999);
  const fimSemana = new Date(hoje);
  fimSemana.setDate(fimSemana.getDate() + (6 - hoje.getDay()));
  fimSemana.setHours(23, 59, 59, 999);

  const [
    totalJud,
    prazosJudAbertos,
    memoriaisPendJud,
    despachosPendJud,
    prazosVencendoJud,
    totalTce,
    prazosTceAbertos,
    contrarrazoesNtPend,
    contrarrazoesMpcoPend,
    memoriaisPend,
    despachosPend,
    prazosTceCandidatos,
    compromissosHojeCount,
    prazosHojeJudCount,
    prazosHojeTceCount,
    eventosSemanaCount,
    prazosVencendo7DiasJud,
    prazosVencendo7DiasTce,
  ] = await Promise.all([
    prisma.processo.count({ where: { escritorioId } }),
    prisma.prazo.count({
      where: { cumprido: false, dispensado: false, processo: { escritorioId } },
    }),
    prisma.processo.count({
      where: {
        escritorioId,
        memorialPronto: false,
        memorialDispensado: false,
        fase: { not: "transitado" },
        OR: [
          { fase: { in: fasesEmPauta } },
          { grau: { in: ["SEGUNDO", "SUPERIOR"] } },
        ],
      },
    }),
    prisma.processo.count({
      where: {
        escritorioId,
        memorialPronto: true,
        despachadoComRelator: false,
        despachoDispensado: false,
      },
    }),
    prisma.prazo.count({
      where: {
        cumprido: false,
        dispensado: false,
        data: { gte: hoje, lte: em7 },
        processo: { escritorioId },
      },
    }),
    prisma.processoTce.count({ where: tceBase }),
    prisma.prazoTce.count({
      where: { cumprido: false, dispensado: false, processo: tceBase },
    }),
    prisma.processoTce.count({
      where: {
        ...tceBase,
        julgado: false,
        notaTecnica: true,
        contrarrazoesNtApresentadas: false,
      },
    }),
    prisma.processoTce.count({
      where: {
        ...tceBase,
        julgado: false,
        parecerMpco: true,
        contrarrazoesMpcoApresentadas: false,
      },
    }),
    prisma.processoTce.count({
      where: {
        ...tceBase,
        julgado: false,
        memorialPronto: false,
        memorialDispensado: false,
        faseAtual: { notIn: ["transitado", "transitado_cautelar"] },
        tipo: {
          notIn: ["TERMO_AJUSTE_GESTAO", "PEDIDO_RESCISAO", "CONSULTA"],
        },
        OR: [
          { memorialAgendadoData: { not: null } },
          {
            prazos: {
              some: {
                cumprido: false,
                dispensado: false,
                tipo: { contains: "memorial", mode: "insensitive" },
              },
            },
          },
        ],
      },
    }),
    prisma.processoTce.count({
      where: {
        ...tceBase,
        julgado: false,
        despachadoComRelator: false,
        despachoDispensado: false,
        tipo: {
          notIn: ["TERMO_AJUSTE_GESTAO", "PEDIDO_RESCISAO", "CONSULTA"],
        },
        OR: [
          { despachoAgendadoData: { not: null } },
          { memorialPronto: true },
          {
            prazos: {
              some: {
                cumprido: false,
                dispensado: false,
                tipo: { contains: "despacho", mode: "insensitive" },
              },
            },
          },
        ],
      },
    }),
    prisma.prazoTce.findMany({
      where: {
        cumprido: false,
        dispensado: false,
        processo: tceBase,
        dataVencimento: { lte: em15 },
      },
      select: { dataVencimento: true },
    }),
    prisma.compromisso.count({
      where: {
        escritorioId,
        advogadoId: session!.user.id,
        cumprido: false,
        dataInicio: { gte: hoje, lte: fimHoje },
        ...filtroVisibilidadeCompromissos({
          id: session!.user.id,
          email: session!.user.email,
        }),
      },
    }),
    prisma.prazo.count({
      where: {
        cumprido: false,
        dispensado: false,
        data: { gte: hoje, lte: fimHoje },
        advogadoRespId: session!.user.id,
        processo: { escritorioId },
      },
    }),
    prisma.prazoTce.count({
      where: {
        cumprido: false,
        dispensado: false,
        dataVencimento: { gte: hoje, lte: fimHoje },
        advogadoRespId: session!.user.id,
        processo: { escritorioId },
      },
    }),
    prisma.compromisso.count({
      where: {
        escritorioId,
        advogadoId: session!.user.id,
        cumprido: false,
        dataInicio: { gte: hoje, lte: fimSemana },
        ...filtroVisibilidadeCompromissos({
          id: session!.user.id,
          email: session!.user.email,
        }),
      },
    }),
    prisma.prazo.count({
      where: {
        cumprido: false,
        dispensado: false,
        data: { gte: hoje, lte: em7 },
        advogadoRespId: session!.user.id,
        processo: { escritorioId },
      },
    }),
    prisma.prazoTce.count({
      where: {
        cumprido: false,
        dispensado: false,
        dataVencimento: { gte: hoje, lte: em7 },
        advogadoRespId: session!.user.id,
        processo: { escritorioId },
      },
    }),
  ]);

  const compromissosHojeTotal =
    compromissosHojeCount + prazosHojeJudCount + prazosHojeTceCount;
  const prazosVencendo7Total =
    prazosVencendo7DiasJud + prazosVencendo7DiasTce;
  const eventosSemanaTotal = eventosSemanaCount;

  const prazosTceVencendo = prazosTceCandidatos.filter(
    (p) => diasUteisEntre(hoje, p.dataVencimento) <= 7,
  ).length;
  const totalPendenciasTce =
    contrarrazoesNtPend +
    contrarrazoesMpcoPend +
    memoriaisPend +
    despachosPend +
    prazosTceVencendo;
  const totalPendenciasJud =
    memoriaisPendJud + despachosPendJud + prazosVencendoJud;

  // KPIs do card Financeiro (apenas se o usuario tem permissao)
  let financeiroKpis: {
    contratosAtivos: number;
    valorEmAberto: number;
    valorEmAtraso: number;
  } | null = null;
  if (podeFinanceiro) {
    const hojeFin = new Date();
    hojeFin.setHours(0, 0, 0, 0);
    const [contratosAtivos, notasAbertas] = await Promise.all([
      prisma.contratoMunicipal.count({
        where: {
          ativo: true,
          municipio: { escritorioId },
        },
      }),
      prisma.notaFiscal.findMany({
        where: {
          pago: false,
          contrato: { municipio: { escritorioId } },
        },
        select: { valorNota: true, dataVencimento: true, pago: true },
      }),
    ]);
    let valorEmAberto = 0;
    let valorEmAtraso = 0;
    for (const n of notasAbertas) {
      const valor = Number(n.valorNota);
      const status = computeStatusNota(
        { pago: n.pago, dataVencimento: n.dataVencimento },
        hojeFin,
      );
      if (status === STATUS_NOTA.A_VENCER) valorEmAberto += valor;
      else if (status === STATUS_NOTA.VENCIDA) valorEmAtraso += valor;
    }
    financeiroKpis = { contratosAtivos, valorEmAberto, valorEmAtraso };
  }

  const nome = session?.user?.name ?? "usuario";

  return (
    <div className="flex min-h-[calc(100vh-0px)] flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-3 sm:px-6 sm:py-5">
      <div className="w-full max-w-5xl">
        <header className="mb-3 text-center sm:mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Bem-vindo, {nome}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-brand-navy sm:text-3xl">
            Gestao Processual
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Selecione o modulo
          </p>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
          <Link
            href="/app/tce"
            className="group flex flex-col gap-3 rounded-xl border-2 border-brand-navy/10 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-navy/40 hover:shadow-lg sm:p-5"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-navy/10 text-brand-navy">
                <Landmark className="h-5 w-5" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-brand-navy" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-brand-navy">
                Tribunal de Contas
              </h2>
              <p className="text-sm uppercase tracking-wide text-muted-foreground">
                TCE-PE
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-2 border-t pt-3">
              <Stat label="Processos TCE" value={totalTce} />
              <Stat label="Pendencias" value={totalPendenciasTce} tone="rose" />
              <Stat label="Prazos abertos" value={prazosTceAbertos} tone="red" />
            </dl>
          </Link>

          <Link
            href="/app/judicial"
            className="group flex flex-col gap-3 rounded-xl border-2 border-brand-navy/10 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-navy/40 hover:shadow-lg sm:p-5"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-navy/10 text-brand-navy">
                <Scale className="h-5 w-5" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-brand-navy" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-brand-navy">
                Judicial
              </h2>
              <p className="text-sm uppercase tracking-wide text-muted-foreground">
                TJPE • TRF5 • TRF1 • STJ
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-2 border-t pt-3">
              <Stat label="Processos" value={totalJud} />
              <Stat
                label="Pendencias"
                value={totalPendenciasJud}
                tone="rose"
              />
              <Stat label="Prazos abertos" value={prazosJudAbertos} tone="red" />
            </dl>
          </Link>

          <Link
            href="/app/relatorios"
            className="group flex flex-col gap-3 rounded-xl border-2 border-brand-navy/10 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-navy/40 hover:shadow-lg sm:p-5"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-navy/10 text-brand-navy">
                <BarChart3 className="h-5 w-5" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-brand-navy" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-brand-navy">
                Relatorios
              </h2>
              <p className="text-sm uppercase tracking-wide text-muted-foreground">
                Gerencial e por cliente
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-2 border-t pt-3">
              <Stat label="Processos TCE" value={totalTce} />
              <Stat label="Processos Judiciais" value={totalJud} />
              <Stat label="Total geral" value={totalTce + totalJud} />
            </dl>
          </Link>

          {podeFinanceiro && financeiroKpis && (
            <Link
              href="/app/financeiro"
              className="group flex flex-col gap-3 rounded-xl border-2 border-brand-navy/10 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-navy/40 hover:shadow-lg sm:p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-navy/10 text-brand-navy">
                  <DollarSign className="h-5 w-5" />
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-brand-navy" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-brand-navy">
                  Financeiro
                </h2>
                <p className="text-sm uppercase tracking-wide text-muted-foreground">
                  Contratos, notas fiscais e honorarios
                </p>
              </div>
              <dl className="grid grid-cols-3 gap-2 border-t pt-3">
                <Stat
                  label="Contratos ativos"
                  value={financeiroKpis.contratosAtivos}
                />
                <StatBRL
                  label="Em aberto"
                  value={financeiroKpis.valorEmAberto}
                  tone="rose"
                />
                <StatBRL
                  label="Em atraso"
                  value={financeiroKpis.valorEmAtraso}
                  tone="red"
                />
              </dl>
            </Link>
          )}

          <Link
            href="/app/compromissos"
            className="group flex flex-col gap-3 rounded-xl border-2 border-brand-navy/10 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-navy/40 hover:shadow-lg sm:p-5 md:col-span-2"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-brand-navy" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-brand-navy">
                Compromissos
              </h2>
              <p className="text-sm uppercase tracking-wide text-muted-foreground">
                Sua agenda unificada
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-2 border-t pt-3">
              <Stat label="Compromissos hoje" value={compromissosHojeTotal} />
              <Stat
                label="Prazos em 7 dias"
                value={prazosVencendo7Total}
                tone="rose"
              />
              <Stat label="Eventos esta semana" value={eventosSemanaTotal} />
            </dl>
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "red" | "rose";
}) {
  const valueClass = {
    default: "text-brand-navy",
    red: "text-red-700",
    rose: "text-rose-700",
  }[tone];
  return (
    <div>
      <dt className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground sm:text-[10px]">
        {label}
      </dt>
      <dd className={`mt-0.5 text-lg font-semibold sm:text-xl ${valueClass}`}>
        {value}
      </dd>
    </div>
  );
}

function StatBRL({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "red" | "rose";
}) {
  const valueClass = {
    default: "text-brand-navy",
    red: "text-red-700",
    rose: "text-rose-700",
  }[tone];
  return (
    <div>
      <dt className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground sm:text-[10px]">
        {label}
      </dt>
      <dd
        className={`mt-0.5 text-sm font-semibold leading-tight sm:text-base ${valueClass}`}
      >
        {formatBRL(value)}
      </dd>
    </div>
  );
}
