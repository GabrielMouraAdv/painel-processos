import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { renderToBuffer } from "@react-pdf/renderer";

import { authOptions } from "@/lib/auth";
import { diasUteisEntre } from "@/lib/dias-uteis";
import {
  PendenciasTceDocument,
  type PendenciaItemPdf,
  type PendenciasTcePdfData,
  type ProcessoPendenciaPdf,
} from "@/lib/pendencias-tce-pdf";
import { prisma } from "@/lib/prisma";
import { TCE_TIPO_LABELS, faseTceLabel } from "@/lib/tce-config";
import { detectarPendencias } from "@/lib/tce-pendencias";

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

  const processos = await prisma.processoTce.findMany({
    where: { escritorioId, julgado: false },
    orderBy: [{ dataAutuacao: "desc" }],
    include: {
      municipio: { select: { nome: true, uf: true } },
      andamentos: { select: { data: true, descricao: true } },
      prazos: {
        where: { dispensado: false },
        orderBy: { dataVencimento: "asc" },
        select: {
          id: true,
          tipo: true,
          dataVencimento: true,
          cumprido: true,
        },
      },
    },
  });

  const cards: ProcessoPendenciaPdf[] = [];
  let contNt = 0;
  let contMpco = 0;
  let memCount = 0;
  let despCount = 0;

  for (const p of processos) {
    const temPrazoMemorialAberto = p.prazos.some(
      (pr) => !pr.cumprido && /memorial/i.test(pr.tipo),
    );
    const temPrazoDespachoAberto = p.prazos.some(
      (pr) => !pr.cumprido && /despacho/i.test(pr.tipo),
    );

    const prazosFiltrados = p.prazos
      .map((pr) => ({
        id: pr.id,
        tipo: pr.tipo,
        dataVencimento: pr.dataVencimento,
        cumprido: pr.cumprido,
        diasRestantes: diasUteisEntre(hoje, pr.dataVencimento),
      }))
      .filter(
        (pr) =>
          pr.cumprido ||
          (pr.diasRestantes <= 7 && pr.diasRestantes >= -30),
      );

    const pendencias = detectarPendencias(
      {
        id: p.id,
        tipo: p.tipo,
        notaTecnica: p.notaTecnica,
        parecerMpco: p.parecerMpco,
        memorialPronto: p.memorialPronto,
        despachadoComRelator: p.despachadoComRelator,
        contrarrazoesNtApresentadas: p.contrarrazoesNtApresentadas,
        contrarrazoesMpcoApresentadas: p.contrarrazoesMpcoApresentadas,
        faseAtual: p.faseAtual,
        memorialAgendadoData: p.memorialAgendadoData,
        despachoAgendadoData: p.despachoAgendadoData,
        memorialDispensado: p.memorialDispensado,
        despachoDispensado: p.despachoDispensado,
        contrarrazoesNtDispensadas: p.contrarrazoesNtDispensadas,
        contrarrazoesMpcoDispensadas: p.contrarrazoesMpcoDispensadas,
        temPrazoMemorialAberto,
        temPrazoDespachoAberto,
      },
      p.andamentos,
      prazosFiltrados,
    );

    // Filtra pendentes e exclui tipo "prazo"
    const itens: PendenciaItemPdf[] = pendencias
      .filter((pd) => !pd.concluida)
      .filter((pd) => pd.tipo !== "prazo")
      .map((pd) => ({
        tipo: pd.tipo as PendenciaItemPdf["tipo"],
        descricao: pd.descricao,
      }));

    if (itens.length === 0) continue;

    for (const it of itens) {
      if (it.tipo === "contrarrazoes_nt") contNt++;
      else if (it.tipo === "contrarrazoes_mpco") contMpco++;
      else if (it.tipo === "memorial") memCount++;
      else if (it.tipo === "despacho") despCount++;
    }

    cards.push({
      numero: p.numero,
      tipoProcesso: TCE_TIPO_LABELS[p.tipo],
      municipio: p.municipio
        ? `${p.municipio.nome}/${p.municipio.uf}`
        : null,
      exercicio: p.exercicio,
      camara: p.camara,
      faseAtual: faseTceLabel(p.tipo, p.faseAtual),
      relator: p.relator,
      pendencias: itens,
    });
  }

  const data: PendenciasTcePdfData = {
    geradoEm: new Date(),
    cards,
    resumo: {
      contrarrazoesNt: contNt,
      contrarrazoesMpco: contMpco,
      memorial: memCount,
      despacho: despCount,
      total: contNt + contMpco + memCount + despCount,
    },
  };

  const buffer = await renderToBuffer(<PendenciasTceDocument data={data} />);
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;

  const filename = `pendencias-tce-${new Date()
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
