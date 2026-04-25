import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; municipioId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const gestor = await prisma.gestor.findFirst({
    where: { id: params.id, escritorioId },
    select: { id: true },
  });
  if (!gestor)
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  await prisma.gestorMunicipio.deleteMany({
    where: { gestorId: params.id, municipioId: params.municipioId },
  });
  return NextResponse.json({ ok: true });
}
