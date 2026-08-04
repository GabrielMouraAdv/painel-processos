import { NextResponse } from "next/server";

import {
  exigirSessaoEleitoral,
  sincronizarMovimentosEleitoral,
} from "@/lib/eleitoral";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

/** Atualiza os movimentos do processo consultando o Datajud (TRE-PE). */
export async function POST(_req: Request, { params }: Params) {
  const session = await exigirSessaoEleitoral();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const processo = await prisma.processoEleitoral.findFirst({
    where: { id: params.id, escritorioId: session.user.escritorioId },
    select: { id: true },
  });
  if (!processo) {
    return NextResponse.json(
      { error: "Processo nao encontrado" },
      { status: 404 },
    );
  }

  const resultado = await sincronizarMovimentosEleitoral(processo.id);
  if (resultado.erro) {
    return NextResponse.json({ error: resultado.erro }, { status: 502 });
  }
  return NextResponse.json(resultado);
}

/** Marca todos os movimentos do processo como lidos. */
export async function PATCH(_req: Request, { params }: Params) {
  const session = await exigirSessaoEleitoral();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const processo = await prisma.processoEleitoral.findFirst({
    where: { id: params.id, escritorioId: session.user.escritorioId },
    select: { id: true },
  });
  if (!processo) {
    return NextResponse.json(
      { error: "Processo nao encontrado" },
      { status: 404 },
    );
  }

  await prisma.movimentoEleitoral.updateMany({
    where: { processoId: processo.id, lida: false },
    data: { lida: true },
  });

  return NextResponse.json({ ok: true });
}
