import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import { RESULTADOS_POR_TIPO_TCE, rotuloCanonico } from "@/lib/julgamento-config";
import { prisma } from "@/lib/prisma";

async function ensureOwned(id: string, escritorioId: string) {
  return prisma.interessadoProcessoTce.findFirst({
    where: { id, processo: { escritorioId } },
    select: {
      id: true,
      cargo: true,
      gestor: { select: { nome: true } },
      processo: { select: { numero: true, tipo: true } },
    },
  });
}

const patchSchema = z.object({
  cargo: z.string().min(1, "Informe o cargo").optional(),
  // Julgamento individual (multa por responsavel).
  resultadoIndividual: z.string().nullable().optional(),
  valorMulta: z.number().nonnegative().nullable().optional(),
  valorDevolucao: z.number().nonnegative().nullable().optional(),
  ehCliente: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const existing = await ensureOwned(params.id, session.user.escritorioId);
  if (!existing)
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const d = parsed.data;
  // Resultado individual usa os mesmos rotulos do tipo do processo.
  let resultadoIndividual: string | null | undefined = undefined;
  if (d.resultadoIndividual !== undefined) {
    const texto = d.resultadoIndividual?.trim() || null;
    resultadoIndividual = texto ? rotuloCanonico(RESULTADOS_POR_TIPO_TCE[existing.processo.tipo], texto) : null;
    if (texto && !resultadoIndividual) {
      return NextResponse.json({ error: "Resultado inválido para este tipo de processo" }, { status: 400 });
    }
  }
  await prisma.interessadoProcessoTce.update({
    where: { id: params.id },
    data: {
      ...(d.cargo !== undefined && { cargo: d.cargo }),
      ...(resultadoIndividual !== undefined && { resultadoIndividual }),
      ...(d.valorMulta !== undefined && { valorMulta: d.valorMulta }),
      ...(d.valorDevolucao !== undefined && { valorDevolucao: d.valorDevolucao }),
      ...(d.ehCliente !== undefined && { ehCliente: d.ehCliente }),
    },
  });
  await registrarLog({
    userId: session.user.id,
    acao: "EDITAR_INTERESSADO",
    entidade: "InteressadoProcessoTce",
    entidadeId: params.id,
    descricao: `${session.user.name ?? "Usuario"} editou o interessado ${existing.gestor.nome} no processo ${existing.processo.numero}`,
    detalhes: parsed.data,
    ip: extrairIp(req),
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const existing = await ensureOwned(params.id, session.user.escritorioId);
  if (!existing)
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  await prisma.interessadoProcessoTce.delete({ where: { id: params.id } });
  await registrarLog({
    userId: session.user.id,
    acao: "DESVINCULAR_INTERESSADO",
    entidade: "InteressadoProcessoTce",
    entidadeId: params.id,
    descricao: `${session.user.name ?? "Usuario"} desvinculou interessado ${existing.gestor.nome} do processo ${existing.processo.numero}`,
    ip: extrairIp(req),
  });
  return NextResponse.json({ ok: true });
}
