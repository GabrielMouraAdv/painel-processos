import Link from "next/link";
import { getServerSession } from "next-auth";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  User,
} from "lucide-react";

import { authOptions } from "@/lib/auth";
import {
  bancasVisiveisFinanceiro,
  computeStatusNota,
  formatBRL,
  STATUS_NOTA,
} from "@/lib/financeiro";
import { prisma } from "@/lib/prisma";

export default async function FinanceiroEscolhaPage() {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;
  const bancasUsuario = bancasVisiveisFinanceiro(
    session!.user.role,
    session!.user.bancaSlug ?? null,
  );
  // Filtros base por banca do usuario logado
  const contratoBancaWhere =
    bancasUsuario === null
      ? {}
      : { bancasSlug: { hasSome: bancasUsuario } };
  const honorarioBancaWhere =
    bancasUsuario === null
      ? {}
      : { bancasSlug: { hasSome: bancasUsuario } };

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const anoAtual = hoje.getFullYear();

  const [
    contratosAtivos,
    notasAbertas,
    totalContratos,
    notasDoAno,
    honorariosPf,
  ] = await Promise.all([
    prisma.contratoMunicipal.count({
      where: {
        ativo: true,
        municipio: { escritorioId },
        ...contratoBancaWhere,
      },
    }),
    prisma.notaFiscal.findMany({
      where: {
        pago: false,
        contrato: { municipio: { escritorioId }, ...contratoBancaWhere },
      },
      select: { valorNota: true, dataVencimento: true, pago: true },
    }),
    prisma.contratoMunicipal.count({
      where: { municipio: { escritorioId }, ...contratoBancaWhere },
    }),
    prisma.notaFiscal.findMany({
      where: {
        anoReferencia: anoAtual,
        contrato: { municipio: { escritorioId }, ...contratoBancaWhere },
      },
      select: { valorNota: true, dataVencimento: true, pago: true },
    }),
    prisma.honorarioPessoal.findMany({
      where: { ...honorarioBancaWhere },
      select: {
        clienteNome: true,
        valorTotal: true,
        valorPago: true,
        pago: true,
      },
    }),
  ]);

  // Card 1 — Dashboard
  let valorEmAberto = 0;
  let valorEmAtraso = 0;
  for (const n of notasAbertas) {
    const valor = Number(n.valorNota);
    const status = computeStatusNota(
      { pago: n.pago, dataVencimento: n.dataVencimento },
      hoje,
    );
    if (status === STATUS_NOTA.A_VENCER) valorEmAberto += valor;
    else if (status === STATUS_NOTA.VENCIDA) valorEmAtraso += valor;
  }

  // Card 2 — Honorarios Municipais
  let notasPagasNoAno = 0;
  let notasEmAbertoCount = 0;
  for (const n of notasDoAno) {
    if (n.pago) notasPagasNoAno++;
    else notasEmAbertoCount++;
  }

  // Card 3 — Honorarios Pessoais
  const clientesPfSet = new Set<string>();
  let valorRecebidoPf = 0;
  let valorPendentePf = 0;
  for (const h of honorariosPf) {
    clientesPfSet.add(h.clienteNome.trim().toLowerCase());
    const valor = Number(h.valorTotal);
    const valorPago = h.valorPago ? Number(h.valorPago) : 0;
    if (h.pago) {
      valorRecebidoPf += valorPago > 0 ? valorPago : valor;
    } else {
      valorPendentePf += valor;
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-0px)] flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-6 sm:px-6 sm:py-10">
      <div className="w-full max-w-6xl">
        <div className="mb-4 flex items-center justify-start">
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Voltar
          </Link>
        </div>

        <header className="mb-6 text-center sm:mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Financeiro
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-brand-navy sm:text-5xl">
            Financeiro
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Gestao financeira do escritorio
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3">
          <Link
            href="/app/financeiro/dashboard"
            className="group flex flex-col gap-4 rounded-xl border-2 border-brand-navy/10 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-navy/40 hover:shadow-lg sm:p-8"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-brand-navy/10 text-brand-navy">
                <BarChart3 className="h-7 w-7" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-brand-navy" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-brand-navy">
                Dashboard Financeiro
              </h2>
              <p className="text-sm text-muted-foreground">
                Visao consolidada de receitas, atrasos e contratos
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-2 border-t pt-4">
              <Stat label="Contratos ativos" value={String(contratosAtivos)} />
              <Stat
                label="Em aberto"
                value={formatBRL(valorEmAberto)}
                tone="rose"
                small
              />
              <Stat
                label="Em atraso"
                value={formatBRL(valorEmAtraso)}
                tone="red"
                small
              />
            </dl>
          </Link>

          <Link
            href="/app/financeiro/municipios"
            className="group flex flex-col gap-4 rounded-xl border-2 border-brand-navy/10 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-navy/40 hover:shadow-lg sm:p-8"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-brand-navy/10 text-brand-navy">
                <Building2 className="h-7 w-7" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-brand-navy" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-brand-navy">
                Honorarios Municipais
              </h2>
              <p className="text-sm text-muted-foreground">
                Contratos mensais com municipios e orgaos publicos
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-2 border-t pt-4">
              <Stat label="Total de contratos" value={String(totalContratos)} />
              <Stat
                label={`Notas pagas ${anoAtual}`}
                value={String(notasPagasNoAno)}
                tone="emerald"
              />
              <Stat
                label="Notas em aberto"
                value={String(notasEmAbertoCount)}
                tone="rose"
              />
            </dl>
          </Link>

          <Link
            href="/app/financeiro/pessoas-fisicas"
            className="group flex flex-col gap-4 rounded-xl border-2 border-brand-navy/10 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-navy/40 hover:shadow-lg sm:p-8"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-brand-navy/10 text-brand-navy">
                <User className="h-7 w-7" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-brand-navy" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-brand-navy">
                Honorarios Pessoais
              </h2>
              <p className="text-sm text-muted-foreground">
                Honorarios por causa, sucumbencia e avulsos
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-2 border-t pt-4">
              <Stat label="Clientes PF" value={String(clientesPfSet.size)} />
              <Stat
                label="Recebido"
                value={formatBRL(valorRecebidoPf)}
                tone="emerald"
                small
              />
              <Stat
                label="Pendente"
                value={formatBRL(valorPendentePf)}
                tone="rose"
                small
              />
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
  small = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "red" | "rose" | "emerald";
  small?: boolean;
}) {
  const valueClass = {
    default: "text-brand-navy",
    red: "text-red-700",
    rose: "text-rose-700",
    emerald: "text-emerald-700",
  }[tone];
  const sizeClass = small
    ? "text-sm sm:text-base"
    : "text-lg sm:text-xl";
  return (
    <div>
      <dt className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground sm:text-[10px]">
        {label}
      </dt>
      <dd
        className={`mt-0.5 font-semibold leading-tight ${sizeClass} ${valueClass}`}
      >
        {value}
      </dd>
    </div>
  );
}
