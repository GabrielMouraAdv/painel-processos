import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processoInputSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = processoInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const escritorioId = session.user.escritorioId;

  const [gestor, advogado] = await Promise.all([
    prisma.gestor.findFirst({ where: { id: data.gestorId, escritorioId } }),
    prisma.user.findFirst({ where: { id: data.advogadoId, escritorioId } }),
  ]);

  if (!gestor) {
    return NextResponse.json({ error: "Gestor nao encontrado" }, { status: 400 });
  }
  if (!advogado) {
    return NextResponse.json({ error: "Advogado nao encontrado" }, { status: 400 });
  }

  try {
    const processo = await prisma.processo.create({
      data: {
        numero: data.numero,
        tipo: data.tipo,
        tipoLivre: data.tipo === "OUTRO" ? (data.tipoLivre ?? null) : null,
        tribunal: data.tribunal,
        juizo: data.juizo,
        grau: data.grau,
        fase: data.fase,
        resultado: data.resultado ?? null,
        risco: data.risco,
        valor: data.valor ?? null,
        dataDistribuicao: data.dataDistribuicao,
        objeto: data.objeto,
        gestorId: data.gestorId,
        advogadoId: data.advogadoId,
        escritorioId,
      },
      select: { id: true },
    });
    await registrarLog({
      userId: session.user.id,
      acao: ACOES.CRIAR_PROCESSO,
      entidade: "Processo",
      entidadeId: processo.id,
      descricao: `${session.user.name ?? "Usuario"} criou processo ${data.numero} (${data.tribunal} - ${data.tipo})`,
      detalhes: { numero: data.numero, tipo: data.tipo, tribunal: data.tribunal, gestorId: data.gestorId, advogadoId: data.advogadoId },
      ip: extrairIp(req),
    });
    return NextResponse.json({ id: processo.id }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro";
    if (msg.includes("Unique")) {
      return NextResponse.json(
        { error: "Ja existe um processo com esse numero" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Erro ao criar processo" }, { status: 500 });
  }
}
