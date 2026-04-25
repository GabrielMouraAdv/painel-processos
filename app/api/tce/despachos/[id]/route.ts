import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  prognosticoDespacho: z.string().nullish(),
  retornoDespacho: z.string().nullish(),
  despachadoComRelator: z.boolean().optional(),
  incluidoNoDespacho: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  // Tenta ProcessoTce primeiro
  const processo = await prisma.processoTce.findFirst({
    where: { id: params.id, escritorioId },
    select: { id: true, despachadoComRelator: true },
  });

  // Se nao for processo, tenta SubprocessoTce
  let subprocesso: { id: string; despachadoComRelator: boolean } | null = null;
  if (!processo) {
    subprocesso = await prisma.subprocessoTce.findFirst({
      where: { id: params.id, processoPai: { escritorioId } },
      select: { id: true, despachadoComRelator: true },
    });
  }

  if (!processo && !subprocesso) {
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const update: {
    prognosticoDespacho?: string | null;
    retornoDespacho?: string | null;
    despachadoComRelator?: boolean;
    incluidoNoDespacho?: boolean;
    dataDespacho?: Date | null;
    despachoAgendadoData?: Date | null;
    despachoAgendadoAdvogadoId?: string | null;
  } = {};

  const ehProcesso = !!processo;
  const atual = (processo ?? subprocesso)!;

  if (data.prognosticoDespacho !== undefined) {
    update.prognosticoDespacho = data.prognosticoDespacho?.trim() || null;
  }
  if (data.retornoDespacho !== undefined) {
    update.retornoDespacho = data.retornoDespacho?.trim() || null;
  }
  // Detecta transicao para criar andamento + limpar agendamento (mesma logica
  // da acao despacho_feito em /api/tce/pendencias).
  const marcouDespachado =
    data.despachadoComRelator === true && !atual.despachadoComRelator;
  const desmarcouDespachado =
    data.despachadoComRelator === false && atual.despachadoComRelator;
  const dataDesp = new Date();

  if (data.despachadoComRelator !== undefined) {
    update.despachadoComRelator = data.despachadoComRelator;
    if (marcouDespachado) {
      update.dataDespacho = dataDesp;
      update.despachoAgendadoData = null;
      update.despachoAgendadoAdvogadoId = null;
    }
    if (desmarcouDespachado) {
      update.dataDespacho = null;
    }
  }
  // Subprocessos nao tem incluidoNoDespacho — ignoramos silenciosamente
  if (ehProcesso && data.incluidoNoDespacho !== undefined) {
    update.incluidoNoDespacho = data.incluidoNoDespacho;
  }

  // ID do processo pai (para registrar andamento quando for subprocesso)
  let processoPaiId: string | null = null;
  if (!ehProcesso) {
    const sub = await prisma.subprocessoTce.findFirst({
      where: { id: params.id },
      select: { processoPaiId: true },
    });
    processoPaiId = sub?.processoPaiId ?? null;
  }

  const ops: Prisma.PrismaPromise<unknown>[] = [];
  if (ehProcesso) {
    ops.push(
      prisma.processoTce.update({
        where: { id: params.id },
        data: update,
      }),
    );
  } else {
    const subUpdate = { ...update };
    delete subUpdate.incluidoNoDespacho;
    ops.push(
      prisma.subprocessoTce.update({
        where: { id: params.id },
        data: subUpdate,
      }),
    );
  }

  // Cria andamento na transicao do flag despachado.
  if (marcouDespachado || desmarcouDespachado) {
    const targetProcessoId = ehProcesso ? params.id : processoPaiId;
    if (targetProcessoId) {
      const retorno = update.retornoDespacho ?? null;
      const sufixoSub = ehProcesso ? "" : " (recurso vinculado)";
      const descricao = marcouDespachado
        ? "Despacho realizado com o relator." +
          (retorno ? ` Retorno: ${retorno}` : "") +
          sufixoSub
        : "Despacho com o relator desmarcado." + sufixoSub;
      const fase = marcouDespachado ? "despacho_realizado" : "despacho_desfeito";
      ops.push(
        prisma.andamentoTce.create({
          data: {
            processoId: targetProcessoId,
            data: dataDesp,
            fase,
            descricao,
            autorId: session.user.id,
          },
        }),
      );
    }
  }

  await prisma.$transaction(ops);

  return NextResponse.json({ ok: true });
}
