import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { TipoInteressado } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gestorInputSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const body = await req.json().catch(() => null);
  const parsed = gestorInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const isPj = data.tipoInteressado === TipoInteressado.PESSOA_JURIDICA;

  // Valida municipios da PJ pertencem ao escritorio
  let municipiosValidados: { id: string; nome: string }[] = [];
  if (isPj && data.municipioIds.length > 0) {
    municipiosValidados = await prisma.municipio.findMany({
      where: { id: { in: data.municipioIds }, escritorioId },
      select: { id: true, nome: true },
    });
    if (municipiosValidados.length !== data.municipioIds.length) {
      return NextResponse.json(
        { error: "Algum municipio informado e invalido" },
        { status: 400 },
      );
    }
  }

  const nomePrincipal = isPj
    ? (data.razaoSocial as string)
    : (data.nome as string);

  try {
    const gestor = await prisma.gestor.create({
      data: {
        tipoInteressado: data.tipoInteressado,
        nome: nomePrincipal,
        cpf: isPj ? null : (data.cpf ?? null),
        municipio: isPj ? "" : (data.municipio ?? ""),
        cargo: isPj ? "" : (data.cargo ?? ""),
        email: data.email ?? null,
        telefone: data.telefone ?? null,
        observacoes: data.observacoes ?? null,
        razaoSocial: isPj ? (data.razaoSocial ?? null) : null,
        nomeFantasia: isPj ? (data.nomeFantasia ?? null) : null,
        cnpj: isPj ? (data.cnpj ?? null) : null,
        ramoAtividade: isPj ? (data.ramoAtividade ?? null) : null,
        escritorioId,
        ...(isPj &&
          municipiosValidados.length > 0 && {
            municipiosAtuacao: {
              create: municipiosValidados.map((m) => ({
                municipioId: m.id,
              })),
            },
          }),
      },
      select: { id: true, nome: true, tipoInteressado: true },
    });
    return NextResponse.json(gestor, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro";
    if (msg.includes("Unique")) {
      return NextResponse.json(
        { error: "Ja existe um interessado com esse CPF/CNPJ" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Erro ao criar interessado" },
      { status: 500 },
    );
  }
}
