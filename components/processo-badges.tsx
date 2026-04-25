import type { Grau, Risco, TipoProcesso, Tribunal } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  grauLabels,
  riscoLabels,
  tipoProcessoLabel,
  tribunalLabels,
} from "@/lib/processo-labels";

const base = "border-transparent font-medium";

const TIPO_DEFAULT = "bg-slate-100 text-slate-800 hover:bg-slate-100";
const tipoStyles: Partial<Record<TipoProcesso, string>> = {
  IMPROBIDADE: "bg-red-100 text-red-800 hover:bg-red-100",
  ACP: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  CRIMINAL: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  ACAO_POPULAR: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  MANDADO_SEGURANCA: "bg-indigo-100 text-indigo-800 hover:bg-indigo-100",
  MANDADO_SEGURANCA_COLETIVO:
    "bg-indigo-100 text-indigo-800 hover:bg-indigo-100",
  HABEAS_CORPUS: "bg-rose-100 text-rose-800 hover:bg-rose-100",
  HABEAS_DATA: "bg-rose-100 text-rose-800 hover:bg-rose-100",
  ACAO_RESCISORIA: "bg-cyan-100 text-cyan-800 hover:bg-cyan-100",
  EXECUCAO_FISCAL: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  EXECUCAO_TITULO_EXTRAJUDICIAL:
    "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  CUMPRIMENTO_SENTENCA: "bg-teal-100 text-teal-800 hover:bg-teal-100",
  ACAO_ORDINARIA: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  ACAO_DECLARATORIA: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  ACAO_ANULATORIA: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  EMBARGOS_EXECUCAO: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  EMBARGOS_TERCEIRO: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  RECLAMACAO: "bg-fuchsia-100 text-fuchsia-800 hover:bg-fuchsia-100",
  CONFLITO_COMPETENCIA: "bg-fuchsia-100 text-fuchsia-800 hover:bg-fuchsia-100",
  MEDIDA_CAUTELAR: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  TUTELA_CAUTELAR_ANTECEDENTE: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  PROCEDIMENTO_COMUM: "bg-sky-100 text-sky-800 hover:bg-sky-100",
  JUIZADO_ESPECIAL: "bg-lime-100 text-lime-800 hover:bg-lime-100",
  OUTRO: "bg-slate-200 text-slate-800 hover:bg-slate-200",
};

const riscoStyles: Record<Risco, string> = {
  ALTO: "bg-red-100 text-red-800 hover:bg-red-100",
  MEDIO: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  BAIXO: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
};

const tribunalStyles: Record<Tribunal, string> = {
  TJPE: "bg-pink-100 text-pink-800 hover:bg-pink-100",
  TRF5: "bg-emerald-800 text-emerald-50 hover:bg-emerald-800",
  TRF1: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  STJ: "bg-slate-200 text-slate-800 hover:bg-slate-200",
  STF: "bg-slate-200 text-slate-800 hover:bg-slate-200",
  OUTRO: "bg-slate-200 text-slate-800 hover:bg-slate-200",
};

const grauStyles: Record<Grau, string> = {
  PRIMEIRO: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  SEGUNDO: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  SUPERIOR: "bg-purple-100 text-purple-800 hover:bg-purple-100",
};

export function TipoBadge({
  tipo,
  tipoLivre,
}: {
  tipo: TipoProcesso;
  tipoLivre?: string | null;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(base, tipoStyles[tipo] ?? TIPO_DEFAULT)}
    >
      {tipoProcessoLabel(tipo, tipoLivre)}
    </Badge>
  );
}

export function RiscoBadge({ risco }: { risco: Risco }) {
  return (
    <Badge variant="secondary" className={cn(base, riscoStyles[risco])}>
      {riscoLabels[risco]}
    </Badge>
  );
}

export function TribunalBadge({ tribunal }: { tribunal: Tribunal }) {
  return (
    <Badge variant="secondary" className={cn(base, tribunalStyles[tribunal])}>
      {tribunalLabels[tribunal]}
    </Badge>
  );
}

export function GrauBadge({ grau }: { grau: Grau }) {
  return (
    <Badge variant="secondary" className={cn(base, grauStyles[grau])}>
      {grauLabels[grau]}
    </Badge>
  );
}
