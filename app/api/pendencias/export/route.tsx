import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { renderToBuffer } from "@react-pdf/renderer";

import { authOptions } from "@/lib/auth";
import { detectarPendenciasJud } from "@/lib/judicial-pendencias";
import {
  PendenciasJudicialDocument,
  type PendenciaItemJudPdf,
  type PendenciasJudicialPdfData,
  type ProcessoPendenciaJudPdf,
} from "@/lib/pendencias-judicial-pdf";
import { prisma } from "@/lib/prisma";
import {
  faseLabel,
  tipoLabels,
  tribunalLabels,
} from "@/lib/processo-labels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const em15 = new Date(hoje);
  em15.setDate(em15.getDate() + 15);
  em15.setHours(23, 59, 59, 999);

  const processos = await prisma.processo.findMany({
    where: { escritorioId },
    orderBy: [{ dataDistribuicao: "desc" }],
    include: {
      gestor: { select: { nome: true } },
      prazos: {
        where: {
          OR: [{ cumprido: false, data: { lte: em15 } }, { cumprido: true }],
        },
        orderBy: { data: "asc" },
        select: { id: true, tipo: true, data: true, cumprido: true },
      },
    },
  });

  function diasCorridos(data: Date): number {
    const ref = new Date(data);
    ref.setHours(0, 0, 0, 0);
    return Math.round((ref.getTime() - hoje.getTime()) / 86_400_000);
  }

  const cards: ProcessoPendenciaJudPdf[] = [];
  let memCount = 0;
  let despCount = 0;

  for (const p of processos) {
    const prazosFiltrados = p.prazos
      .map((pr) => ({
        id: pr.id,
        tipo: pr.tipo,
        data: pr.data,
        cumprido: pr.cumprido,
        diasRestantes: diasCorridos(pr.data),
      }))
      .filter(
        (pr) =>
          pr.cumprido ||
          (pr.diasRestantes <= 7 && pr.diasRestantes >= -30),
      );

    const pendencias = detectarPendenciasJud(
      {
        id: p.id,
        fase: p.fase,
        grau: p.grau,
        memorialPronto: p.memorialPronto,
        despachadoComRelator: p.despachadoComRelator,
      },
      prazosFiltrados,
    );

    const itens: PendenciaItemJudPdf[] = pendencias
      .filter((pd) => !pd.concluida)
      .filter((pd) => pd.tipo !== "prazo")
      .map((pd) => ({
        tipo: pd.tipo as PendenciaItemJudPdf["tipo"],
        descricao: pd.descricao,
      }));

    if (itens.length === 0) continue;

    for (const it of itens) {
      if (it.tipo === "memorial") memCount++;
      else if (it.tipo === "despacho") despCount++;
    }

    cards.push({
      numero: p.numero,
      tipoProcesso: tipoLabels[p.tipo],
      tribunal: tribunalLabels[p.tribunal],
      gestor: p.gestor.nome,
      fase: faseLabel(p.fase),
      pendencias: itens,
    });
  }

  const data: PendenciasJudicialPdfData = {
    geradoEm: new Date(),
    cards,
    resumo: {
      memorial: memCount,
      despacho: despCount,
      total: memCount + despCount,
    },
  };

  const buffer = await renderToBuffer(
    <PendenciasJudicialDocument data={data} />,
  );
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;

  const filename = `pendencias-judiciais-${new Date()
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
