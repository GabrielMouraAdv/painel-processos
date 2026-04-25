import type { Grau, TipoProcesso, Tribunal } from "@prisma/client";

import { fasesEmPauta } from "@/lib/processo-labels";

export type TipoPendenciaJud = "memorial" | "despacho" | "prazo";

export type PendenciaJud = {
  id: string;
  tipo: TipoPendenciaJud;
  concluida: boolean;
  descricao: string;
  detalhe?: string | null;
  prazoId?: string | null;
};

export type ProcessoComPendenciasJud = {
  id: string;
  numero: string;
  tipo: TipoProcesso;
  tipoLivre: string | null;
  tribunal: Tribunal;
  grau: Grau;
  fase: string;
  gestorNome: string;
  advogadoNome: string;
  advogadoId: string;
  memorialPronto: boolean;
  despachadoComRelator: boolean;
  pendencias: PendenciaJud[];
};

const FASES_TRANSITADO = new Set(["transitado"]);

function exigeMemorial(fase: string, grau: Grau): boolean {
  if (FASES_TRANSITADO.has(fase)) return false;
  if (fasesEmPauta.includes(fase)) return true;
  return grau === "SEGUNDO" || grau === "SUPERIOR";
}

export function detectarPendenciasJud(
  processo: {
    id: string;
    fase: string;
    grau: Grau;
    memorialPronto: boolean;
    despachadoComRelator: boolean;
  },
  prazos: {
    id: string;
    tipo: string;
    data: Date;
    cumprido: boolean;
    diasRestantes: number;
  }[],
): PendenciaJud[] {
  const out: PendenciaJud[] = [];

  if (exigeMemorial(processo.fase, processo.grau)) {
    out.push({
      id: `${processo.id}-memorial`,
      tipo: "memorial",
      concluida: processo.memorialPronto,
      descricao: "Elaborar Memorial",
      detalhe: processo.memorialPronto
        ? "Memorial pronto"
        : "Memorial pendente de elaboracao",
    });
  }

  if (processo.memorialPronto) {
    out.push({
      id: `${processo.id}-despacho`,
      tipo: "despacho",
      concluida: processo.despachadoComRelator,
      descricao: "Agendar Despacho com Relator",
      detalhe: processo.despachadoComRelator
        ? "Despachado"
        : "Aguardando agendamento de despacho",
    });
  }

  for (const p of prazos) {
    out.push({
      id: `${processo.id}-prazo-${p.id}`,
      tipo: "prazo",
      concluida: p.cumprido,
      descricao: `Prazo de ${p.tipo} vencendo em ${p.diasRestantes <= 0 ? "hoje ou atrasado" : `${p.diasRestantes} dia${p.diasRestantes === 1 ? "" : "s"}`}`,
      detalhe: p.cumprido ? "Cumprido" : null,
      prazoId: p.id,
    });
  }

  return out;
}

export type AgregadoPendenciasJud = {
  memorial: number;
  despacho: number;
  prazo: number;
  total: number;
};

export function agregarPendenciasJud(
  itens: ProcessoComPendenciasJud[],
): AgregadoPendenciasJud {
  const agg: AgregadoPendenciasJud = {
    memorial: 0,
    despacho: 0,
    prazo: 0,
    total: 0,
  };
  for (const p of itens) {
    for (const pd of p.pendencias) {
      if (pd.concluida) continue;
      if (pd.tipo === "memorial") agg.memorial++;
      else if (pd.tipo === "despacho") agg.despacho++;
      else if (pd.tipo === "prazo") agg.prazo++;
      agg.total++;
    }
  }
  return agg;
}
