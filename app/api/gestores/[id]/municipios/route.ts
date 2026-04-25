import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { TipoInteressado } from "@prisma/client";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  municipioId: z.string().min(1, "Informe o municipio"),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const gestor = await prisma.gestor.findFirst({
    where: { id: params.id, escritorioId },
    select: { id: true, tipoInteressado: true },
  });
  if (!gestor)
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
  if (gestor.tipoInteressado !== TipoInteressado.PESSOA_JURIDICA) {
    return NextResponse.json(
      { error: "Vinculo de multiplos municipios apenas para pessoa juridica" },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const municipio = await prisma.municipio.findFirst({
    where: { id: parsed.data.municipioId, escritorioId },
    select: { id: true },
  });
  if (!municipio)
    return NextResponse.json(
      { error: "Municipio invalido" },
      { status: 400 },
    );

  try {
    const vinculo = await prisma.gestorMunicipio.create({
      data: {
        gestorId: params.id,
        municipioId: municipio.id,
      },
      select: { id: true },
    });
    return NextResponse.json(vinculo, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro";
    if (msg.includes("Unique")) {
      return NextResponse.json(
        { error: "Esse municipio ja esta vinculado" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Erro ao vincular" }, { status: 500 });
  }
}
