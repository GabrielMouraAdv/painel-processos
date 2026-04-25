import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { renderToBuffer } from "@react-pdf/renderer";

import { authOptions } from "@/lib/auth";
import {
  PautaTceDocument,
  type ItemPautaTcePdf,
  type PautaTcePdfData,
  type SessaoTcePdf,
} from "@/lib/pauta-tce-pdf";
import { prisma } from "@/lib/prisma";
import {
  endOfWeekUTC,
  parseISODate,
  startOfWeekUTC,
} from "@/lib/semana";
import { TCE_TIPO_LABELS } from "@/lib/tce-config";
import {
  buildPautaTceWhatsApp,
  type SessaoTceExport,
} from "@/lib/tce-pauta-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

function diaSemanaLabel(d: Date): string {
  return DIAS_SEMANA[d.getUTCDay()];
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const url = new URL(req.url);
  const semana = url.searchParams.get("semana") ?? "";
  const format = url.searchParams.get("format") ?? "pdf";

  const ref = parseISODate(semana) ?? new Date();
  const weekStart = startOfWeekUTC(ref);
  const weekEnd = endOfWeekUTC(weekStart);

  const sessoes = await prisma.sessaoPauta.findMany({
    where: {
      escritorioId,
      data: { gte: weekStart, lte: weekEnd },
    },
    orderBy: [{ data: "asc" }, { camara: "asc" }],
    include: {
      itens: {
        orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
        include: {
          processoTce: { select: { tipo: true } },
        },
      },
    },
  });

  const isoWeek = weekStart.toISOString().slice(0, 10);

  if (format === "whatsapp") {
    const payload: SessaoTceExport[] = sessoes.map((s) => ({
      id: s.id,
      data: s.data,
      camara: s.camara,
      observacoesGerais: s.observacoesGerais,
      itens: s.itens.map((it) => ({
        numeroProcesso: it.numeroProcesso,
        tituloProcesso: it.tituloProcesso,
        municipio: it.municipio,
        exercicio: it.exercicio,
        relator: it.relator,
        advogadoResp: it.advogadoResp,
        situacao: it.situacao,
        observacoes: it.observacoes,
        prognostico: it.prognostico,
        providencia: it.providencia,
        retiradoDePauta: it.retiradoDePauta,
        pedidoVistas: it.pedidoVistas,
        conselheiroVistas: it.conselheiroVistas,
      })),
    }));
    const text = buildPautaTceWhatsApp(payload, weekStart, weekEnd);
    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  // PDF (default)
  const sessoesPdf: SessaoTcePdf[] = sessoes.map((s) => ({
    data: s.data,
    camara: s.camara,
    observacoesGerais: s.observacoesGerais,
    diaSemanaLabel: diaSemanaLabel(s.data),
    itens: s.itens.map<ItemPautaTcePdf>((it) => ({
      numeroProcesso: it.numeroProcesso,
      tituloProcesso: it.tituloProcesso,
      tipoProcesso: it.processoTce
        ? TCE_TIPO_LABELS[it.processoTce.tipo]
        : null,
      municipio: it.municipio,
      exercicio: it.exercicio,
      relator: it.relator,
      advogadoResp: it.advogadoResp,
      situacao: it.situacao,
      observacoes: it.observacoes,
      prognostico: it.prognostico,
      providencia: it.providencia,
      retiradoDePauta: it.retiradoDePauta,
      pedidoVistas: it.pedidoVistas,
      conselheiroVistas: it.conselheiroVistas,
    })),
  }));

  const data: PautaTcePdfData = {
    weekStart,
    weekEnd,
    sessoes: sessoesPdf,
    geradoEm: new Date(),
  };

  const buffer = await renderToBuffer(<PautaTceDocument data={data} />);
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;

  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="pauta-tce-${isoWeek}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
