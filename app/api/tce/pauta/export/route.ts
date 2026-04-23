import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  endOfWeekUTC,
  parseISODate,
  startOfWeekUTC,
} from "@/lib/semana";
import {
  buildPautaTceDocx,
  buildPautaTceWhatsApp,
  type SessaoTceExport,
} from "@/lib/tce-pauta-export";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const url = new URL(req.url);
  const semana = url.searchParams.get("semana") ?? "";
  const format = url.searchParams.get("format") ?? "docx";

  const ref = parseISODate(semana) ?? new Date();
  const weekStart = startOfWeekUTC(ref);
  const weekEnd = endOfWeekUTC(weekStart);

  const sessoes = await prisma.sessaoPauta.findMany({
    where: {
      escritorioId,
      data: { gte: weekStart, lte: weekEnd },
    },
    orderBy: [{ camara: "asc" }, { data: "asc" }],
    include: {
      itens: {
        orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
      },
    },
  });

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

  const isoWeek = weekStart.toISOString().slice(0, 10);

  if (format === "whatsapp") {
    const text = buildPautaTceWhatsApp(payload, weekStart, weekEnd);
    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  const buffer = await buildPautaTceDocx(payload, weekStart, weekEnd);
  const bytes = new Uint8Array(buffer);
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="pauta-tce-${isoWeek}.docx"`,
    },
  });
}
