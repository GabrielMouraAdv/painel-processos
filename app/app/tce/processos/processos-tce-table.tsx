"use client";

import { useRouter } from "next/navigation";
import type { CamaraTce, TipoProcessoTce } from "@prisma/client";
import { Ban, Check, X } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  classeBadgeNaoJulgado,
  classeBadgeResultado,
  classificarResultadoTce,
} from "@/lib/julgamento-config";
import {
  TCE_CAMARA_LABELS,
  TCE_TIPO_LABELS,
  faseTceLabel,
} from "@/lib/tce-config";
import { cn } from "@/lib/utils";

type DispensaInfo = {
  por: string;
  em: string; // ISO
} | null;

export type ProcessoTceRow = {
  id: string;
  numero: string;
  municipio: { id: string; nome: string } | null;
  interessados: { nome: string }[];
  tipo: TipoProcessoTce;
  camara: CamaraTce;
  relator: string | null;
  faseAtual: string;
  notaTecnica: boolean;
  parecerMpco: boolean;
  despachadoComRelator: boolean;
  memorialPronto: boolean;
  despachoDispensado: DispensaInfo;
  memorialDispensado: DispensaInfo;
  julgado: boolean;
  resultadoJulgamento: string | null;
  prazoAberto: {
    tipo: string;
    dataVencimento: string;
    diasUteisRestantes: number;
  } | null;
};

function StatusIcon({ active }: { active: boolean }) {
  return active ? (
    <Check className="h-4 w-4 text-emerald-600" aria-label="sim" />
  ) : (
    <X className="h-4 w-4 text-red-500" aria-label="nao" />
  );
}

function StatusIconComDispensa({
  active,
  dispensado,
}: {
  active: boolean;
  dispensado: DispensaInfo;
}) {
  if (dispensado) {
    const data = new Date(dispensado.em).toLocaleDateString("pt-BR");
    return (
      <span
        title={`Dispensado por ${dispensado.por} em ${data}`}
        className="inline-flex items-center justify-center"
      >
        <Ban
          className="h-4 w-4 text-slate-500"
          aria-label={`dispensado por ${dispensado.por} em ${data}`}
        />
      </span>
    );
  }
  return <StatusIcon active={active} />;
}

function PrazoBadge({
  dias,
  tipo,
}: {
  dias: number;
  tipo: string;
}) {
  const cor =
    dias < 0
      ? "bg-red-200 text-red-900"
      : dias <= 7
        ? "bg-red-100 text-red-800"
        : dias <= 15
          ? "bg-yellow-100 text-yellow-800"
          : "bg-slate-100 text-slate-700";
  const label =
    dias < 0
      ? `vencido ${-dias}d`
      : dias === 0
        ? "hoje"
        : `${dias}d uteis`;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-muted-foreground">{tipo}</span>
      <span
        className={cn(
          "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-semibold",
          cor,
        )}
      >
        {label}
      </span>
    </div>
  );
}

export function ProcessosTceTable({ processos }: { processos: ProcessoTceRow[] }) {
  const router = useRouter();

  if (processos.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-12 text-center text-sm text-muted-foreground shadow-sm">
        Nenhum processo TCE encontrado com os filtros atuais.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead>Numero</TableHead>
              <TableHead>Municipio</TableHead>
              <TableHead className="hidden md:table-cell">Interessados</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="hidden md:table-cell">Camara</TableHead>
              <TableHead className="hidden md:table-cell">Relator</TableHead>
              <TableHead>Fase</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead className="hidden text-center md:table-cell">NT</TableHead>
              <TableHead className="hidden text-center md:table-cell">Parecer MPCO</TableHead>
              <TableHead className="hidden text-center md:table-cell">Despacho</TableHead>
              <TableHead className="hidden text-center md:table-cell">Memorial</TableHead>
              <TableHead>Prazo aberto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processos.map((p) => (
              <TableRow
                key={p.id}
                onClick={() => router.push(`/app/tce/processos/${p.id}`)}
                className="cursor-pointer transition-colors hover:bg-slate-50"
              >
                <TableCell className="font-mono text-xs font-medium text-brand-navy">
                  {p.numero}
                </TableCell>
                <TableCell className="text-sm">
                  {p.municipio?.nome ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="hidden max-w-[220px] truncate text-xs text-slate-700 md:table-cell">
                  {p.interessados.length
                    ? p.interessados.map((i) => i.nome).join(", ")
                    : "—"}
                </TableCell>
                <TableCell className="text-xs">
                  {TCE_TIPO_LABELS[p.tipo]}
                </TableCell>
                <TableCell className="hidden text-xs md:table-cell">
                  {TCE_CAMARA_LABELS[p.camara]}
                </TableCell>
                <TableCell className="hidden text-xs md:table-cell">
                  {p.relator ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {faseTceLabel(p.tipo, p.faseAtual)}
                </TableCell>
                <TableCell>
                  {p.julgado && p.resultadoJulgamento ? (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                        classeBadgeResultado(
                          classificarResultadoTce(
                            p.tipo,
                            p.resultadoJulgamento,
                          ),
                        ),
                      )}
                      title={p.resultadoJulgamento}
                    >
                      {p.resultadoJulgamento}
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                        classeBadgeNaoJulgado(),
                      )}
                    >
                      Nao julgado
                    </span>
                  )}
                </TableCell>
                <TableCell className="hidden text-center md:table-cell">
                  <StatusIcon active={p.notaTecnica} />
                </TableCell>
                <TableCell className="hidden text-center md:table-cell">
                  <StatusIcon active={p.parecerMpco} />
                </TableCell>
                <TableCell className="hidden text-center md:table-cell">
                  <StatusIconComDispensa
                    active={p.despachadoComRelator}
                    dispensado={p.despachoDispensado}
                  />
                </TableCell>
                <TableCell className="hidden text-center md:table-cell">
                  <StatusIconComDispensa
                    active={p.memorialPronto}
                    dispensado={p.memorialDispensado}
                  />
                </TableCell>
                <TableCell>
                  {p.prazoAberto ? (
                    <PrazoBadge
                      dias={p.prazoAberto.diasUteisRestantes}
                      tipo={p.prazoAberto.tipo}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
