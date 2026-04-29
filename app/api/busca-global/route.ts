import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TCE_RECURSO_CODE, TCE_TIPO_LABELS } from "@/lib/tce-config";
import { tipoProcessoLabel } from "@/lib/processo-labels";

const LIMITE_POR_CATEGORIA = 5;

export type ResultadoBusca =
  | {
      tipo: "processo_tce";
      id: string;
      numero: string;
      label: string; // tipo do processo
      contexto: string | null; // municipio/exercicio
      href: string;
    }
  | {
      tipo: "processo_judicial";
      id: string;
      numero: string;
      label: string;
      contexto: string | null;
      href: string;
    }
  | {
      tipo: "gestor";
      id: string;
      numero: string; // aqui vai o nome
      label: string; // cargo
      contexto: string | null; // municipio
      href: string;
    }
  | {
      tipo: "municipio";
      id: string;
      numero: string; // aqui vai o nome
      label: string; // UF
      contexto: string | null;
      href: string;
    };

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length === 0) {
    return NextResponse.json({ resultados: [] });
  }

  const [processosTce, processosJud, gestores, municipios] =
    await Promise.all([
      prisma.processoTce.findMany({
        where: {
          escritorioId,
          numero: { contains: q, mode: "insensitive" },
        },
        orderBy: { updatedAt: "desc" },
        take: LIMITE_POR_CATEGORIA * 2,
        select: {
          id: true,
          numero: true,
          tipo: true,
          exercicio: true,
          ehRecurso: true,
          tipoRecurso: true,
          processoOrigem: { select: { id: true, numero: true } },
          municipio: { select: { nome: true, uf: true } },
        },
      }),
      prisma.processo.findMany({
        where: {
          escritorioId,
          numero: { contains: q, mode: "insensitive" },
        },
        orderBy: { updatedAt: "desc" },
        take: LIMITE_POR_CATEGORIA,
        select: {
          id: true,
          numero: true,
          tipo: true,
          tipoLivre: true,
          gestor: { select: { nome: true } },
        },
      }),
      prisma.gestor.findMany({
        where: {
          escritorioId,
          nome: { contains: q, mode: "insensitive" },
        },
        orderBy: { nome: "asc" },
        take: LIMITE_POR_CATEGORIA,
        select: {
          id: true,
          nome: true,
          cargo: true,
          municipio: true,
        },
      }),
      prisma.municipio.findMany({
        where: {
          escritorioId,
          nome: { contains: q, mode: "insensitive" },
        },
        orderBy: { nome: "asc" },
        take: LIMITE_POR_CATEGORIA,
        select: { id: true, nome: true, uf: true },
      }),
    ]);

  const resultados: ResultadoBusca[] = [
    ...processosTce.map<ResultadoBusca>((p) => {
      const codeRecurso = p.ehRecurso && p.tipoRecurso ? TCE_RECURSO_CODE[p.tipoRecurso] : null;
      const numeroComBadge = codeRecurso
        ? `${p.numero}  [${codeRecurso}]`
        : p.numero;
      const ctxBase = p.municipio
        ? `${p.municipio.nome}/${p.municipio.uf}${p.exercicio ? ` • ${p.exercicio}` : ""}`
        : p.exercicio;
      const contexto = p.ehRecurso && p.processoOrigem
        ? `recurso vinculado a ${p.processoOrigem.numero}${ctxBase ? ` • ${ctxBase}` : ""}`
        : ctxBase;
      return {
        tipo: "processo_tce",
        id: p.id,
        numero: numeroComBadge,
        label: TCE_TIPO_LABELS[p.tipo],
        contexto,
        href: `/app/tce/processos/${p.id}`,
      };
    }),
    ...processosJud.map<ResultadoBusca>((p) => ({
      tipo: "processo_judicial",
      id: p.id,
      numero: p.numero,
      label: tipoProcessoLabel(p.tipo, p.tipoLivre),
      contexto: p.gestor?.nome ?? null,
      href: `/app/processos/${p.id}`,
    })),
    ...gestores.map<ResultadoBusca>((g) => ({
      tipo: "gestor",
      id: g.id,
      numero: g.nome,
      label: g.cargo,
      contexto: g.municipio || null,
      href: `/app/tce/interessados/${g.id}`,
    })),
    ...municipios.map<ResultadoBusca>((m) => ({
      tipo: "municipio",
      id: m.id,
      numero: m.nome,
      label: m.uf,
      contexto: null,
      href: `/app/tce/municipios/${m.id}`,
    })),
  ];

  return NextResponse.json({ resultados });
}
