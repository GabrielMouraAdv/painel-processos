import { NextResponse } from "next/server";

import { exigirSessaoEleitoral } from "@/lib/eleitoral";
import { labelClasseEleitoral } from "@/lib/eleitoral-labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export type ResultadoBuscaEleitoral = {
  tipo: "processo" | "prazo" | "relatorio";
  id: string;
  titulo: string;
  contexto: string | null;
  href: string;
};

const LIMITE_POR_TIPO = 8;

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function somenteDigitos(texto: string): string {
  return texto.replace(/\D+/g, "");
}

export async function GET(req: Request) {
  const session = await exigirSessaoEleitoral();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ resultados: [] });
  }

  const alvo = normalizar(q);
  const alvoDigitos = somenteDigitos(q);

  const [processos, prazos, relatorios] = await Promise.all([
    // Os processos do modulo sao poucos: buscamos todos e filtramos aqui para
    // que o numero CNJ case com ou sem pontuacao ("0600643", "06006431820...").
    prisma.processoEleitoral.findMany({
      where: { escritorioId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        numero: true,
        classe: true,
        apelido: true,
        parteAutora: true,
        parteRe: true,
        objeto: true,
        relator: true,
      },
    }),
    prisma.prazoEleitoral.findMany({
      where: {
        processo: { escritorioId },
        tarefa: { contains: q, mode: "insensitive" },
      },
      orderBy: { data: "desc" },
      take: LIMITE_POR_TIPO,
      include: {
        processo: { select: { id: true, numero: true, apelido: true } },
        responsavel: { select: { nome: true } },
      },
    }),
    prisma.relatorioEleitoral.findMany({
      where: {
        escritorioId,
        titulo: { contains: q, mode: "insensitive" },
      },
      orderBy: { dataReferencia: "desc" },
      take: LIMITE_POR_TIPO,
      select: { id: true, titulo: true, dataReferencia: true },
    }),
  ]);

  const processosFiltrados = processos
    .filter((p) => {
      if (alvoDigitos.length >= 3 && somenteDigitos(p.numero).includes(alvoDigitos)) {
        return true;
      }
      const campos = [
        p.numero,
        p.apelido ?? "",
        p.parteAutora,
        p.parteRe,
        p.objeto,
        p.relator ?? "",
      ];
      return campos.some((c) => normalizar(c).includes(alvo));
    })
    .slice(0, LIMITE_POR_TIPO);

  const resultados: ResultadoBuscaEleitoral[] = [
    ...processosFiltrados.map((p) => ({
      tipo: "processo" as const,
      id: p.id,
      titulo: `${labelClasseEleitoral(p.classe)} ${p.numero}`,
      contexto: [p.apelido, `${p.parteAutora} x ${p.parteRe}`]
        .filter(Boolean)
        .join(" • "),
      href: `/app/eleitoral/processos/${p.id}`,
    })),
    ...prazos.map((p) => ({
      tipo: "prazo" as const,
      id: p.id,
      titulo: p.tarefa,
      contexto: [
        p.data.toLocaleDateString("pt-BR", { timeZone: "UTC" }),
        p.responsavel?.nome,
        p.processo.apelido ?? p.processo.numero,
      ]
        .filter(Boolean)
        .join(" • "),
      href: `/app/eleitoral/processos/${p.processo.id}`,
    })),
    ...relatorios.map((r) => ({
      tipo: "relatorio" as const,
      id: r.id,
      titulo: r.titulo,
      contexto: r.dataReferencia.toLocaleDateString("pt-BR", {
        timeZone: "UTC",
      }),
      href: "/app/eleitoral/relatorios",
    })),
  ];

  return NextResponse.json({ resultados });
}
