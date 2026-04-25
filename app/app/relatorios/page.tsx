import { getServerSession } from "next-auth";
import { Grau, Risco, Tribunal, type Prisma } from "@prisma/client";
import { FileText } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  faseLabel,
  grauLabels,
  riscoLabels,
  tribunalLabels,
} from "@/lib/processo-labels";

import { ClienteForm } from "./cliente-form";
import { PeriodoFilter } from "./periodo-filter";

function asString(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;

  const de = asString(searchParams.de);
  const ate = asString(searchParams.ate);

  const where: Prisma.ProcessoWhereInput = {
    escritorioId,
    ...((de || ate) && {
      dataDistribuicao: {
        ...(de && { gte: new Date(de) }),
        ...(ate && { lte: new Date(`${ate}T23:59:59`) }),
      },
    }),
  };

  const [
    totalFiltrado,
    porTribunal,
    porRisco,
    porFase,
    gestores,
    municipios,
  ] = await Promise.all([
    prisma.processo.count({ where }),
    prisma.processo.groupBy({
      by: ["tribunal"],
      where,
      _count: { _all: true },
    }),
    prisma.processo.groupBy({
      by: ["risco"],
      where,
      _count: { _all: true },
    }),
    prisma.processo.groupBy({
      by: ["fase", "grau"],
      where,
      _count: { _all: true },
    }),
    prisma.gestor.findMany({
      where: { escritorioId },
      select: { id: true, nome: true, cargo: true, municipio: true },
      orderBy: { nome: "asc" },
    }),
    prisma.municipio.findMany({
      where: { escritorioId },
      select: { id: true, nome: true, uf: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  const linhasTribunal = porTribunal
    .map((row) => ({
      tribunal: tribunalLabels[row.tribunal as Tribunal],
      total: row._count._all,
    }))
    .sort((a, b) => b.total - a.total);

  const linhasRisco = porRisco
    .map((row) => ({
      risco: riscoLabels[row.risco as Risco],
      total: row._count._all,
    }))
    .sort((a, b) => b.total - a.total);

  const linhasFase = porFase
    .map((row) => ({
      fase: faseLabel(row.fase),
      grau: grauLabels[row.grau as Grau],
      total: row._count._all,
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 md:px-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-navy">
            Relatorios
          </h1>
          <p className="text-sm text-muted-foreground">
            Gere relatorios de cliente para reuniao e veja agrupamentos do
            escritorio.
          </p>
        </div>
      </header>

      {/* Relatorio de Cliente */}
      <Card className="border-brand-navy/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-brand-navy">
            <FileText className="h-5 w-5" />
            Relatorio de Cliente para Reuniao
          </CardTitle>
          <CardDescription>
            Gere um relatorio completo dos processos de um gestor ou municipio
            para apresentar em reuniao.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClienteForm gestores={gestores} municipios={municipios} />
        </CardContent>
      </Card>

      {/* Relatorios gerenciais */}
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-brand-navy">
            Relatorios gerenciais
          </h2>
          <p className="text-sm text-muted-foreground">
            Agrupamentos do escritorio
            {de || ate ? " no periodo selecionado" : ""}. Total no recorte:{" "}
            <span className="font-medium text-brand-navy">{totalFiltrado}</span>
            .
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <PeriodoFilter de={de} ate={ate} />
          </CardContent>
        </Card>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Por tribunal</CardTitle>
              <CardDescription>Distribuicao entre cortes.</CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleTable
                head={["Tribunal", "Processos"]}
                rows={linhasTribunal.map((l) => [l.tribunal, String(l.total)])}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Por risco</CardTitle>
              <CardDescription>Classificacao de risco.</CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleTable
                head={["Risco", "Processos"]}
                rows={linhasRisco.map((l) => [l.risco, String(l.total)])}
              />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Por fase</CardTitle>
              <CardDescription>Fase atual e grau.</CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleTable
                head={["Fase", "Grau", "Processos"]}
                rows={linhasFase.map((l) => [l.fase, l.grau, String(l.total)])}
              />
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

function SimpleTable({
  head,
  rows,
}: {
  head: string[];
  rows: string[][];
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum dado no recorte selecionado.
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50">
            {head.map((h, i) => (
              <TableHead
                key={h}
                className={i === head.length - 1 ? "text-right" : undefined}
              >
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, idx) => (
            <TableRow key={idx}>
              {r.map((c, i) => (
                <TableCell
                  key={i}
                  className={
                    i === r.length - 1
                      ? "text-right font-medium text-brand-navy"
                      : undefined
                  }
                >
                  {c}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
