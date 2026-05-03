import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { municipioInputSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const body = await req.json().catch(() => null);
  const parsed = municipioInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const municipio = await prisma.municipio.create({
    data: {
      nome: data.nome,
      uf: data.uf.toUpperCase(),
      cnpjPrefeitura: data.cnpjPrefeitura ?? null,
      observacoes: data.observacoes ?? null,
      escritorioId,
    },
    select: { id: true, nome: true, uf: true },
  });
  await registrarLog({
    userId: session.user.id,
    acao: ACOES.CRIAR_MUNICIPIO,
    entidade: "Municipio",
    entidadeId: municipio.id,
    descricao: `${session.user.name ?? "Usuario"} cadastrou municipio ${municipio.nome} - ${municipio.uf}`,
    ip: extrairIp(req),
  });
  return NextResponse.json(municipio, { status: 201 });
}
