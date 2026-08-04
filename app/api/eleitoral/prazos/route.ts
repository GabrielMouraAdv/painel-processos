import { NextResponse } from "next/server";

import { registrarLog } from "@/lib/audit-log";
import {
  exigirSessaoEleitoral,
  prazoEleitoralCreateSchema,
} from "@/lib/eleitoral";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await exigirSessaoEleitoral();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const body = await req.json().catch(() => null);
  const parsed = prazoEleitoralCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const processo = await prisma.processoEleitoral.findFirst({
    where: { id: data.processoId, escritorioId },
    select: { id: true, numero: true },
  });
  if (!processo) {
    return NextResponse.json(
      { error: "Processo nao encontrado" },
      { status: 400 },
    );
  }

  if (data.responsavelId) {
    const resp = await prisma.user.findFirst({
      where: { id: data.responsavelId, escritorioId },
      select: { id: true },
    });
    if (!resp) {
      return NextResponse.json(
        { error: "Responsavel nao encontrado" },
        { status: 400 },
      );
    }
  }

  const prazo = await prisma.prazoEleitoral.create({
    data: {
      processoId: data.processoId,
      tarefa: data.tarefa,
      data: data.data,
      hora: data.hora || null,
      responsavelId: data.responsavelId || null,
      observacoes: data.observacoes || null,
      status: data.status,
      cumprido: data.status === "CUMPRIDO",
    },
  });

  await registrarLog({
    userId: session.user.id,
    acao: "CRIAR_PRAZO_ELEITORAL",
    entidade: "PrazoEleitoral",
    entidadeId: prazo.id,
    descricao: `Cadastrou prazo eleitoral (${data.tarefa}) no processo ${processo.numero}`,
  });

  return NextResponse.json({ prazo }, { status: 201 });
}
