import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { renderToBuffer } from "@react-pdf/renderer";
import { Risco, Tribunal, type Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  EMISSOR_SLUGS_VALIDOS,
  resolveEmissor,
} from "@/lib/escritorios-emissores";
import { diasAte } from "@/lib/prazos";
import {
  faseLabel,
  fasesEmPauta,
  tipoLabels,
  tribunalLabels,
} from "@/lib/processo-labels";
import {
  RelatorioClienteDocument,
  type ProcessoJudicialItem,
  type ProcessoTceItem,
  type RelatorioClienteData,
  type RelatorioStatusFiltro,
} from "@/lib/relatorio-cliente-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIPO_TCE_LABEL: Record<string, string> = {
  PRESTACAO_CONTAS_GOVERNO: "Prestacao de Contas - Governo",
  PRESTACAO_CONTAS_GESTAO: "Prestacao de Contas - Gestao",
  AUDITORIA_ESPECIAL: "Auditoria Especial",
  RGF: "RGF",
  AUTO_INFRACAO: "Auto de Infracao",
  MEDIDA_CAUTELAR: "Medida Cautelar",
};

const CAMARA_LABEL: Record<string, string> = {
  PRIMEIRA: "1a Camara",
  SEGUNDA: "2a Camara",
  PLENO: "Pleno",
};

