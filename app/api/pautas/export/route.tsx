import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { renderToBuffer } from "@react-pdf/renderer";

import { authOptions } from "@/lib/auth";
import { ESCRITORIOS_EMISSORES } from "@/lib/escritorios-emissores";
import {
  buildPautaWhatsApp,
  type SessaoExport,
} from "@/lib/pauta-export";
import {
  PautaJudicialDocument,
  type ItemPautaJudicialPdf,
  type PautaJudicialPdfData,
  type SessaoJudicialPdf,
} from "@/lib/pauta-pdf";
import { prisma } from "@/lib/prisma";
import {
  endOfWeekUTC,
  parseISODate,
  startOfWeekUTC,
} from "@/lib/semana";
import { ORGAOS_JULGADORES } from "@/lib/tjpe-config";
import { ORGAOS_JULGADORES_TRF5 } from "@/lib/trf5-config";

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
  const prim = n.split(" ")[0];
  if (prim && idx.has(prim)) return idx.get(prim) ?? null;
  return null;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

function diaSemanaLabel(d: Date): string {
  return DIAS_SEMANA[d.getUTCDay()];
}

function isTribunal(v: string | null): v is "TJPE" | "TRF5" {
  return v === "TJPE" || v === "TRF5";
}

function horarioDoOrgao(
  tribunal: "TJPE" | "TRF5",
  orgao: string,
): string | null {
  if (tribunal === "TJPE") return ORGAOS_JULGADORES[orgao]?.horario ?? null;
  return ORGAOS_JULGADORES_TRF5[orgao]?.horario ?? null;
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
  const tribunalParam = url.searchParams.get("tribunal");
  const tribunal: "TJPE" | "TRF5" = isTribunal(tribunalParam)
    ? tribunalParam
    : "TJPE";

  const ref = parseISODate(semana) ?? new Date();
  const weekStart = startOfWeekUTC(ref);
  const weekEnd = endOfWeekUTC(weekStart);

  const sessoes = await prisma.sessaoJudicial.findMany({
    where: {
      escritorioId,
      tribunal,
      data: { gte: weekStart, lte: weekEnd },
    },
    orderBy: [{ data: "asc" }, { orgaoJulgador: "asc" }],
    include: {
      itens: {
        orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  const isoWeek = weekStart.toISOString().slice(0, 10);

  if (format === "whatsapp") {
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
    const text = buildPautaWhatsApp(payload, weekStart, weekEnd);
    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  // PDF (default)
  const oabIdx = buildOabIndex();
  const sessoesPdf: SessaoJudicialPdf[] = sessoes.map((s) => ({
    data: s.data,
    orgaoJulgador: s.orgaoJulgador,
    tipoSessao: s.tipoSessao,
    observacoesGerais: s.observacoesGerais,
    horario: horarioDoOrgao(tribunal, s.orgaoJulgador),
    diaSemanaLabel: diaSemanaLabel(s.data),
    itens: s.itens.map<ItemPautaJudicialPdf>((it) => ({
      numeroProcesso: it.numeroProcesso,
      tipoRecurso: it.tipoRecurso,
      tituloProcesso: it.tituloProcesso,
      partes: it.partes,
      relator: it.relator,
      advogadoResp: it.advogadoResp,
      advogadoOab: buscarOab(it.advogadoResp, oabIdx),
      situacao: it.situacao,
      prognostico: it.prognostico,
      observacoes: it.observacoes,
      providencia: it.providencia,
      sustentacaoOral: it.sustentacaoOral,
      sessaoVirtual: it.sessaoVirtual,
      pedidoRetPresencial: it.pedidoRetPresencial,
      retiradoDePauta: it.retiradoDePauta,
      pedidoVistas: it.pedidoVistas,
      desPedidoVistas: it.desPedidoVistas,
      advogadoSustentacao: it.advogadoSustentacao,
      parecerMpf: it.parecerMpf,
    })),
  }));

  const data: PautaJudicialPdfData = {
    tribunal,
    weekStart,
    weekEnd,
    sessoes: sessoesPdf,
    geradoEm: new Date(),
  };

  const buffer = await renderToBuffer(<PautaJudicialDocument data={data} />);
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;

  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="pauta-${tribunal.toLowerCase()}-${isoWeek}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
