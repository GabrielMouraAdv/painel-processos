import { NextResponse } from "next/server";

import { registrarLog } from "@/lib/audit-log";
import {
  exigirSessaoEleitoral,
  processoEleitoralUpdateSchema,
} from "@/lib/eleitoral";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  const session = await exigirSessaoEleitoral();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const processo = await prisma.processoEleitoral.findFirst({
    where: { id: params.id, escritorioId: session.user.escritorioId },
    include: {
      coordenador: { select: { id: true, nome: true } },
      advogadoResp: { select: { id: true, nome: true } },
      prazos: {
        orderBy: [{ cumprido: "asc" }, { data: "asc" }],
        include: { responsavel: { select: { id: true, nome: true } } },
      },
      movimentos: { orderBy: { dataHora: "desc" } },
    },
  });
  if (!processo) {
    return NextResponse.json(
      { error: "Processo nao encontrado" },
      { status: 404 },
    );
  }

  return NextResponse.json({ processo });
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await exigirSessaoEleitoral();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const existente = await prisma.processoEleitoral.findFirst({
    where: { id: params.id, escritorioId: session.user.escritorioId },
    select: { id: true, numero: true },
  });
  if (!existente) {
    return NextResponse.json(
      { error: "Processo nao encontrado" },
      { status: 404 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = processoEleitoralUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const processo = await prisma.processoEleitoral.update({
    where: { id: existente.id },
    data: {
      ...(d.numero !== undefined ? { numero: d.numero } : {}),
      ...(d.classe !== undefined ? { classe: d.classe } : {}),
      ...(d.apelido !== undefined ? { apelido: d.apelido || null } : {}),
      ...(d.parteAutora !== undefined ? { parteAutora: d.parteAutora } : {}),
      ...(d.parteRe !== undefined ? { parteRe: d.parteRe } : {}),
      ...(d.polo !== undefined ? { polo: d.polo } : {}),
      ...(d.objeto !== undefined ? { objeto: d.objeto } : {}),
      ...(d.relator !== undefined ? { relator: d.relator || null } : {}),
      ...(d.coordenadorId !== undefined
        ? { coordenadorId: d.coordenadorId || null }
        : {}),
      ...(d.advogadoRespId !== undefined
        ? { advogadoRespId: d.advogadoRespId || null }
        : {}),
      ...(d.observacoes !== undefined
        ? { observacoes: d.observacoes || null }
        : {}),
      ...(d.status !== undefined ? { status: d.status } : {}),
      ...(d.resultado !== undefined ? { resultado: d.resultado || null } : {}),
    },
  });

  await registrarLog({
    userId: session.user.id,
    acao: "EDITAR_PROCESSO_ELEITORAL",
    entidade: "ProcessoEleitoral",
    entidadeId: processo.id,
    descricao: `Editou processo eleitoral ${processo.numero}`,
  });

  return NextResponse.json({ processo });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await exigirSessaoEleitoral();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const existente = await prisma.processoEleitoral.findFirst({
    where: { id: params.id, escritorioId: session.user.escritorioId },
    select: { id: true, numero: true },
  });
  if (!existente) {
    return NextResponse.json(
      { error: "Processo nao encontrado" },
      { status: 404 },
    );
  }

  await prisma.processoEleitoral.delete({ where: { id: existente.id } });

  await registrarLog({
    userId: session.user.id,
    acao: "EXCLUIR_PROCESSO_ELEITORAL",
    entidade: "ProcessoEleitoral",
    entidadeId: existente.id,
    descricao: `Excluiu processo eleitoral ${existente.numero}`,
  });

  return NextResponse.json({ ok: true });
}
