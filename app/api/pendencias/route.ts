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

const agendarSchema = baseProcessoSchema.extend({
  data: z
    .union([z.string(), z.date()])
    .transform((v) => (v instanceof Date ? v : new Date(v))),
  advogadoId: z.string().min(1),
});

const dispensarSchema = baseProcessoSchema.extend({
  advogadoId: z.string().min(1),
  motivo: z.string().optional().nullable(),
});

const inputSchema = z.discriminatedUnion("acao", [
  criarPrazoSchema.extend({ acao: z.literal("criar_prazo") }),
  baseProcessoSchema.extend({ acao: z.literal("memorial_pronto") }),
  despachoFeitoSchema.extend({ acao: z.literal("despacho_feito") }),
  prazoCumpridoSchema.extend({ acao: z.literal("prazo_cumprido") }),
  agendarSchema.extend({ acao: z.literal("agendar_memorial") }),
  agendarSchema.extend({ acao: z.literal("agendar_despacho") }),
  baseProcessoSchema.extend({ acao: z.literal("desfazer_agendamento_memorial") }),
  baseProcessoSchema.extend({ acao: z.literal("desfazer_agendamento_despacho") }),
  dispensarSchema.extend({ acao: z.literal("dispensar_memorial") }),
  dispensarSchema.extend({ acao: z.literal("dispensar_despacho") }),
  baseProcessoSchema.extend({ acao: z.literal("reverter_dispensa_memorial") }),
  baseProcessoSchema.extend({ acao: z.literal("reverter_dispensa_despacho") }),
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
    await prisma.$transaction([
      prisma.processo.update({
        where: { id: data.processoId },
        data: {
          memorialPronto: true,
          memorialAgendadoData: null,
          memorialAgendadoAdvogadoId: null,
        },
      }),
      prisma.andamento.create({
        data: {
          processoId: data.processoId,
          data: new Date(),
          grau: "PRIMEIRO",
          fase: "memorial_pronto",
          texto: "Memorial elaborado e marcado como pronto.",
          autorId: session.user.id,
        },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (data.acao === "despacho_feito") {
    const dataDesp = new Date();
    const retorno = data.retorno?.trim() || null;
    await prisma.$transaction([
      prisma.processo.update({
        where: { id: data.processoId },
        data: {
          despachadoComRelator: true,
          dataDespacho: dataDesp,
          despachoAgendadoData: null,
          despachoAgendadoAdvogadoId: null,
          ...(data.retorno !== undefined && {
            retornoDespacho: retorno,
          }),
        },
      }),
      prisma.andamento.create({
        data: {
          processoId: data.processoId,
          data: dataDesp,
          grau: "PRIMEIRO",
          fase: "despacho_realizado",
          texto:
            "Despacho realizado com o relator." +
            (retorno ? ` Retorno: ${retorno}` : ""),
          autorId: session.user.id,
        },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (data.acao === "agendar_memorial") {
    const adv = await prisma.user.findFirst({
      where: { id: data.advogadoId, escritorioId },
      select: { id: true },
    });
    if (!adv) {
      return NextResponse.json(
        { error: "Advogado nao encontrado" },
        { status: 400 },
      );
    }
    await prisma.processo.update({
      where: { id: data.processoId },
      data: {
        memorialAgendadoData: data.data,
        memorialAgendadoAdvogadoId: adv.id,
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (data.acao === "agendar_despacho") {
    const adv = await prisma.user.findFirst({
      where: { id: data.advogadoId, escritorioId },
      select: { id: true },
    });
    if (!adv) {
      return NextResponse.json(
        { error: "Advogado nao encontrado" },
        { status: 400 },
      );
    }
    await prisma.processo.update({
      where: { id: data.processoId },
      data: {
        despachoAgendadoData: data.data,
        despachoAgendadoAdvogadoId: adv.id,
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (data.acao === "desfazer_agendamento_memorial") {
    await prisma.processo.update({
      where: { id: data.processoId },
      data: {
        memorialAgendadoData: null,
        memorialAgendadoAdvogadoId: null,
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (data.acao === "desfazer_agendamento_despacho") {
    await prisma.processo.update({
      where: { id: data.processoId },
      data: {
        despachoAgendadoData: null,
        despachoAgendadoAdvogadoId: null,
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (
    data.acao === "dispensar_memorial" ||
    data.acao === "dispensar_despacho"
  ) {
    const ehMemorial = data.acao === "dispensar_memorial";
    const adv = await prisma.user.findFirst({
      where: { id: data.advogadoId, escritorioId },
      select: { id: true, nome: true },
    });
    if (!adv) {
      return NextResponse.json(
        { error: "Advogado nao encontrado" },
        { status: 400 },
      );
    }
    const motivo = data.motivo?.trim() || null;
    const agora = new Date();
    const descricaoAndamento = ehMemorial
      ? `Memorial dispensado por ${adv.nome} em ${agora.toLocaleDateString("pt-BR")}.${motivo ? ` Motivo: ${motivo}` : ""}`
      : `Despacho dispensado por ${adv.nome} em ${agora.toLocaleDateString("pt-BR")}.${motivo ? ` Motivo: ${motivo}` : ""}`;

    await prisma.$transaction([
      prisma.processo.update({
        where: { id: data.processoId },
        data: ehMemorial
          ? {
              memorialDispensado: true,
              memorialDispensadoPor: adv.nome,
              memorialDispensadoEm: agora,
              memorialDispensadoMotivo: motivo,
              memorialAgendadoData: null,
              memorialAgendadoAdvogadoId: null,
            }
          : {
              despachoDispensado: true,
              despachoDispensadoPor: adv.nome,
              despachoDispensadoEm: agora,
              despachoDispensadoMotivo: motivo,
              despachoAgendadoData: null,
              despachoAgendadoAdvogadoId: null,
            },
      }),
      prisma.andamento.create({
        data: {
          processoId: data.processoId,
          data: agora,
          grau: "PRIMEIRO",
          fase: ehMemorial ? "memorial_dispensado" : "despacho_dispensado",
          texto: descricaoAndamento,
          autorId: session.user.id,
        },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (
    data.acao === "reverter_dispensa_memorial" ||
    data.acao === "reverter_dispensa_despacho"
  ) {
    const ehMemorial = data.acao === "reverter_dispensa_memorial";
    const agora = new Date();
    await prisma.$transaction([
      prisma.processo.update({
        where: { id: data.processoId },
        data: ehMemorial
          ? {
              memorialDispensado: false,
              memorialDispensadoPor: null,
              memorialDispensadoEm: null,
              memorialDispensadoMotivo: null,
            }
          : {
              despachoDispensado: false,
              despachoDispensadoPor: null,
              despachoDispensadoEm: null,
              despachoDispensadoMotivo: null,
            },
      }),
      prisma.andamento.create({
        data: {
          processoId: data.processoId,
          data: agora,
          grau: "PRIMEIRO",
          fase: ehMemorial
            ? "memorial_dispensa_revertida"
            : "despacho_dispensa_revertido",
          texto: ehMemorial
            ? "Dispensa do memorial revertida. Pendencia reaberta."
            : "Dispensa do despacho revertida. Pendencia reaberta.",
          autorId: session.user.id,
        },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acao desconhecida" }, { status: 400 });
}
