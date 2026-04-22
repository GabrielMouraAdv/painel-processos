import type { Grau, Risco, TipoProcesso, Tribunal } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  grauLabels,
  riscoLabels,
  tipoLabels,
  tribunalLabels,
} from "@/lib/processo-labels";

const base = "border-transparent font-medium";

const tipoStyles: Record<TipoProcesso, string> = {
  IMPROBIDADE: "bg-red-100 text-red-800 hover:bg-red-100",
  ACP: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  CRIMINAL: "bg-purple-100 text-purple-800 hover:bg-purple-100",
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

export function TipoBadge({ tipo }: { tipo: TipoProcesso }) {
  return (
    <Badge variant="secondary" className={cn(base, tipoStyles[tipo])}>
      {tipoLabels[tipo]}
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
