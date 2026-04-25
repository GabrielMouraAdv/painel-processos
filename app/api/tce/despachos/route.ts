import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { CamaraTce, type Prisma } from "@prisma/client";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Marca um processo TCE como incluido manualmente na tela de despachos
const addSchema = z.object({
  processoId: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const body = await req.json().catch(() => null);
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos" },
      { status: 400 },
    );
  }

  const processo = await prisma.processoTce.findFirst({
    where: { id: parsed.data.processoId, escritorioId },
    select: { id: true },
  });
  if (!processo) {
    return NextResponse.json(
      { error: "Processo nao encontrado" },
      { status: 404 },
    );
  }

  await prisma.processoTce.update({
    where: { id: processo.id },
    data: { incluidoNoDespacho: true },
  });
  return NextResponse.json({ ok: true });
}

// GET com filtros: q (numero), camara, relator, status
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const camaraParam = url.searchParams.get("camara");
  const relator = url.searchParams.get("relator") ?? "";
  const status = url.searchParams.get("status") ?? "todos";

  const baseInclude: Prisma.ProcessoTceWhereInput["OR"] = [
    { memorialPronto: true },
    { despachadoComRelator: true },
    { incluidoNoDespacho: true },
  ];

  const where: Prisma.ProcessoTceWhereInput = {
    escritorioId,
    OR: baseInclude,
  };

  if (q.trim()) {
    where.numero = { contains: q.trim(), mode: "insensitive" };
  }
  if (camaraParam && camaraParam !== "todas") {
    where.camara = camaraParam as CamaraTce;
  }
  if (relator.trim()) {
    where.relator = { contains: relator.trim(), mode: "insensitive" };
  }
  if (status === "pendente") {
    where.AND = [
      { memorialPronto: true },
      { despachadoComRelator: false },
    ];
  } else if (status === "despachado") {
    where.AND = [{ despachadoComRelator: true }];
  } else if (status === "memorial_pendente") {
    where.AND = [{ memorialPronto: false }];
  }

  const processos = await prisma.processoTce.findMany({
    where,
    orderBy: [
      { despachadoComRelator: "asc" },
      { memorialPronto: "desc" },
      { dataAutuacao: "desc" },
    ],
    include: {
      municipio: { select: { id: true, nome: true, uf: true } },
      interessados: {
        include: {
          gestor: { select: { id: true, nome: true } },
        },
      },
      documentos: {
        where: { tipo: "memorial" },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return NextResponse.json(processos);
}
