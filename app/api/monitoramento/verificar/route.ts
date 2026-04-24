import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { verificarNovasMovimentacoes } from "@/lib/datajud";
import { verificarNovasPublicacoes } from "@/lib/djen";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const cronSecret = req.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET ?? "";
  const cronAuthorized =
    expectedSecret.length > 0 && cronSecret === expectedSecret;

  if (!session?.user && !cronAuthorized) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}) as any);
  const processoIdInput =
    typeof body?.processoId === "string" && body.processoId.length > 0
      ? body.processoId
      : null;

  let processosIds: string[] = [];

  if (processoIdInput) {
    const where = session?.user
      ? { id: processoIdInput, escritorioId: session.user.escritorioId }
      : { id: processoIdInput };
    const p = await prisma.processo.findFirst({
      where,
      select: { id: true },
    });
    if (!p) {
      return NextResponse.json(
        { error: "Processo nao encontrado" },
        { status: 404 },
      );
    }
    processosIds = [p.id];
  } else {
    const where: any = { monitoramento: { monitoramentoAtivo: true } };
    if (session?.user) where.escritorioId = session.user.escritorioId;
    const lista = await prisma.processo.findMany({
      where,
      select: { id: true },
    });
    processosIds = lista.map((p) => p.id);
  }

  let novasMovimentacoes = 0;
  let novasPublicacoes = 0;
  const erros: { processoId: string; erro: string }[] = [];

  for (const id of processosIds) {
    try {
      const m = await verificarNovasMovimentacoes(id);
      novasMovimentacoes += m;
    } catch (err: any) {
      erros.push({ processoId: id, erro: `mov: ${err?.message ?? err}` });
    }
    try {
      const p = await verificarNovasPublicacoes(id);
      novasPublicacoes += p;
    } catch (err: any) {
      erros.push({ processoId: id, erro: `pub: ${err?.message ?? err}` });
    }
  }

  return NextResponse.json({
    processosVerificados: processosIds.length,
    novasMovimentacoes,
    novasPublicacoes,
    erros,
  });
}
