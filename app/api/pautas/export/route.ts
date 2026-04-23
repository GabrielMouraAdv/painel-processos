import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import {
  buildPautaDocx,
  buildPautaWhatsApp,
  type SessaoExport,
} from "@/lib/pauta-export";
import { prisma } from "@/lib/prisma";
import {
  endOfWeekUTC,
  parseISODate,
  startOfWeekUTC,
} from "@/lib/semana";

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

  const sessoes = await prisma.sessaoJudicial.findMany({
    where: {
      escritorioId,
      tribunal: "TJPE",
      data: { gte: weekStart, lte: weekEnd },
    },
    orderBy: [{ orgaoJulgador: "asc" }, { data: "asc" }],
    include: {
      itens: {
        orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  const payload: SessaoExport[] = sessoes.map((s) => ({
    id: s.id,
    data: s.data,
    orgaoJulgador: s.orgaoJulgador,
    tipoSessao: s.tipoSessao,
    observacoesGerais: s.observacoesGerais,
    itens: s.itens.map((it) => ({
      numeroProcesso: it.numeroProcesso,
      tituloProcesso: it.tituloProcesso,
      tipoRecurso: it.tipoRecurso,
      partes: it.partes,
      relator: it.relator,
      advogadoResp: it.advogadoResp,
      situacao: it.situacao,
      prognostico: it.prognostico,
      sustentacaoOral: it.sustentacaoOral,
      sessaoVirtual: it.sessaoVirtual,
      pedidoRetPresencial: it.pedidoRetPresencial,
      retiradoDePauta: it.retiradoDePauta,
      pedidoVistas: it.pedidoVistas,
      advogadoSustentacao: it.advogadoSustentacao,
      desPedidoVistas: it.desPedidoVistas,
    })),
  }));

  const isoWeek = weekStart.toISOString().slice(0, 10);

  if (format === "whatsapp") {
    const text = buildPautaWhatsApp(payload, weekStart, weekEnd);
    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  const buffer = await buildPautaDocx(payload, weekStart, weekEnd);
  const bytes = new Uint8Array(buffer);
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="pauta-tjpe-${isoWeek}.docx"`,
    },
  });
}
