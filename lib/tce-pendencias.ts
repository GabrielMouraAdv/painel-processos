import { type CamaraTce, type TipoProcessoTce } from "@prisma/client";

import { diasUteisEntre } from "@/lib/dias-uteis";

// Tipos que nao seguem o fluxo de defesa/memorial/despacho com relator.
// Para eles nao geramos pendencia automatica de memorial nem de despacho.
const TIPOS_SEM_FLUXO_RELATOR = new Set<TipoProcessoTce>([
  "TERMO_AJUSTE_GESTAO",
  "PEDIDO_RESCISAO",
  "CONSULTA",
]);

export type TipoPendencia =
  | "contrarrazoes_nt"
  | "contrarrazoes_mpco"
  | "memorial"
  | "despacho"
  | "prazo";

export type PrazoStatus = "alerta" | "vencido" | "cumprido_com_atraso";

export type Pendencia = {
  id: string; // unique key (processoId + tipo + suffix opcional)
  tipo: TipoPendencia;
  concluida: boolean;
  descricao: string;
  detalhe?: string | null;
  prazoId?: string | null;
  // Apenas para tipo "prazo":
  prazoStatus?: PrazoStatus | null;
  advogadoResp?: string | null; // nome
  prazoTipo?: string | null; // texto do tipo do PrazoTce
  // Apenas para "memorial" / "despacho" — quando ja foi agendado
  agendado?: {
    data: string; // ISO
    advogadoNome: string;
  } | null;
  // Apenas para "memorial" / "despacho" — quando dispensado
  dispensado?: {
    por: string;
    em: string; // ISO
    motivo: string | null;
  } | null;
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
  memorialDispensado: boolean;
  despachoDispensado: boolean;
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
    tipo: TipoProcessoTce;
    notaTecnica: boolean;
    parecerMpco: boolean;
    memorialPronto: boolean;
    despachadoComRelator: boolean;
    contrarrazoesNtApresentadas: boolean;
    contrarrazoesMpcoApresentadas: boolean;
    faseAtual: string;
    memorialAgendadoData?: Date | null;
    memorialAgendadoAdvogadoNome?: string | null;
    despachoAgendadoData?: Date | null;
    despachoAgendadoAdvogadoNome?: string | null;
    memorialDispensado?: boolean;
    memorialDispensadoPor?: string | null;
    memorialDispensadoEm?: Date | null;
    memorialDispensadoMotivo?: string | null;
    despachoDispensado?: boolean;
    despachoDispensadoPor?: string | null;
    despachoDispensadoEm?: Date | null;
    despachoDispensadoMotivo?: string | null;
  },
  andamentos: AndamentoMin[],
  prazos: {
    id: string;
    tipo: string;
    dataVencimento: Date;
    cumprido: boolean;
    diasRestantes: number;
    advogadoResp?: string | null;
  }[],
): Pendencia[] {
  const out: Pendencia[] = [];
  const temContrarraz = temAndamentoContrarrazoes(andamentos);
  const semFluxoRelator = TIPOS_SEM_FLUXO_RELATOR.has(processo.tipo);

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

  const memDispensado =
    processo.memorialDispensado &&
    processo.memorialDispensadoPor &&
    processo.memorialDispensadoEm
      ? {
          por: processo.memorialDispensadoPor,
          em: processo.memorialDispensadoEm.toISOString(),
          motivo: processo.memorialDispensadoMotivo ?? null,
        }
      : null;

  const despDispensado =
    processo.despachoDispensado &&
    processo.despachoDispensadoPor &&
    processo.despachoDispensadoEm
      ? {
          por: processo.despachoDispensadoPor,
          em: processo.despachoDispensadoEm.toISOString(),
          motivo: processo.despachoDispensadoMotivo ?? null,
        }
      : null;

  if (!semFluxoRelator && !FASES_ENCERRADAS.has(processo.faseAtual)) {
    const memAgendado =
      !processo.memorialPronto &&
      !memDispensado &&
      processo.memorialAgendadoData &&
      processo.memorialAgendadoAdvogadoNome
        ? {
            data: processo.memorialAgendadoData.toISOString(),
            advogadoNome: processo.memorialAgendadoAdvogadoNome,
          }
        : null;
    const concluida = processo.memorialPronto || !!memDispensado;
    out.push({
      id: `${processo.id}-memorial`,
      tipo: "memorial",
      concluida,
      descricao: "Elaborar Memorial",
      detalhe: memDispensado
        ? `Memorial dispensado por ${memDispensado.por} em ${new Date(memDispensado.em).toLocaleDateString("pt-BR")}${memDispensado.motivo ? `. Motivo: ${memDispensado.motivo}` : ""}`
        : processo.memorialPronto
          ? "Memorial pronto"
          : memAgendado
            ? `Memorial agendado para ${new Date(memAgendado.data).toLocaleDateString("pt-BR")} com ${memAgendado.advogadoNome}`
            : "Memorial pendente de elaboracao",
      agendado: memAgendado,
      dispensado: memDispensado,
    });
  }

  if (!semFluxoRelator && (processo.memorialPronto || memDispensado)) {
    const despAgendado =
      !processo.despachadoComRelator &&
      !despDispensado &&
      processo.despachoAgendadoData &&
      processo.despachoAgendadoAdvogadoNome
        ? {
            data: processo.despachoAgendadoData.toISOString(),
            advogadoNome: processo.despachoAgendadoAdvogadoNome,
          }
        : null;
    const concluida = processo.despachadoComRelator || !!despDispensado;
    out.push({
      id: `${processo.id}-despacho`,
      tipo: "despacho",
      concluida,
      descricao: "Agendar Despacho com Relator",
      detalhe: despDispensado
        ? `Despacho dispensado por ${despDispensado.por} em ${new Date(despDispensado.em).toLocaleDateString("pt-BR")}${despDispensado.motivo ? `. Motivo: ${despDispensado.motivo}` : ""}`
        : processo.despachadoComRelator
          ? "Despachado"
          : despAgendado
            ? `Despacho agendado para ${new Date(despAgendado.data).toLocaleDateString("pt-BR")} com ${despAgendado.advogadoNome}`
            : "Aguardando agendamento de despacho",
      agendado: despAgendado,
      dispensado: despDispensado,
    });
  }

  for (const p of prazos) {
    let status: PrazoStatus | null = null;
    let descricao: string;
    let detalhe: string | null = null;
    let concluida = p.cumprido;

    if (p.cumprido) {
      // Cumprido com atraso: vencimento ja passou, mantem visivel por ate 7
      // dias uteis. Cumprido normal (no prazo) some da lista de pendencias.
      const venceuHaDiasUteis = -p.diasRestantes;
      if (p.diasRestantes < 0 && venceuHaDiasUteis <= 7) {
        status = "cumprido_com_atraso";
        // mantem visivel apesar de cumprido
        concluida = false;
        descricao = `Prazo de ${p.tipo} cumprido com atraso`;
        detalhe = `Vencimento ha ${venceuHaDiasUteis} dia${venceuHaDiasUteis === 1 ? "" : "s"} ute${venceuHaDiasUteis === 1 ? "l" : "is"}`;
      } else {
        // cumprido normal: marca como concluida, lista esconde
        descricao = `Prazo de ${p.tipo} cumprido`;
        detalhe = "Cumprido";
      }
    } else if (p.diasRestantes < 0) {
      status = "vencido";
      const venceuHaDiasUteis = -p.diasRestantes;
      descricao = `PRAZO VENCIDO SEM PROVIDENCIAS - ${p.tipo}`;
      detalhe = `Venceu ha ${venceuHaDiasUteis} dia${venceuHaDiasUteis === 1 ? "" : "s"} ute${venceuHaDiasUteis === 1 ? "l" : "is"}`;
    } else {
      status = "alerta";
      descricao = `Prazo de ${p.tipo} vencendo em ${p.diasRestantes <= 0 ? "hoje" : `${p.diasRestantes} dia${p.diasRestantes === 1 ? "" : "s"} ute${p.diasRestantes === 1 ? "l" : "is"}`}`;
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
      prazoTipo: p.tipo,
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
      // Dispensados nao contam como pendencia ativa.
      if (pd.dispensado) continue;
      // Nao conta cumprido_com_atraso como pendencia ativa (ja foi resolvido).
      if (pd.tipo === "prazo" && pd.prazoStatus === "cumprido_com_atraso")
        continue;
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
