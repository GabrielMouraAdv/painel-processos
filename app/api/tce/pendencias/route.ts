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

const agendarSchema = baseProcessoSchema.extend({
  data: z.union([z.string(), z.date()]).transform((v) =>
    v instanceof Date ? v : new Date(v),
  ),
  advogadoId: z.string().min(1),
});

const dispensarSchema = baseProcessoSchema.extend({
  advogadoId: z.string().min(1),
  motivo: z.string().optional().nullable(),
});

const dispensarPrazoSchema = z.object({
  prazoId: z.string().min(1),
  advogadoId: z.string().min(1),
  motivo: z.string().optional().nullable(),
});

const reverterDispensaPrazoSchema = z.object({
  prazoId: z.string().min(1),
});

const registrarSchema = baseProcessoSchema.extend({
  valor: z.boolean(),
});

const julgamentoSchema = baseProcessoSchema.extend({
  dataJulgamento: z.union([z.string(), z.date()]).transform((v) =>
    v instanceof Date ? v : new Date(v),
  ),
  resultadoJulgamento: z.string().min(1),
  penalidade: z.string().optional().nullable(),
  valorMulta: z.number().optional().nullable(),
  valorDevolucao: z.number().optional().nullable(),
  observacoesJulgamento: z.string().optional().nullable(),
});

const desfazerJulgamentoSchema = baseProcessoSchema;

