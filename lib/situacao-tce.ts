import type { Prisma } from "@prisma/client";

// Situacao do processo TCE derivada dos FATOS (julgado, recursos pendentes, transito,
// pecas nos autos), e nao do texto solto de "faseAtual" (item 9 da especificacao).
// A ordem das regras importa e e a mesma em situacaoTce() e em whereSituacaoTce().

export type SituacaoTce =
  | "em_instrucao"
  | "defesa_apresentada"
  | "em_julgamento"
  | "julgado"
  | "recurso_pendente"
  | "transitado"
  | "arquivado"
  | "sobrestado";

export const SITUACAO_TCE_LABELS: Record<SituacaoTce, string> = {
  em_instrucao: "Em instrução",
  defesa_apresentada: "Defesa apresentada",
  em_julgamento: "Em julgamento",
  julgado: "Julgado",
  recurso_pendente: "Julgado · recurso pendente",
  transitado: "Transitado em julgado",
  arquivado: "Arquivado",
  sobrestado: "Sobrestado",
};

export const SITUACOES_TCE = Object.keys(SITUACAO_TCE_LABELS) as SituacaoTce[];

// Aba padrao da lista: tudo o que ainda nao foi julgado (instrucao, defesa e julgamento).
export const ABA_ANDAMENTO = "andamento";
export const ABA_ANDAMENTO_LABEL = "Em instrução e julgamento";
export const SITUACOES_ANDAMENTO: SituacaoTce[] = ["em_instrucao", "defesa_apresentada", "em_julgamento"];

const TRANSITADO = ["transitado", "transitado_cautelar"];
const DEFESA = ["defesa_apresentada", "manifestacao_apresentada"];
const FORA_DO_FLUXO = ["arquivado", "sobrestado", ...TRANSITADO];

export function situacaoTce(p: {
  julgado: boolean;
  faseAtual: string;
  dataTransito?: Date | string | null;
  recursosPendentes?: number;
  notaTecnica?: boolean;
  parecerMpco?: boolean;
}): SituacaoTce {
  if (p.faseAtual === "arquivado") return "arquivado";
  if (p.faseAtual === "sobrestado") return "sobrestado";
  if (p.dataTransito || TRANSITADO.includes(p.faseAtual)) return "transitado";
  if (p.julgado) return (p.recursosPendentes ?? 0) > 0 ? "recurso_pendente" : "julgado";
  if (p.faseAtual === "em_julgamento" || p.notaTecnica || p.parecerMpco) return "em_julgamento";
  if (DEFESA.includes(p.faseAtual)) return "defesa_apresentada";
  return "em_instrucao";
}

export function whereAndamentoTce(): Prisma.ProcessoTceWhereInput {
  return { OR: SITUACOES_ANDAMENTO.map(whereSituacaoTce) };
}

// Filtro equivalente para a consulta da lista.
export function whereSituacaoTce(s: SituacaoTce): Prisma.ProcessoTceWhereInput {
  const ativo: Prisma.ProcessoTceWhereInput = { dataTransito: null, faseAtual: { notIn: FORA_DO_FLUXO } };
  switch (s) {
    case "arquivado":
      return { faseAtual: "arquivado" };
    case "sobrestado":
      return { faseAtual: "sobrestado" };
    case "transitado":
      return {
        faseAtual: { notIn: ["arquivado", "sobrestado"] },
        OR: [{ dataTransito: { not: null } }, { faseAtual: { in: TRANSITADO } }],
      };
    case "recurso_pendente":
      return { ...ativo, julgado: true, recursos: { some: { julgado: false } } };
    case "julgado":
      return { ...ativo, julgado: true, recursos: { none: { julgado: false } } };
    case "em_julgamento":
      return {
        ...ativo,
        julgado: false,
        OR: [{ faseAtual: "em_julgamento" }, { notaTecnica: true }, { parecerMpco: true }],
      };
    case "defesa_apresentada":
      return {
        julgado: false, dataTransito: null, notaTecnica: false, parecerMpco: false,
        faseAtual: { in: DEFESA },
      };
    case "em_instrucao":
      return {
        julgado: false, dataTransito: null, notaTecnica: false, parecerMpco: false,
        faseAtual: { notIn: [...FORA_DO_FLUXO, "em_julgamento", ...DEFESA] },
      };
  }
}
