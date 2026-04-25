import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowRight, Landmark, Scale } from "lucide-react";

import { authOptions } from "@/lib/auth";
import { diasUteisEntre } from "@/lib/dias-uteis";
import { prisma } from "@/lib/prisma";
import { fasesEmPauta } from "@/lib/processo-labels";

export default async function ModuloHomePage() {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const em7 = new Date(hoje);
  em7.setDate(em7.getDate() + 7);
  em7.setHours(23, 59, 59, 999);
  const em15 = new Date(hoje);
  em15.setDate(em15.getDate() + 15);
  em15.setHours(23, 59, 59, 999);

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
  ] = await Promise.all([
    prisma.processo.count({ where: { escritorioId } }),
    prisma.prazo.count({
      where: { cumprido: false, processo: { escritorioId } },
    }),
    prisma.processo.count({
      where: {
        escritorioId,
        memorialPronto: false,
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
      },
    }),
    prisma.prazo.count({
      where: {
        cumprido: false,
        data: { gte: hoje, lte: em7 },
        processo: { escritorioId },
      },
    }),
    prisma.processoTce.count({ where: { escritorioId } }),
    prisma.prazoTce.count({
      where: { cumprido: false, processo: { escritorioId } },
    }),
    prisma.processoTce.count({
      where: {
        escritorioId,
        notaTecnica: true,
        contrarrazoesNtApresentadas: false,
      },
    }),
    prisma.processoTce.count({
      where: {
        escritorioId,
        parecerMpco: true,
        contrarrazoesMpcoApresentadas: false,
      },
    }),
    prisma.processoTce.count({
      where: {
        escritorioId,
        memorialPronto: false,
        faseAtual: { notIn: ["transitado", "transitado_cautelar"] },
      },
    }),
    prisma.processoTce.count({
      where: {
        escritorioId,
        memorialPronto: true,
        despachadoComRelator: false,
      },
    }),
    prisma.prazoTce.findMany({
      where: {
        cumprido: false,
        processo: { escritorioId },
        dataVencimento: { lte: em15 },
      },
      select: { dataVencimento: true },
    }),
  ]);

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

  const nome = session?.user?.name ?? "usuario";

  return (
    <div className="flex min-h-[calc(100vh-0px)] flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-6 py-10">
      <div className="w-full max-w-5xl">
        <header className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Bem-vindo, {nome}
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-brand-navy sm:text-5xl">
            Gestao Processual
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Selecione o modulo
          </p>
        </header>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Link
            href="/app/tce"
            className="group flex flex-col gap-4 rounded-xl border-2 border-brand-navy/10 bg-white p-8 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-navy/40 hover:shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-brand-navy/10 text-brand-navy">
                <Landmark className="h-7 w-7" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-brand-navy" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-brand-navy">
                Tribunal de Contas
              </h2>
              <p className="text-sm uppercase tracking-wide text-muted-foreground">
                TCE-PE
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-2 border-t pt-4">
              <Stat label="Processos TCE" value={totalTce} />
              <Stat label="Pendencias" value={totalPendenciasTce} tone="rose" />
              <Stat label="Prazos abertos" value={prazosTceAbertos} tone="red" />
            </dl>
          </Link>

          <Link
            href="/app/judicial"
            className="group flex flex-col gap-4 rounded-xl border-2 border-brand-navy/10 bg-white p-8 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-navy/40 hover:shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-brand-navy/10 text-brand-navy">
                <Scale className="h-7 w-7" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-brand-navy" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-brand-navy">
                Judicial
              </h2>
              <p className="text-sm uppercase tracking-wide text-muted-foreground">
                TJPE • TRF5 • TRF1 • STJ
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-2 border-t pt-4">
              <Stat label="Processos" value={totalJud} />
              <Stat
                label="Pendencias"
                value={totalPendenciasJud}
                tone="rose"
              />
              <Stat label="Prazos abertos" value={prazosJudAbertos} tone="red" />
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
      <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={`mt-0.5 text-xl font-semibold ${valueClass}`}>{value}</dd>
    </div>
  );
}
