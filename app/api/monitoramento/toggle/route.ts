import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  processoId: z.string().min(1),
  ativo: z.boolean(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const processo = await prisma.processo.findFirst({
    where: { id: parsed.data.processoId, escritorioId },
    select: { id: true },
  });
  if (!processo) {
    return NextResponse.json(
      { error: "Processo nao encontrado" },
      { status: 404 },
    );
  }

  const config = await prisma.monitoramentoConfig.upsert({
    where: { processoId: processo.id },
    create: {
      processoId: processo.id,
      monitoramentoAtivo: parsed.data.ativo,
    },
    update: {
      monitoramentoAtivo: parsed.data.ativo,
    },
    select: {
      id: true,
      monitoramentoAtivo: true,
      ultimaVerificacao: true,
      ultimoErro: true,
      totalVerificacoes: true,
    },
  });

  return NextResponse.json({ config });
}
