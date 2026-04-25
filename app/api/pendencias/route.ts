import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
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

  const body = await req.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  if (data.acao !== "prazo_cumprido") {
    const proc = await prisma.processo.findFirst({
      where: { id: data.processoId, escritorioId },
      select: { id: true },
    });
    if (!proc) {
      return NextResponse.json(
        { error: "Processo nao encontrado" },
        { status: 404 },
      );
    }
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
    const dataVenc = new Date(data.dataVencimento);
    dataVenc.setHours(0, 0, 0, 0);

    const prazo = await prisma.prazo.create({
      data: {
        processoId: data.processoId,
        tipo: data.tipo,
        data: dataVenc,
        advogadoRespId: data.advogadoRespId,
        observacoes: data.observacoes?.trim() || null,
      },
      select: { id: true },
    });
    return NextResponse.json(prazo, { status: 201 });
  }

  if (data.acao === "memorial_pronto") {
    await prisma.processo.update({
      where: { id: data.processoId },
      data: { memorialPronto: true },
    });
    return NextResponse.json({ ok: true });
  }

  if (data.acao === "despacho_feito") {
    await prisma.processo.update({
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
    const prazo = await prisma.prazo.findFirst({
      where: { id: data.prazoId, processo: { escritorioId } },
      select: { id: true },
    });
    if (!prazo) {
      return NextResponse.json(
        { error: "Prazo nao encontrado" },
        { status: 404 },
      );
    }
    await prisma.prazo.update({
      where: { id: data.prazoId },
      data: { cumprido: true },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acao desconhecida" }, { status: 400 });
}
