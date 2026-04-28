import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { renderToBuffer } from "@react-pdf/renderer";
import { Grau, Risco, Tribunal, type Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { BANCAS, parseBancasParam } from "@/lib/bancas";
import { classificarResultadoJud } from "@/lib/julgamento-config";
import { prisma } from "@/lib/prisma";
import {
  EMISSOR_SLUGS_VALIDOS,
  resolveEmissor,
} from "@/lib/escritorios-emissores";
import {
  GRAU_LABELS_PT,
  RISCO_LABELS_PT,
  faseLabelPt,
} from "@/lib/pdf-pt-br";
import { tribunalLabels } from "@/lib/processo-labels";
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
  const emissorSlug = (url.searchParams.get("emissor") ?? "").trim().toLowerCase();
  const advogadoRaw = url.searchParams.get("advogado");
  const advogadoIdx = advogadoRaw !== null ? Number(advogadoRaw) : 0;
  const bancasFiltro = parseBancasParam(url.searchParams.get("banca"));

  const emissorResolvido = resolveEmissor(emissorSlug, advogadoIdx);
  if (!emissorResolvido) {
    return NextResponse.json(
      {
        error: "escritorio emissor invalido",
        slugRecebido: emissorSlug || null,
        slugsValidos: EMISSOR_SLUGS_VALIDOS,
      },
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
    ...(bancasFiltro.length > 0 && {
      bancasSlug: { hasSome: bancasFiltro },
    }),
  };

  const [totalFiltrado, porTribunal, porRisco, porFase, julgados, bancasRaw] =
    await Promise.all([
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
      prisma.processo.findMany({
        where: { ...where, julgado: true },
        select: { tipo: true, resultadoJulgamento: true },
      }),
      prisma.processo.findMany({
        where,
        select: { bancasSlug: true },
      }),
    ]);

  // Subtotais por banca (um processo pode contar em mais de uma)
  const contagemPorBanca = new Map<string, number>();
  for (const p of bancasRaw) {
    for (const slug of p.bancasSlug) {
      contagemPorBanca.set(slug, (contagemPorBanca.get(slug) ?? 0) + 1);
    }
  }
  const semBanca = bancasRaw.filter((p) => p.bancasSlug.length === 0).length;

  const linhasTribunal = porTribunal
    .map((row) => ({
      tribunal: tribunalLabels[row.tribunal as Tribunal],
      total: row._count._all,
    }))
    .sort((a, b) => b.total - a.total);

  const linhasRisco = porRisco
    .map((row) => ({
      risco: RISCO_LABELS_PT[row.risco as Risco],
      total: row._count._all,
    }))
    .sort((a, b) => b.total - a.total);

  const linhasFase = porFase
    .map((row) => ({
      fase: faseLabelPt(row.fase),
      grau: GRAU_LABELS_PT[row.grau as Grau],
      total: row._count._all,
    }))
    .sort((a, b) => b.total - a.total);

  // Por resultado de julgamento (favoraveis vs desfavoraveis)
  let julgFavoravel = 0;
  let julgDesfavoravel = 0;
  let julgParcial = 0;
  let julgNeutro = 0;
  for (const j of julgados) {
    const c = classificarResultadoJud(j.tipo, j.resultadoJulgamento);
    if (c === "favoravel") julgFavoravel++;
    else if (c === "desfavoravel") julgDesfavoravel++;
    else if (c === "parcial") julgParcial++;
    else julgNeutro++;
  }
  const totalJulgados = julgados.length;
  const naoJulgados = totalFiltrado - totalJulgados;

  const tabelas: TabelaRelatorio[] = [
    {
      titulo: "Por tribunal",
      descricao: "Distribuição entre cortes.",
      cabecalho: ["Tribunal", "Processos"],
      linhas: linhasTribunal.map((l) => [l.tribunal, String(l.total)]),
    },
    {
      titulo: "Por risco",
      descricao: "Classificação de risco.",
      cabecalho: ["Risco", "Processos"],
      linhas: linhasRisco.map((l) => [l.risco, String(l.total)]),
    },
    {
      titulo: "Por fase",
      descricao: "Fase atual e grau.",
      cabecalho: ["Fase", "Grau", "Processos"],
      linhas: linhasFase.map((l) => [l.fase, l.grau, String(l.total)]),
    },
    {
      titulo: "Por resultado",
      descricao:
        "Distribuição de resultados nos processos já julgados (perspectiva da defesa).",
      cabecalho: ["Classificação", "Processos"],
      linhas: [
        ["Favoráveis", String(julgFavoravel)],
        ["Parciais (ressalvas)", String(julgParcial)],
        ["Desfavoráveis", String(julgDesfavoravel)],
        ["Neutros", String(julgNeutro)],
        ["Não julgados", String(naoJulgados)],
        ["Total julgados", String(totalJulgados)],
      ],
    },
    {
      titulo: "Por banca",
      descricao:
        "Subtotais por banca patrocinadora. Processos compartilhados contam em mais de uma.",
      cabecalho: ["Banca", "Processos"],
      linhas: [
        ...BANCAS.filter((b) => (contagemPorBanca.get(b.slug) ?? 0) > 0).map(
          (b) => [b.nome, String(contagemPorBanca.get(b.slug) ?? 0)],
        ),
        ...(semBanca > 0
          ? [["Sem banca vinculada", String(semBanca)] as [string, string]]
          : []),
      ],
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
