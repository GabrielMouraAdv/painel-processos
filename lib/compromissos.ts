import { prisma } from "@/lib/prisma";
import { filtroVisibilidadeCompromissos } from "@/lib/permissoes";

export type EventoOrigem = "compromisso" | "prazoTce" | "prazoJudicial";

export type CompromissoCategoriaEvento =
  | "ESCRITORIO"
  | "PROFISSIONAL_PRIVADO"
  | "PESSOAL";

export type CalendarEvento = {
  id: string;
  origem: EventoOrigem;
  titulo: string;
  descricao: string | null;
  dataInicio: string;
  dataFim: string | null;
  diaInteiro: boolean;
  cor: string | null;
  tipo: string | null;
  categoria: CompromissoCategoriaEvento | null;
  privado: boolean;
  local: string | null;
  cumprido: boolean;
  dispensado: boolean;
  advogado: { id: string; nome: string } | null;
  processoRef: {
    tipo: "tce" | "judicial";
    id: string;
    numero: string;
  } | null;
};

export const COR_PRAZO_TCE = "#3b82f6";
export const COR_PRAZO_JUDICIAL = "#10b981";
export const COR_COMPROMISSO_DEFAULT = "#8b5cf6";

type Filtros = {
  escritorioId: string;
  inicio: Date;
  fim: Date;
  advogadoId?: string;
  origens?: EventoOrigem[];
  userId: string;
};

export async function carregarEventos(
  filtros: Filtros,
): Promise<CalendarEvento[]> {
  const { escritorioId, inicio, fim, advogadoId, origens, userId } = filtros;

  const incluirCompromissos = !origens || origens.includes("compromisso");
  const incluirPrazoTce = !origens || origens.includes("prazoTce");
  const incluirPrazoJud = !origens || origens.includes("prazoJudicial");

  const [compromissos, prazosTce, prazosJud] = await Promise.all([
    incluirCompromissos
      ? prisma.compromisso.findMany({
          where: {
            escritorioId,
            ...(advogadoId && { advogadoId }),
            dataInicio: { gte: inicio, lte: fim },
            ...filtroVisibilidadeCompromissos({ id: userId }),
          },
          include: {
            advogado: { select: { id: true, nome: true } },
            processoTce: { select: { id: true, numero: true } },
            processo: { select: { id: true, numero: true } },
          },
          orderBy: { dataInicio: "asc" },
        })
      : Promise.resolve([]),
    incluirPrazoTce
      ? prisma.prazoTce.findMany({
          where: {
            processo: { escritorioId },
            ...(advogadoId && { advogadoRespId: advogadoId }),
            dataVencimento: { gte: inicio, lte: fim },
          },
          include: {
            advogadoResp: { select: { id: true, nome: true } },
            processo: { select: { id: true, numero: true } },
          },
          orderBy: { dataVencimento: "asc" },
        })
      : Promise.resolve([]),
    incluirPrazoJud
      ? prisma.prazo.findMany({
          where: {
            processo: { escritorioId },
            ...(advogadoId && { advogadoRespId: advogadoId }),
            data: { gte: inicio, lte: fim },
          },
          include: {
            advogadoResp: { select: { id: true, nome: true } },
            processo: { select: { id: true, numero: true } },
          },
          orderBy: { data: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const eventos: CalendarEvento[] = [];

  for (const c of compromissos) {
    eventos.push({
      id: c.id,
      origem: "compromisso",
      titulo: c.titulo,
      descricao: c.descricao,
      dataInicio: c.dataInicio.toISOString(),
      dataFim: c.dataFim ? c.dataFim.toISOString() : null,
      diaInteiro: c.diaInteiro,
      cor: c.cor ?? COR_COMPROMISSO_DEFAULT,
      tipo: c.tipo,
      categoria: (c.categoria as CompromissoCategoriaEvento) ?? "ESCRITORIO",
      privado: c.privado,
      local: c.local,
      cumprido: c.cumprido,
      dispensado: false,
      advogado: c.advogado
        ? { id: c.advogado.id, nome: c.advogado.nome }
        : null,
      processoRef: c.processoTce
        ? { tipo: "tce", id: c.processoTce.id, numero: c.processoTce.numero }
        : c.processo
          ? {
              tipo: "judicial",
              id: c.processo.id,
              numero: c.processo.numero,
            }
          : null,
    });
  }

  for (const p of prazosTce) {
    eventos.push({
      id: p.id,
      origem: "prazoTce",
      titulo: `${p.tipo} — ${p.processo.numero}`,
      descricao: p.observacoes,
      dataInicio: p.dataVencimento.toISOString(),
      dataFim: null,
      diaInteiro: true,
      cor: COR_PRAZO_TCE,
      tipo: p.tipo,
      categoria: "ESCRITORIO",
      privado: false,
      local: null,
      cumprido: p.cumprido,
      dispensado: p.dispensado,
      advogado: p.advogadoResp
        ? { id: p.advogadoResp.id, nome: p.advogadoResp.nome }
        : null,
      processoRef: {
        tipo: "tce",
        id: p.processo.id,
        numero: p.processo.numero,
      },
    });
  }

  for (const p of prazosJud) {
    eventos.push({
      id: p.id,
      origem: "prazoJudicial",
      titulo: `${p.tipo} — ${p.processo.numero}`,
      descricao: p.observacoes,
      dataInicio: p.data.toISOString(),
      dataFim: null,
      diaInteiro: !p.hora,
      cor: COR_PRAZO_JUDICIAL,
      tipo: p.tipo,
      categoria: "ESCRITORIO",
      privado: false,
      local: null,
      cumprido: p.cumprido,
      dispensado: p.dispensado,
      advogado: p.advogadoResp
        ? { id: p.advogadoResp.id, nome: p.advogadoResp.nome }
        : null,
      processoRef: {
        tipo: "judicial",
        id: p.processo.id,
        numero: p.processo.numero,
      },
    });
  }

  return eventos.sort((a, b) =>
    a.dataInicio.localeCompare(b.dataInicio),
  );
}

export function startOfMonth(d: Date): Date {
  const r = new Date(d);
  r.setDate(1);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function endOfMonth(d: Date): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + 1, 0);
  r.setHours(23, 59, 59, 999);
  return r;
}
