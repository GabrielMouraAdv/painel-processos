import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { calcularDataVencimento, diasUteisEntre } from "@/lib/dias-uteis";
import { prisma } from "@/lib/prisma";

const baseProcessoSchema = z.object({
  processoId: z.string().min(1),
});

const criarPrazoSchema = baseProcessoSchema.extend({
  tipo: z.string().min(1),
  advogadoRespId: z.string().min(1),
  dataVencimento: z.union([z.string(), z.date()]).transform((v) =>
    v instanceof Date ? v : new Date(v),
  ),
  observacoes: z.string().nullish(),
});

const despachoFeitoSchema = baseProcessoSchema.extend({
  retorno: z.string().optional().nullable(),
});

const prazoCumpridoSchema = z.object({
  prazoId: z.string().min(1),
});

const inputSchema = z.discriminatedUnion("acao", [
  baseProcessoSchema.extend({ acao: z.literal("contrarrazoes_nt") }),
  baseProcessoSchema.extend({ acao: z.literal("contrarrazoes_mpco") }),
  criarPrazoSchema.extend({ acao: z.literal("criar_prazo") }),
  baseProcessoSchema.extend({ acao: z.literal("memorial_pronto") }),
  despachoFeitoSchema.extend({ acao: z.literal("despacho_feito") }),
  prazoCumpridoSchema.extend({ acao: z.literal("prazo_cumprido") }),
]);

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;
  const userId = session.user.id;

  const body = await req.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // Validacao de pertencimento ao escritorio
  if (data.acao !== "prazo_cumprido") {
    const proc = await prisma.processoTce.findFirst({
      where: { id: data.processoId, escritorioId },
      select: { id: true, faseAtual: true, despachadoComRelator: true },
    });
    if (!proc) {
      return NextResponse.json(
        { error: "Processo nao encontrado" },
        { status: 404 },
      );
    }
  }

  if (data.acao === "contrarrazoes_nt") {
    await prisma.$transaction([
      prisma.processoTce.update({
        where: { id: data.processoId },
        data: { contrarrazoesNtApresentadas: true },
      }),
      prisma.andamentoTce.create({
        data: {
          processoId: data.processoId,
          data: new Date(),
          fase: "contrarrazoes_nt",
          descricao: "Contrarrazoes a Nota Tecnica apresentadas.",
          autorId: userId,
        },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (data.acao === "contrarrazoes_mpco") {
    await prisma.$transaction([
      prisma.processoTce.update({
        where: { id: data.processoId },
        data: { contrarrazoesMpcoApresentadas: true },
      }),
      prisma.andamentoTce.create({
        data: {
          processoId: data.processoId,
          data: new Date(),
          fase: "contrarrazoes_mpco",
          descricao: "Contrarrazoes ao Parecer MPCO apresentadas.",
          autorId: userId,
        },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (data.acao === "criar_prazo") {
    const adv = await prisma.user.findFirst({
      where: { id: data.advogadoRespId, escritorioId },
      select: { id: true },
    });
    if (!adv) {
      return NextResponse.json(
        { error: "Advogado responsavel nao encontrado" },
        { status: 400 },
      );
    }
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataVenc = new Date(data.dataVencimento);
    dataVenc.setHours(0, 0, 0, 0);
    const dias = Math.max(1, diasUteisEntre(hoje, dataVenc));
    const dataVencFinal = calcularDataVencimento(hoje, dias);

    const prazo = await prisma.prazoTce.create({
      data: {
        processoId: data.processoId,
        tipo: data.tipo,
        dataIntimacao: hoje,
        dataVencimento: dataVencFinal,
        diasUteis: dias,
        prorrogavel: true,
        advogadoRespId: data.advogadoRespId,
        observacoes: data.observacoes?.trim() || null,
      },
      select: { id: true },
    });
    return NextResponse.json(prazo, { status: 201 });
  }

  if (data.acao === "memorial_pronto") {
    await prisma.processoTce.update({
      where: { id: data.processoId },
      data: { memorialPronto: true },
    });
    return NextResponse.json({ ok: true });
  }

  if (data.acao === "despacho_feito") {
    await prisma.processoTce.update({
      where: { id: data.processoId },
      data: {
        despachadoComRelator: true,
        dataDespacho: new Date(),
        ...(data.retorno !== undefined && {
          retornoDespacho: data.retorno?.trim() || null,
        }),
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (data.acao === "prazo_cumprido") {
    const prazo = await prisma.prazoTce.findFirst({
      where: {
        id: data.prazoId,
        processo: { escritorioId },
      },
      select: { id: true },
    });
    if (!prazo) {
      return NextResponse.json(
        { error: "Prazo nao encontrado" },
        { status: 404 },
      );
    }
    await prisma.prazoTce.update({
      where: { id: data.prazoId },
      data: { cumprido: true },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acao desconhecida" }, { status: 400 });
}