function safeFilename(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const url = new URL(req.url);
  const tipo = url.searchParams.get("tipo");
  const id = url.searchParams.get("id") ?? "";
  const incluiJudicial = url.searchParams.get("judicial") !== "false";
  const incluiTce = url.searchParams.get("tce") !== "false";
  const statusParam = url.searchParams.get("status");
  const status: RelatorioStatusFiltro =
    statusParam === "todos" ? "todos" : "ativos";
  const emissorSlug = (url.searchParams.get("emissor") ?? "").trim().toLowerCase();
  const advogadoRaw = url.searchParams.get("advogado");
  const advogadoIdx = advogadoRaw !== null ? Number(advogadoRaw) : 0;

  if (tipo !== "gestor" && tipo !== "municipio") {
    return NextResponse.json(
      { error: "tipo invalido (use gestor ou municipio)" },
      { status: 400 },
    );
  }
  if (!id) {
    return NextResponse.json({ error: "id obrigatorio" }, { status: 400 });
  }
  if (!incluiJudicial && !incluiTce) {
    return NextResponse.json(
      { error: "selecione ao menos um modulo" },
      { status: 400 },
    );
  }

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

  // Carrega cliente
  let clienteNome = "";
  let clienteCargo: string | null = null;
  let clienteMunicipio: string | null = null;

  if (tipo === "gestor") {
    const g = await prisma.gestor.findFirst({
      where: { id, escritorioId },
      select: { nome: true, cargo: true, municipio: true },
    });
    if (!g) {
      return NextResponse.json(
        { error: "gestor nao encontrado" },
        { status: 404 },
      );
    }
    clienteNome = g.nome;
    clienteCargo = g.cargo;
    clienteMunicipio = g.municipio;
  } else {
    const m = await prisma.municipio.findFirst({
      where: { id, escritorioId },
      select: { nome: true, uf: true },
    });
    if (!m) {
      return NextResponse.json(
        { error: "municipio nao encontrado" },
        { status: 404 },
      );
    }
    clienteNome = `${m.nome}/${m.uf}`;
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Filtros base
  const judicialWhere: Prisma.ProcessoWhereInput = { escritorioId };
  if (tipo === "gestor") {
    judicialWhere.gestorId = id;
  } else {
    // Municipio: judicial via gestor.municipio (string) que casa com municipio.nome
    const m = await prisma.municipio.findFirst({
      where: { id, escritorioId },
      select: { nome: true },
    });
    judicialWhere.gestor = { municipio: m?.nome ?? "__none__" };
  }
  if (status === "ativos") {
    judicialWhere.fase = { not: "transitado" };
  }

  const tceWhere: Prisma.ProcessoTceWhereInput = { escritorioId };
  if (tipo === "gestor") {
    tceWhere.interessados = { some: { gestorId: id } };
  } else {
    tceWhere.municipioId = id;
  }

  // Carrega processos judiciais
  const judiciais: ProcessoJudicialItem[] = [];
  let totalJud = 0;
  let prazoAbertoJud = 0;
  let altoRiscoJud = 0;
  let emPautaJud = 0;
  let ativosJud = 0;

  if (incluiJudicial) {
    const processos = await prisma.processo.findMany({
      where: judicialWhere,
      orderBy: [{ risco: "asc" }, { dataDistribuicao: "desc" }],
      include: {
        advogado: { select: { nome: true } },
        andamentos: {
          orderBy: { data: "desc" },
          take: 3,
          select: { data: true, texto: true, fase: true },
        },
        prazos: {
          where: { cumprido: false },
          orderBy: { data: "asc" },
          select: {
            tipo: true,
            data: true,
            advogadoResp: { select: { nome: true } },
          },
        },
        itensPautaJudicial: {
          where: { sessao: { data: { gte: hoje } } },
          orderBy: { sessao: { data: "asc" } },
          take: 1,
          include: {
            sessao: {
              select: { data: true, orgaoJulgador: true, tribunal: true },
            },
          },
        },
      },
    });

    totalJud = processos.length;

    for (const p of processos) {
      if (p.fase !== "transitado") ativosJud++;
      if (p.risco === Risco.ALTO) altoRiscoJud++;
      if (p.prazos.length > 0) prazoAbertoJud++;
      const inPauta =
        fasesEmPauta.includes(p.fase) || p.itensPautaJudicial.length > 0;
      if (inPauta) emPautaJud++;

      const proximaSessao = p.itensPautaJudicial[0]?.sessao
        ? {
            data: p.itensPautaJudicial[0].sessao.data,
            orgao: p.itensPautaJudicial[0].sessao.orgaoJulgador,
            tribunal: p.itensPautaJudicial[0].sessao.tribunal,
          }
        : null;

      judiciais.push({
        numero: p.numero,
        tribunal: tribunalLabels[p.tribunal as Tribunal] ?? p.tribunal,
        tipo: tipoLabels[p.tipo] ?? p.tipo,
        fase: faseLabel(p.fase),
        valor: p.valor ? Number(p.valor) : null,
        advogado: p.advogado.nome,
        risco: p.risco as "ALTO" | "MEDIO" | "BAIXO",
        ultimosAndamentos: p.andamentos.map((a) => ({
          data: a.data,
          texto: a.texto,
          fase: faseLabel(a.fase),
        })),
        prazos: p.prazos.map((pr) => ({
          tipo: pr.tipo,
          data: pr.data,
          advogado: pr.advogadoResp?.nome ?? null,
          diasRestantes: diasAte(pr.data, hoje),
        })),
        proximaSessao,
      });
    }
  }

  // Carrega processos TCE
  const tceItems: ProcessoTceItem[] = [];
  let totalTce = 0;
  let prazoAbertoTce = 0;
  let ativosTce = 0;

  if (incluiTce) {
    const processosTce = await prisma.processoTce.findMany({
      where: tceWhere,
      orderBy: [{ dataAutuacao: "desc" }],
      include: {
        andamentos: {
          orderBy: { data: "desc" },
          take: 3,
          select: { data: true, descricao: true, fase: true },
        },
        prazos: {
          where: { cumprido: false },
          orderBy: { dataVencimento: "asc" },
          select: {
            tipo: true,
            dataVencimento: true,
            advogadoResp: { select: { nome: true } },
          },
        },
      },
    });

    totalTce = processosTce.length;

    for (const p of processosTce) {
      ativosTce++;
      if (p.prazos.length > 0) prazoAbertoTce++;

      tceItems.push({
        numero: p.numero,
        tipo: TIPO_TCE_LABEL[p.tipo] ?? p.tipo,
        exercicio: p.exercicio,
        camara: CAMARA_LABEL[p.camara] ?? p.camara,
        relator: p.relator,
        faseAtual: p.faseAtual,
        status: {
          notaTecnica: p.notaTecnica,
          parecerMpco: p.parecerMpco,
          despachado: p.despachadoComRelator,
          memorialPronto: p.memorialPronto,
        },
        ultimosAndamentos: p.andamentos.map((a) => ({
          data: a.data,
          descricao: a.descricao,
          fase: a.fase,
        })),
        prazos: p.prazos.map((pr) => ({
          tipo: pr.tipo,
          dataVencimento: pr.dataVencimento,
          advogado: pr.advogadoResp?.nome ?? null,
          diasRestantes: diasAte(pr.dataVencimento, hoje),
        })),
      });
    }
  }

  const data: RelatorioClienteData = {
    emissor: {
      slug: emissorResolvido.escritorio.slug,
      nome: emissorResolvido.escritorio.nome,
    },
    advogadoSignatario: {
      nome: emissorResolvido.advogado.nome,
      oab: emissorResolvido.advogado.oab,
    },
    cliente: {
      tipo,
      nome: clienteNome,
      cargo: clienteCargo,
      municipio: clienteMunicipio,
    },
    geradoEm: new Date(),
    status,
    resumo: {
      totalProcessos: totalJud + totalTce,
      ativos: ativosJud + ativosTce,
      comPrazoAberto: prazoAbertoJud + prazoAbertoTce,
      altoRisco: altoRiscoJud,
      emPauta: emPautaJud,
    },
    incluiJudicial,
    incluiTce,
    judiciais,
    tce: tceItems,
  };

  const buffer = await renderToBuffer(<RelatorioClienteDocument data={data} />);
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;

  const filename = `relatorio_${safeFilename(clienteNome)}_${new Date()
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
