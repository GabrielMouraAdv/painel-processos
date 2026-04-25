import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { renderToBuffer } from "@react-pdf/renderer";
import { Grau, Risco, Tribunal, type Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveEmissor } from "@/lib/escritorios-emissores";
import {
  faseLabel,
  grauLabels,
  riscoLabels,
  tribunalLabels,
} from "@/lib/processo-labels";
import {
  RelatorioGerencialDocument,
  type RelatorioGerencialData,
  type TabelaRelatorio,
} from "@/lib/relatorio-gerencial-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const url = new URL(req.url);
  const de = url.searchParams.get("de") ?? "";
  const ate = url.searchParams.get("ate") ?? "";
  const emissorSlug = url.searchParams.get("emissor") ?? "";
  const advogadoIdx = Number(url.searchParams.get("advogado") ?? "0") || 0;

  const emissorResolvido = resolveEmissor(emissorSlug, advogadoIdx);
  if (!emissorResolvido) {
    return NextResponse.json(
      { error: "escritorio emissor invalido" },
      { status: 400 },
    );
  }

  const where: Prisma.ProcessoWhereInput = {
    escritorioId,
    ...((de || ate) && {
      dataDistribuicao: {
        ...(de && { gte: new Date(de) }),
        ...(ate && { lte: new Date(`${ate}T23:59:59`) }),
      },
    }),
  };

  const [totalFiltrado, porTribunal, porRisco, porFase] = await Promise.all([
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

  const tabelas: TabelaRelatorio[] = [
    {
      titulo: "Por tribunal",
      descricao: "Distribuicao entre cortes.",
      cabecalho: ["Tribunal", "Processos"],
      linhas: linhasTribunal.map((l) => [l.tribunal, String(l.total)]),
    },
    {
      titulo: "Por risco",
      descricao: "Classificacao de risco.",
      cabecalho: ["Risco", "Processos"],
      linhas: linhasRisco.map((l) => [l.risco, String(l.total)]),
    },
    {
      titulo: "Por fase",
      descricao: "Fase atual e grau.",
      cabecalho: ["Fase", "Grau", "Processos"],
      linhas: linhasFase.map((l) => [l.fase, l.grau, String(l.total)]),
    },
  ];

  const data: RelatorioGerencialData = {
    emissor: {
      slug: emissorResolvido.escritorio.slug,
      nome: emissorResolvido.escritorio.nome,
    },
    advogadoSignatario: {
      nome: emissorResolvido.advogado.nome,
      oab: emissorResolvido.advogado.oab,
    },
    geradoEm: new Date(),
    periodo: { de: de || null, ate: ate || null },
    totalProcessos: totalFiltrado,
    tabelas,
  };

  const buffer = await renderToBuffer(
    <RelatorioGerencialDocument data={data} />,
  );
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;

  const filename = `relatorio_gerencial_${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`;

  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