const inputSchema = z.discriminatedUnion("acao", [
  baseProcessoSchema.extend({ acao: z.literal("contrarrazoes_nt") }),
  baseProcessoSchema.extend({ acao: z.literal("contrarrazoes_mpco") }),
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
  dispensarPrazoSchema.extend({ acao: z.literal("dispensar_prazo") }),
  reverterDispensaPrazoSchema.extend({ acao: z.literal("reverter_dispensa_prazo") }),
  registrarSchema.extend({ acao: z.literal("registrar_nt") }),
  registrarSchema.extend({ acao: z.literal("registrar_mpco") }),
  dispensarSchema.extend({ acao: z.literal("dispensar_contrarrazoes_nt") }),
  dispensarSchema.extend({ acao: z.literal("dispensar_contrarrazoes_mpco") }),
  baseProcessoSchema.extend({ acao: z.literal("reverter_dispensa_contrarrazoes_nt") }),
  baseProcessoSchema.extend({ acao: z.literal("reverter_dispensa_contrarrazoes_mpco") }),
  julgamentoSchema.extend({ acao: z.literal("registrar_julgamento") }),
  desfazerJulgamentoSchema.extend({ acao: z.literal("desfazer_julgamento") }),
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

  // Validacao de pertencimento ao escritorio. Recursos agora sao ProcessoTce
  // normais, entao todas as acoes que recebem processoId aceitam tanto o
  // processo original quanto o recurso.
  const acoesPrazo = new Set([
    "prazo_cumprido",
    "dispensar_prazo",
    "reverter_dispensa_prazo",
  ]);
  if (!acoesPrazo.has(data.acao)) {
    const processoId = (data as { processoId: string }).processoId;
    const proc = await prisma.processoTce.findFirst({
      where: { id: processoId, escritorioId },
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
    // Idempotente: se o memorial ja estiver marcado como pronto (ex.: via
    // /api/documentos/upload com tipo=memorial), nao recria o andamento.
    const proc = await prisma.processoTce.findUnique({
      where: { id: data.processoId },
      select: { memorialPronto: true },
    });
    if (proc?.memorialPronto) {
      return NextResponse.json({ ok: true, alreadyMarked: true });
    }
    await prisma.$transaction([
      prisma.processoTce.update({
        where: { id: data.processoId },
        data: {
          memorialPronto: true,
          memorialAgendadoData: null,
          memorialAgendadoAdvogadoId: null,
        },
      }),
      prisma.andamentoTce.create({
        data: {
          processoId: data.processoId,
          data: new Date(),
          fase: "memorial_pronto",
          descricao: "Memorial elaborado e marcado como pronto.",
          autorId: userId,
        },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (data.acao === "agendar_memorial") {
    const adv = await prisma.user.findFirst({
      where: { id: data.advogadoId, escritorioId },
      select: { id: true, nome: true },
    });
    if (!adv) {
      return NextResponse.json(
        { error: "Advogado responsavel nao encontrado" },
        { status: 400 },
      );
    }
    await prisma.processoTce.update({
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
      select: { id: true, nome: true },
    });
    if (!adv) {
      return NextResponse.json(
        { error: "Advogado responsavel nao encontrado" },
        { status: 400 },
      );
    }
    await prisma.processoTce.update({
      where: { id: data.processoId },
      data: {
        despachoAgendadoData: data.data,
        despachoAgendadoAdvogadoId: adv.id,
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (data.acao === "desfazer_agendamento_memorial") {
    await prisma.processoTce.update({
      where: { id: data.processoId },
      data: {
        memorialAgendadoData: null,
        memorialAgendadoAdvogadoId: null,
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (data.acao === "desfazer_agendamento_despacho") {
    await prisma.processoTce.update({
      where: { id: data.processoId },
      data: {
        despachoAgendadoData: null,
        despachoAgendadoAdvogadoId: null,
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (data.acao === "despacho_feito") {
    const dataDesp = new Date();
    const retorno = data.retorno?.trim() || null;
    await prisma.$transaction([
      prisma.processoTce.update({
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
      prisma.andamentoTce.create({
        data: {
          processoId: data.processoId,
          data: dataDesp,
          fase: "despacho_realizado",
          descricao:
            "Despacho realizado com o relator." +
            (retorno ? ` Retorno: ${retorno}` : ""),
          autorId: userId,
        },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (data.acao === "prazo_cumprido") {
    const prazo = await prisma.prazoTce.findFirst({
      where: {
        id: data.prazoId,
        processo: { escritorioId },
      },
      select: { id: true, tipo: true, processoId: true },
    });
    if (!prazo) {
      return NextResponse.json(
        { error: "Prazo nao encontrado" },
        { status: 404 },
      );
    }
    // Detecta tipo do prazo para auto-fechar pendencias correlatas.
    const tipoNorm = prazo.tipo.toLowerCase();
    const isContrarrazoesNt = /contrarraz.*nota\s*tecnica/i.test(prazo.tipo);
    const isContrarrazoesMpco = /contrarraz.*(mpco|parecer)/i.test(prazo.tipo);

    await prisma.$transaction(async (tx) => {
      await tx.prazoTce.update({
        where: { id: data.prazoId },
        data: { cumprido: true },
      });
      if (isContrarrazoesNt) {
        await tx.processoTce.update({
          where: { id: prazo.processoId },
          data: { contrarrazoesNtApresentadas: true },
        });
        await tx.andamentoTce.create({
          data: {
            processoId: prazo.processoId,
            data: new Date(),
            fase: "contrarrazoes_nt",
            descricao: "Contrarrazoes a Nota Tecnica apresentadas.",
            autorId: userId,
          },
        });
      } else if (isContrarrazoesMpco) {
        await tx.processoTce.update({
          where: { id: prazo.processoId },
          data: { contrarrazoesMpcoApresentadas: true },
        });
        await tx.andamentoTce.create({
          data: {
            processoId: prazo.processoId,
            data: new Date(),
            fase: "contrarrazoes_mpco",
            descricao: "Contrarrazoes ao Parecer MPCO apresentadas.",
            autorId: userId,
          },
        });
      }
    });
    void tipoNorm;
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
      prisma.processoTce.update({
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
      prisma.andamentoTce.create({
        data: {
          processoId: data.processoId,
          data: agora,
          fase: ehMemorial ? "memorial_dispensado" : "despacho_dispensado",
          descricao: descricaoAndamento,
          autorId: userId,
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
    const updateData = ehMemorial
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
        };
    const descricao = ehMemorial
      ? "Dispensa do memorial revertida. Pendencia reaberta."
      : "Dispensa do despacho revertida. Pendencia reaberta.";
    await prisma.$transaction([
      prisma.processoTce.update({
        where: { id: data.processoId },
        data: updateData,
      }),
      prisma.andamentoTce.create({
        data: {
          processoId: data.processoId,
          data: agora,
          fase: ehMemorial
            ? "memorial_dispensa_revertida"
            : "despacho_dispensa_revertido",
          descricao,
          autorId: userId,
        },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (data.acao === "dispensar_prazo") {
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
    const prazoTce = await prisma.prazoTce.findFirst({
      where: { id: data.prazoId, processo: { escritorioId } },
      select: { id: true, tipo: true, processoId: true },
    });
    if (!prazoTce) {
      return NextResponse.json({ error: "Prazo nao encontrado" }, { status: 404 });
    }
    await prisma.$transaction([
      prisma.prazoTce.update({
        where: { id: prazoTce.id },
        data: {
          dispensado: true,
          dispensadoPor: adv.nome,
          dispensadoEm: agora,
          dispensadoMotivo: motivo,
        },
      }),
      prisma.andamentoTce.create({
        data: {
          processoId: prazoTce.processoId,
          data: agora,
          fase: "prazo_dispensado",
          descricao: `Prazo "${prazoTce.tipo}" dispensado por ${adv.nome} em ${agora.toLocaleDateString("pt-BR")}.${motivo ? ` Motivo: ${motivo}` : ""}`,
          autorId: userId,
        },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (data.acao === "reverter_dispensa_prazo") {
    const agora = new Date();
    const prazoTce = await prisma.prazoTce.findFirst({
      where: { id: data.prazoId, processo: { escritorioId } },
      select: { id: true, tipo: true, processoId: true },
    });
    if (!prazoTce) {
      return NextResponse.json({ error: "Prazo nao encontrado" }, { status: 404 });
    }
    await prisma.$transaction([
      prisma.prazoTce.update({
        where: { id: prazoTce.id },
        data: {
          dispensado: false,
          dispensadoPor: null,
          dispensadoEm: null,
          dispensadoMotivo: null,
        },
      }),
      prisma.andamentoTce.create({
        data: {
          processoId: prazoTce.processoId,
          data: agora,
          fase: "prazo_dispensa_revertida",
          descricao: `Dispensa do prazo "${prazoTce.tipo}" revertida.`,
          autorId: userId,
        },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (data.acao === "registrar_nt" || data.acao === "registrar_mpco") {
    const ehNt = data.acao === "registrar_nt";
    const agora = new Date();
    const proc = await prisma.processoTce.findFirst({
      where: { id: data.processoId, escritorioId },
      select: { notaTecnica: true, parecerMpco: true },
    });
    const valorAntes = ehNt ? proc?.notaTecnica : proc?.parecerMpco;
    if (valorAntes === data.valor) {
      return NextResponse.json({ ok: true, alreadySet: true });
    }
    await prisma.$transaction([
      prisma.processoTce.update({
        where: { id: data.processoId },
        data: ehNt
          ? { notaTecnica: data.valor }
          : { parecerMpco: data.valor },
      }),
      prisma.andamentoTce.create({
        data: {
          processoId: data.processoId,
          data: agora,
          fase: ehNt ? "nota_tecnica" : "parecer_mpco",
          descricao: data.valor
            ? ehNt
              ? "Nota Tecnica registrada nos autos."
              : "Parecer MPCO registrado nos autos."
            : ehNt
              ? "Registro de Nota Tecnica desfeito."
              : "Registro de Parecer MPCO desfeito.",
          autorId: userId,
        },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (
    data.acao === "dispensar_contrarrazoes_nt" ||
    data.acao === "dispensar_contrarrazoes_mpco"
  ) {
    const ehNt = data.acao === "dispensar_contrarrazoes_nt";
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
    const descricao = ehNt
      ? `Contrarrazoes a Nota Tecnica dispensadas por ${adv.nome} em ${agora.toLocaleDateString("pt-BR")}.${motivo ? ` Motivo: ${motivo}` : ""}`
      : `Contrarrazoes ao Parecer MPCO dispensadas por ${adv.nome} em ${agora.toLocaleDateString("pt-BR")}.${motivo ? ` Motivo: ${motivo}` : ""}`;
    await prisma.$transaction([
      prisma.processoTce.update({
        where: { id: data.processoId },
        data: ehNt
          ? {
              contrarrazoesNtDispensadas: true,
              contrarrazoesNtDispensadoPor: adv.nome,
              contrarrazoesNtDispensadoEm: agora,
              contrarrazoesNtDispensadoMotivo: motivo,
            }
          : {
              contrarrazoesMpcoDispensadas: true,
              contrarrazoesMpcoDispensadoPor: adv.nome,
              contrarrazoesMpcoDispensadoEm: agora,
              contrarrazoesMpcoDispensadoMotivo: motivo,
            },
      }),
      prisma.andamentoTce.create({
        data: {
          processoId: data.processoId,
          data: agora,
          fase: ehNt
            ? "contrarrazoes_nt_dispensadas"
            : "contrarrazoes_mpco_dispensadas",
          descricao,
          autorId: userId,
        },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (
    data.acao === "reverter_dispensa_contrarrazoes_nt" ||
    data.acao === "reverter_dispensa_contrarrazoes_mpco"
  ) {
    const ehNt = data.acao === "reverter_dispensa_contrarrazoes_nt";
    const agora = new Date();
    await prisma.$transaction([
      prisma.processoTce.update({
        where: { id: data.processoId },
        data: ehNt
          ? {
              contrarrazoesNtDispensadas: false,
              contrarrazoesNtDispensadoPor: null,
              contrarrazoesNtDispensadoEm: null,
              contrarrazoesNtDispensadoMotivo: null,
            }
          : {
              contrarrazoesMpcoDispensadas: false,
              contrarrazoesMpcoDispensadoPor: null,
              contrarrazoesMpcoDispensadoEm: null,
              contrarrazoesMpcoDispensadoMotivo: null,
            },
      }),
      prisma.andamentoTce.create({
        data: {
          processoId: data.processoId,
          data: agora,
          fase: ehNt
            ? "contrarrazoes_nt_dispensa_revertida"
            : "contrarrazoes_mpco_dispensa_revertida",
          descricao: ehNt
            ? "Dispensa das contrarrazoes a NT revertida."
            : "Dispensa das contrarrazoes ao MPCO revertida.",
          autorId: userId,
        },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (data.acao === "registrar_julgamento") {
    const dataJ = new Date(data.dataJulgamento);
    dataJ.setHours(0, 0, 0, 0);
    const penalidade = data.penalidade?.trim() || null;
    const obs = data.observacoesJulgamento?.trim() || null;

    const partes: string[] = [];
    if (penalidade) partes.push(`Penalidade: ${penalidade}`);
    if (data.valorMulta && data.valorMulta > 0) {
      partes.push(`Multa R$ ${data.valorMulta.toFixed(2)}`);
    }
    if (data.valorDevolucao && data.valorDevolucao > 0) {
      partes.push(`Devolucao R$ ${data.valorDevolucao.toFixed(2)}`);
    }
    const sufixo = partes.length ? ` ${partes.join(" • ")}.` : "";

    await prisma.$transaction([
      prisma.processoTce.update({
        where: { id: data.processoId },
        data: {
          julgado: true,
          dataJulgamento: dataJ,
          resultadoJulgamento: data.resultadoJulgamento,
          penalidade,
          valorMulta:
            data.valorMulta !== undefined && data.valorMulta !== null
              ? data.valorMulta
              : null,
          valorDevolucao:
            data.valorDevolucao !== undefined && data.valorDevolucao !== null
              ? data.valorDevolucao
              : null,
          observacoesJulgamento: obs,
        },
      }),
      prisma.andamentoTce.create({
        data: {
          processoId: data.processoId,
          data: dataJ,
          fase: "julgamento",
          descricao: `Processo julgado em ${dataJ.toLocaleDateString("pt-BR")}: ${data.resultadoJulgamento}.${sufixo}${obs ? ` Observacoes: ${obs}` : ""}`,
          autorId: userId,
        },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (data.acao === "desfazer_julgamento") {
    await prisma.$transaction([
      prisma.processoTce.update({
        where: { id: data.processoId },
        data: {
          julgado: false,
          dataJulgamento: null,
          resultadoJulgamento: null,
          penalidade: null,
          valorMulta: null,
          valorDevolucao: null,
          observacoesJulgamento: null,
        },
      }),
      prisma.andamentoTce.create({
        data: {
          processoId: data.processoId,
          data: new Date(),
          fase: "julgamento_desfeito",
          descricao: "Registro de julgamento desfeito.",
          autorId: userId,
        },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acao desconhecida" }, { status: 400 });
}
