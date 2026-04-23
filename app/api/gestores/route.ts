import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gestorInputSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = gestorInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  try {
    const gestor = await prisma.gestor.create({
      data: {
        nome: data.nome,
        cpf: data.cpf,
        municipio: data.municipio,
        cargo: data.cargo,
        observacoes: data.observacoes ?? null,
        escritorioId: session.user.escritorioId,
      },
      select: { id: true, nome: true, cpf: true, municipio: true, cargo: true },
    });
    return NextResponse.json(gestor, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro";
    if (msg.includes("Unique")) {
      return NextResponse.json(
        { error: "Ja existe um gestor com esse CPF" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Erro ao criar gestor" }, { status: 500 });
  }
}
