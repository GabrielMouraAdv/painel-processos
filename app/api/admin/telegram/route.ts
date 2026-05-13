import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Lista todos os usuarios do escritorio com status do Telegram.
// Nao expoe o token (mantemos criptografado).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }
  const lista = await prisma.user.findMany({
    where: { escritorioId: session.user.escritorioId },
    orderBy: { nome: "asc" },
    select: {
      id: true,
      nome: true,
      email: true,
      role: true,
      telegramAtivo: true,
      telegramBotUsername: true,
      telegramReceberLembreteDiario: true,
    },
  });
  return NextResponse.json({ usuarios: lista });
}
