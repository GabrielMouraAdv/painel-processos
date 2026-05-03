import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { andamentoInputSchema } from "@/lib/schemas";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const processo = await prisma.processo.findFirst({
    where: { id: params.id, escritorioId },
    select: { id: true, numero: true },
  });
  if (!processo) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = andamentoInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.andamento.create({
      data: {
        processoId: params.id,
        data: data.data,
        grau: data.grau,
        fase: data.fase,
        resultado: data.resultado ?? null,
        texto: data.texto,
        autorId: session.user.id,
      },
    });

    await tx.processo.update({
      where: { id: params.id },
      data: {
        grau: data.grau,
        fase: data.fase,
        resultado: data.resultado ?? null,
      },
    });

    if (data.acoes.length > 0) {
      await tx.prazo.createMany({
        data: data.acoes.map((a) => ({
          processoId: params.id,
          tipo: a.tipoPrazo,
          data: a.data,
          observacoes: null,
          geradoAuto: true,
          origemFase: a.origemFase ?? data.fase,
          advogadoRespId: session.user.id,
        })),
      });
    }
  });

  await registrarLog({
    userId: session.user.id,
    acao: ACOES.CRIAR_ANDAMENTO,
    entidade: "Andamento",
    entidadeId: params.id,
    descricao: `${session.user.name ?? "Usuario"} registrou andamento no processo ${processo.numero} - fase ${data.fase}`,
    detalhes: { fase: data.fase, grau: data.grau, resultado: data.resultado, prazosGerados: data.acoes.length },
    ip: extrairIp(req),
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
