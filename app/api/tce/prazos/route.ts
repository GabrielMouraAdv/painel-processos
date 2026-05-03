import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { prazoTceCreateSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const body = await req.json().catch(() => null);
  const parsed = prazoTceCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const processo = await prisma.processoTce.findFirst({
    where: { id: data.processoId, escritorioId },
    select: { id: true, numero: true },
  });
  if (!processo) {
    return NextResponse.json(
      { error: "Processo nao encontrado" },
      { status: 400 },
    );
  }

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

  const prazo = await prisma.prazoTce.create({
    data: {
      processoId: data.processoId,
      tipo: data.tipo,
      dataIntimacao: data.dataIntimacao,
      dataVencimento: data.dataVencimento,
      diasUteis: data.diasUteis,
      prorrogavel: data.prorrogavel ?? true,
      prorrogacaoPedida: data.prorrogacaoPedida ?? false,
      dataProrrogacao: data.dataProrrogacao ?? null,
      cumprido: data.cumprido ?? false,
      advogadoRespId: data.advogadoRespId,
      observacoes: data.observacoes || null,
    },
    select: { id: true },
  });
  await registrarLog({
    userId: session.user.id,
    acao: ACOES.CRIAR_PRAZO_TCE,
    entidade: "PrazoTce",
    entidadeId: prazo.id,
    descricao: `${session.user.name ?? "Usuario"} criou prazo TCE "${data.tipo}" no processo ${processo.numero}`,
    detalhes: { tipo: data.tipo, dataVencimento: data.dataVencimento, diasUteis: data.diasUteis, advogadoRespId: data.advogadoRespId },
    ip: extrairIp(req),
  });
  return NextResponse.json(prazo, { status: 201 });
}
