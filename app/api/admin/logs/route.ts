import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role, type Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 50;

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  const escritorioId = session.user.escritorioId;
  const url = new URL(req.url);
  const usuario = url.searchParams.get("usuario") ?? "";
  const acao = url.searchParams.get("acao") ?? "";
  const entidade = url.searchParams.get("entidade") ?? "";
  const de = url.searchParams.get("de") ?? "";
  const ate = url.searchParams.get("ate") ?? "";
  const pageRaw = parseInt(url.searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const where: Prisma.LogAuditoriaWhereInput = {
    user: { escritorioId },
  };
  if (usuario) where.userId = usuario;
  if (acao) where.acao = acao;
  if (entidade) where.entidade = entidade;
  if (de || ate) {
    const range: { gte?: Date; lte?: Date } = {};
    if (de) {
      const d = new Date(de);
      if (!Number.isNaN(d.getTime())) {
        d.setHours(0, 0, 0, 0);
        range.gte = d;
      }
    }
    if (ate) {
      const d = new Date(ate);
      if (!Number.isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        range.lte = d;
      }
    }
    if (range.gte || range.lte) where.createdAt = range;
  }

  const [total, logs] = await prisma.$transaction([
    prisma.logAuditoria.count({ where }),
    prisma.logAuditoria.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { id: true, nome: true, email: true } },
      },
    }),
  ]);

  // Compromissos privados sao visiveis no log apenas para o proprio autor.
  const userIdLogado = session.user.id;
  const logsFiltrados = logs.filter((l) => {
    if (l.entidade !== "Compromisso") return true;
    if (l.userId === userIdLogado) return true;
    if (!l.detalhes) return true;
    try {
      const parsed = JSON.parse(l.detalhes) as { privado?: boolean };
      return parsed?.privado !== true;
    } catch {
      return true;
    }
  });

  return NextResponse.json({
    logs: logsFiltrados,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}
