import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { renderToBuffer } from "@react-pdf/renderer";

import { authOptions } from "@/lib/auth";
import { ESCRITORIOS_EMISSORES } from "@/lib/escritorios-emissores";
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
import { TCE_TIPO_LABELS_PT } from "@/lib/pdf-pt-br";

function normalizarNome(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildOabIndex(): Map<string, string> {
  const map = new Map<string, string>();
  for (const esc of ESCRITORIOS_EMISSORES) {
    for (const adv of esc.advogados) {
      const n = normalizarNome(adv.nome);
      map.set(n, adv.oab);
      const partes = n.split(" ").filter(Boolean);
      // tambem indexa pela primeira palavra (primeiro nome) para casar
      // com nomes mais curtos cadastrados em ItemPauta.advogadoResp
      if (partes.length > 0) {
        const prim = partes[0];
        if (!map.has(prim)) map.set(prim, adv.oab);
      }
    }
  }
  return map;
}

function buscarOab(nome: string, idx: Map<string, string>): string | null {
  const n = normalizarNome(nome);
  if (idx.has(n)) return idx.get(n) ?? null;
  // tenta casar pelo primeiro token
  const prim = n.split(" ")[0];
  if (prim && idx.has(prim)) return idx.get(prim) ?? null;
  return null;
}
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
          processoTce: {
            select: {
              tipo: true,
              interessados: {
                include: { gestor: { select: { nome: true } } },
                orderBy: { createdAt: "asc" },
              },
            },
          },
        },
      },
    },
  });

  const oabIdx = buildOabIndex();

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
        ? TCE_TIPO_LABELS_PT[it.processoTce.tipo]
        : null,
      municipio: it.municipio,
      exercicio: it.exercicio,
      relator: it.relator,
      advogadoResp: it.advogadoResp,
      advogadoOab: buscarOab(it.advogadoResp, oabIdx),
      situacao: it.situacao,
      observacoes: it.observacoes,
      prognostico: it.prognostico,
      providencia: it.providencia,
      interessados:
        it.processoTce?.interessados.map((i) => i.gestor.nome) ?? [],
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
