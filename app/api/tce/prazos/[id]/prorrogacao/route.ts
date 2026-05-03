import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import { calcularDataVencimento } from "@/lib/dias-uteis";
import { prisma } from "@/lib/prisma";

const PRORROGACAO_DIAS_UTEIS = 15;

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const prazo = await prisma.prazoTce.findFirst({
    where: {
      id: params.id,
      processo: { escritorioId: session.user.escritorioId },
    },
    include: {
      processo: { select: { tipo: true, numero: true } },
    },
  });
  if (!prazo) {
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
  }
  if (prazo.processo.tipo === "MEDIDA_CAUTELAR") {
    return NextResponse.json(
      { error: "Prazos de medida cautelar nao sao prorrogaveis" },
      { status: 400 },
    );
  }
  if (!prazo.prorrogavel) {
    return NextResponse.json(
      { error: "Prazo improrrogavel" },
      { status: 400 },
    );
  }
  if (prazo.prorrogacaoPedida) {
    return NextResponse.json(
      { error: "Prorrogacao ja solicitada anteriormente" },
      { status: 400 },
    );
  }

  const novoVencimento = calcularDataVencimento(
    prazo.dataVencimento,
    PRORROGACAO_DIAS_UTEIS,
  );

  await prisma.prazoTce.update({
    where: { id: prazo.id },
    data: {
      prorrogacaoPedida: true,
      dataProrrogacao: new Date(),
      dataVencimento: novoVencimento,
      diasUteis: prazo.diasUteis + PRORROGACAO_DIAS_UTEIS,
    },
  });

  await registrarLog({
    userId: session.user.id,
    acao: ACOES.PRORROGAR_PRAZO_TCE,
    entidade: "PrazoTce",
    entidadeId: prazo.id,
    descricao: `${session.user.name ?? "Usuario"} pediu prorrogacao de +${PRORROGACAO_DIAS_UTEIS} dias uteis no prazo "${prazo.tipo}" do processo ${prazo.processo.numero}`,
    detalhes: { novoVencimento, totalDiasUteis: prazo.diasUteis + PRORROGACAO_DIAS_UTEIS },
    ip: extrairIp(req),
  });

  return NextResponse.json({ ok: true });
}
