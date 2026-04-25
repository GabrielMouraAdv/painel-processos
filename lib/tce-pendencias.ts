import type { CamaraTce, TipoProcessoTce } from "@prisma/client";

import { diasUteisEntre } from "@/lib/dias-uteis";

export type TipoPendencia =
  | "contrarrazoes_nt"
  | "contrarrazoes_mpco"
  | "memorial"
  | "despacho"
  | "prazo";

export type Pendencia = {
  id: string; // unique key (processoId + tipo + suffix opcional)
  tipo: TipoPendencia;
  concluida: boolean;
  descricao: string;
  detalhe?: string | null;
  prazoId?: string | null;
};

export type ProcessoComPendencias = {
  id: string;
  numero: string;
  tipo: TipoProcessoTce;
  camara: CamaraTce;
  exercicio: string | null;
  faseAtual: string;
  relator: string | null;
  municipio: { nome: string; uf: string } | null;
  notaTecnica: boolean;
  parecerMpco: boolean;
  memorialPronto: boolean;
  despachadoComRelator: boolean;
  contrarrazoesNtApresentadas: boolean;
  contrarrazoesMpcoApresentadas: boolean;
  pendencias: Pendencia[];
};

type AndamentoMin = {
  data: Date;
  descricao: string;
};

function temAndamentoContrarrazoes(andamentos: AndamentoMin[]): boolean {
  return andamentos.some((a) => /contrarraz/i.test(a.descricao));
}

const FASES_ENCERRADAS = new Set(["transitado", "transitado_cautelar"]);

export function detectarPendencias(
  processo: {
    id: string;
    notaTecnica: boolean;
    parecerMpco: boolean;
    memorialPronto: boolean;
    despachadoComRelator: boolean;
    contrarrazoesNtApresentadas: boolean;
    contrarrazoesMpcoApresentadas: boolean;
    faseAtual: string;
  },
  andamentos: AndamentoMin[],
  prazos: {
    id: string;
    tipo: string;
    dataVencimento: Date;
    cumprido: boolean;
    diasRestantes: number;
  }[],
): Pendencia[] {
  const out: Pendencia[] = [];
  const temContrarraz = temAndamentoContrarrazoes(andamentos);

  if (processo.notaTecnica) {
    const concluida =
      processo.contrarrazoesNtApresentadas || temContrarraz;
    out.push({
      id: `${processo.id}-contrarrazoes_nt`,
      tipo: "contrarrazoes_nt",
      concluida,
      descricao: "Contrarrazoes a Nota Tecnica",
      detalhe: concluida ? null : "Aguardando apresentacao das contrarrazoes",
    });
  }

  if (processo.parecerMpco) {
    const concluida =
      processo.contrarrazoesMpcoApresentadas || temContrarraz;
    out.push({
      id: `${processo.id}-contrarrazoes_mpco`,
      tipo: "contrarrazoes_mpco",
      concluida,
      descricao: "Contrarrazoes ao Parecer MPCO",
      detalhe: concluida ? null : "Aguardando apresentacao das contrarrazoes",
    });
  }

  if (!FASES_ENCERRADAS.has(processo.faseAtual)) {
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
      descricao: `Prazo de ${p.tipo} vencendo em ${p.diasRestantes <= 0 ? "hoje" : `${p.diasRestantes} dia${p.diasRestantes === 1 ? "" : "s"} ute${p.diasRestantes === 1 ? "l" : "is"}`}`,
      detalhe: p.cumprido ? "Cumprido" : null,
      prazoId: p.id,
    });
  }

  return out;
}

export type AggregadoPendencias = {
  contrarrazoesNt: number;
  contrarrazoesMpco: number;
  memorial: number;
  despacho: number;
  prazo: number;
  total: number;
};

export function agregarPendencias(
  itens: ProcessoComPendencias[],
): AggregadoPendencias {
  const agg: AggregadoPendencias = {
    contrarrazoesNt: 0,
    contrarrazoesMpco: 0,
    memorial: 0,
    despacho: 0,
    prazo: 0,
    total: 0,
  };
  for (const p of itens) {
    for (const pd of p.pendencias) {
      if (pd.concluida) continue;
      if (pd.tipo === "contrarrazoes_nt") agg.contrarrazoesNt++;
      else if (pd.tipo === "contrarrazoes_mpco") agg.contrarrazoesMpco++;
      else if (pd.tipo === "memorial") agg.memorial++;
      else if (pd.tipo === "despacho") agg.despacho++;
      else if (pd.tipo === "prazo") agg.prazo++;
      agg.total++;
    }
  }
  return agg;
}

// Helper para o badge do dashboard sem precisar carregar tudo
export function diasUteisRestantes(dataVencimento: Date, hoje: Date): number {
  return diasUteisEntre(hoje, dataVencimento);
}
