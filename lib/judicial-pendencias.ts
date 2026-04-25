import type { Grau, TipoProcesso, Tribunal } from "@prisma/client";

import { fasesEmPauta } from "@/lib/processo-labels";

export type TipoPendenciaJud = "memorial" | "despacho" | "prazo";

export type PrazoStatusJud = "alerta" | "vencido" | "cumprido_com_atraso";

export type PendenciaJud = {
  id: string;
  tipo: TipoPendenciaJud;
  concluida: boolean;
  descricao: string;
  detalhe?: string | null;
  prazoId?: string | null;
  // Apenas para tipo "prazo":
  prazoStatus?: PrazoStatusJud | null;
  advogadoResp?: string | null;
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
    advogadoResp?: string | null;
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
    let status: PrazoStatusJud | null = null;
    let descricao: string;
    let detalhe: string | null = null;
    let concluida = p.cumprido;

    if (p.cumprido) {
      const venceuHaDias = -p.diasRestantes;
      if (p.diasRestantes < 0 && venceuHaDias <= 7) {
        status = "cumprido_com_atraso";
        concluida = false;
        descricao = `Prazo de ${p.tipo} cumprido com atraso`;
        detalhe = `Vencimento ha ${venceuHaDias} dia${venceuHaDias === 1 ? "" : "s"}`;
      } else {
        descricao = `Prazo de ${p.tipo} cumprido`;
        detalhe = "Cumprido";
      }
    } else if (p.diasRestantes < 0) {
      status = "vencido";
      const venceuHaDias = -p.diasRestantes;
      descricao = `PRAZO VENCIDO SEM PROVIDENCIAS - ${p.tipo}`;
      detalhe = `Venceu ha ${venceuHaDias} dia${venceuHaDias === 1 ? "" : "s"}`;
    } else {
      status = "alerta";
      descricao = `Prazo de ${p.tipo} vencendo em ${p.diasRestantes <= 0 ? "hoje" : `${p.diasRestantes} dia${p.diasRestantes === 1 ? "" : "s"}`}`;
    }

    out.push({
      id: `${processo.id}-prazo-${p.id}`,
      tipo: "prazo",
      concluida,
      descricao,
      detalhe,
      prazoId: p.id,
      prazoStatus: status,
      advogadoResp: p.advogadoResp ?? null,
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
      if (pd.tipo === "prazo" && pd.prazoStatus === "cumprido_com_atraso")
        continue;
      if (pd.tipo === "memorial") agg.memorial++;
      else if (pd.tipo === "despacho") agg.despacho++;
      else if (pd.tipo === "prazo") agg.prazo++;
      agg.total++;
    }
  }
  return agg;
}
