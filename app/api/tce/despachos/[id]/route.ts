import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
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

  const processo = await prisma.processoTce.findFirst({
    where: { id: params.id, escritorioId },
    select: { id: true, despachadoComRelator: true, ehRecurso: true, numero: true },
  });

  if (!processo) {
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

  if (data.prognosticoDespacho !== undefined) {
    update.prognosticoDespacho = data.prognosticoDespacho?.trim() || null;
  }
  if (data.retornoDespacho !== undefined) {
    update.retornoDespacho = data.retornoDespacho?.trim() || null;
  }
  const marcouDespachado =
    data.despachadoComRelator === true && !processo.despachadoComRelator;
  const desmarcouDespachado =
    data.despachadoComRelator === false && processo.despachadoComRelator;
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
  if (data.incluidoNoDespacho !== undefined) {
    update.incluidoNoDespacho = data.incluidoNoDespacho;
  }

  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.processoTce.update({
      where: { id: params.id },
      data: update,
    }),
  ];

  if (marcouDespachado || desmarcouDespachado) {
    const retorno = update.retornoDespacho ?? null;
    const sufixoRecurso = processo.ehRecurso ? " (recurso)" : "";
    const descricao = marcouDespachado
      ? "Despacho realizado com o relator." +
        (retorno ? ` Retorno: ${retorno}` : "") +
        sufixoRecurso
      : "Despacho com o relator desmarcado." + sufixoRecurso;
    const fase = marcouDespachado ? "despacho_realizado" : "despacho_desfeito";
    ops.push(
      prisma.andamentoTce.create({
        data: {
          processoId: params.id,
          data: dataDesp,
          fase,
          descricao,
          autorId: session.user.id,
        },
      }),
    );
  }

  await prisma.$transaction(ops);

  if (marcouDespachado) {
    await registrarLog({
      userId: session.user.id,
      acao: ACOES.MARCAR_DESPACHADO,
      entidade: "ProcessoTce",
      entidadeId: params.id,
      descricao: `${session.user.name ?? "Usuario"} marcou despachado com relator no processo ${processo.numero}`,
      detalhes: { retorno: update.retornoDespacho ?? null },
      ip: extrairIp(req),
    });
  }

  return NextResponse.json({ ok: true });
}
