import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { interessadoTceInputSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const body = await req.json().catch(() => null);
  const parsed = interessadoTceInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const [processo, gestor] = await Promise.all([
    prisma.processoTce.findFirst({
      where: { id: data.processoId, escritorioId },
      select: { id: true, numero: true },
    }),
    prisma.gestor.findFirst({
      where: { id: data.gestorId, escritorioId },
      select: { id: true, nome: true },
    }),
  ]);
  if (!processo || !gestor) {
    return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });
  }

  const item = await prisma.interessadoProcessoTce.create({
    data: {
      processoId: data.processoId,
      gestorId: data.gestorId,
      cargo: data.cargo,
    },
    select: { id: true },
  });
  await registrarLog({
    userId: session.user.id,
    acao: "VINCULAR_INTERESSADO",
    entidade: "InteressadoProcessoTce",
    entidadeId: item.id,
    descricao: `${session.user.name ?? "Usuario"} vinculou interessado ${gestor.nome} ao processo ${processo.numero} (${data.cargo})`,
    ip: extrairIp(req),
  });
  return NextResponse.json(item, { status: 201 });
}
