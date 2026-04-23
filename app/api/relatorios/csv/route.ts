import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  faseLabel,
  grauLabels,
  riscoLabels,
  tribunalLabels,
  tipoLabels,
} from "@/lib/processo-labels";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(d);
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const url = new URL(req.url);
  const de = url.searchParams.get("de") ?? "";
  const ate = url.searchParams.get("ate") ?? "";

  const where: Prisma.ProcessoWhereInput = {
    escritorioId,
    ...((de || ate) && {
      dataDistribuicao: {
        ...(de && { gte: new Date(de) }),
        ...(ate && { lte: new Date(`${ate}T23:59:59`) }),
      },
    }),
  };

  const processos = await prisma.processo.findMany({
    where,
    orderBy: { dataDistribuicao: "desc" },
    include: {
      gestor: { select: { nome: true, municipio: true } },
      advogado: { select: { nome: true, email: true } },
    },
  });

  const header = [
    "Numero",
    "Tipo",
    "Tribunal",
    "Juizo",
    "Grau",
    "Fase",
    "Resultado",
    "Risco",
    "Valor (R$)",
    "Data distribuicao",
    "Gestor",
    "Municipio",
    "Advogado",
    "Email advogado",
  ];

  const linhas = processos.map((p) => [
    p.numero,
    tipoLabels[p.tipo],
    tribunalLabels[p.tribunal],
    p.juizo,
    grauLabels[p.grau],
    faseLabel(p.fase),
    p.resultado ?? "",
    riscoLabels[p.risco],
    p.valor ? Number(p.valor).toFixed(2).replace(".", ",") : "",
    formatDate(p.dataDistribuicao),
    p.gestor.nome,
    p.gestor.municipio,
    p.advogado.nome,
    p.advogado.email,
  ]);

  const csv = [header, ...linhas]
    .map((row) => row.map(csvEscape).join(";"))
    .join("\r\n");

  const bom = "﻿";
  const filename = `processos${de || ate ? `_${de || ""}_${ate || ""}` : ""}.csv`;

  return new NextResponse(bom + csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
