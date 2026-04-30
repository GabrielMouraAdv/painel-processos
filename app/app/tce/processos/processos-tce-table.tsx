"use client";

import { useRouter } from "next/navigation";
import type { CamaraTce, TipoProcessoTce, TipoRecursoTce } from "@prisma/client";
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
  classeBadgeJulgadoSemDetalhe,
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
  bancasSlug: string[];
  ehRecurso: boolean;
  tipoRecurso: TipoRecursoTce | null;
  processoOrigem: { id: string; numero: string } | null;
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
    dias < 0 ? `vencido ${-dias}d` : dias === 0 ? "hoje" : `${dias}d`;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="break-words text-[11px] text-muted-foreground">
        {tipo}
      </span>
      <span
        className={cn(
          "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
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

  const cellBase = "px-2 py-2 align-top text-xs break-words";
  const headBase = "h-auto px-2 py-2 align-top text-xs";

  return (
    <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
      <div className="overflow-x-auto">
        <Table className="md:table-fixed">
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className={cn(headBase, "md:w-[110px]")}>
                Numero
              </TableHead>
              <TableHead className={cn(headBase, "md:w-[130px]")}>
                Municipio
              </TableHead>
              <TableHead
                className={cn(headBase, "hidden md:table-cell md:w-[180px]")}
              >
                Interessados
              </TableHead>
              <TableHead className={cn(headBase, "md:w-[120px]")}>
                Tipo
              </TableHead>
              <TableHead
                className={cn(headBase, "hidden md:table-cell md:w-[90px]")}
              >
                Camara
              </TableHead>
              <TableHead
                className={cn(headBase, "hidden md:table-cell md:w-[110px]")}
              >
                Relator
              </TableHead>
              <TableHead className={cn(headBase, "md:w-[130px]")}>
                Fase
              </TableHead>
              <TableHead className={cn(headBase, "md:w-[110px]")}>
                Resultado
              </TableHead>
              <TableHead
                className={cn(
                  headBase,
                  "hidden text-center md:table-cell md:w-[40px]",
                )}
                title="Nota Tecnica"
              >
                NT
              </TableHead>
              <TableHead
                className={cn(
                  headBase,
                  "hidden text-center md:table-cell md:w-[50px]",
                )}
                title="Parecer MPCO"
              >
                MPCO
              </TableHead>
              <TableHead
                className={cn(
                  headBase,
                  "hidden text-center md:table-cell md:w-[50px]",
                )}
                title="Despacho com relator"
              >
                Desp.
              </TableHead>
              <TableHead
                className={cn(
                  headBase,
                  "hidden text-center md:table-cell md:w-[50px]",
                )}
                title="Memorial"
              >
                Mem.
              </TableHead>
              <TableHead className={cn(headBase, "md:w-[130px]")}>
                Prazo aberto
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processos.map((p) => (
              <TableRow
                key={p.id}
                onClick={() => router.push(`/app/tce/processos/${p.id}`)}
                className="cursor-pointer transition-colors hover:bg-slate-50"
              >
                <TableCell
                  className={cn(
                    cellBase,
                    "font-mono font-medium text-brand-navy",
                  )}
                >
                  {p.numero}
                </TableCell>
                <TableCell className={cellBase}>
                  {p.municipio?.nome ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell
                  className={cn(
                    cellBase,
                    "hidden text-slate-700 md:table-cell",
                  )}
                >
                  {p.interessados.length === 0 ? (
                    "—"
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      {p.interessados.map((i, idx) => (
                        <div key={idx} className="break-words leading-tight">
                          {i.nome}
                        </div>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell className={cellBase}>
                  {TCE_TIPO_LABELS[p.tipo]}
                </TableCell>
                <TableCell className={cn(cellBase, "hidden md:table-cell")}>
                  {TCE_CAMARA_LABELS[p.camara]}
                </TableCell>
                <TableCell className={cn(cellBase, "hidden md:table-cell")}>
                  {p.relator ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className={cellBase}>
                  {faseTceLabel(p.tipo, p.faseAtual)}
                </TableCell>
                <TableCell className={cellBase}>
                  {p.julgado && p.resultadoJulgamento ? (
                    <span
                      className={cn(
                        "inline-block break-words rounded-full border px-1.5 py-0.5 text-[10px] font-semibold",
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
                  ) : p.julgado ? (
                    <span
                      className={cn(
                        "inline-block rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                        classeBadgeJulgadoSemDetalhe(),
                      )}
                      title="Processo julgado - resultado pendente de cadastro"
                    >
                      Julgado (sem detalhe)
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "inline-block rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                        classeBadgeNaoJulgado(),
                      )}
                    >
                      Nao julgado
                    </span>
                  )}
                </TableCell>
                <TableCell
                  className={cn(cellBase, "hidden text-center md:table-cell")}
                >
                  <div className="flex justify-center">
                    <StatusIcon active={p.notaTecnica} />
                  </div>
                </TableCell>
                <TableCell
                  className={cn(cellBase, "hidden text-center md:table-cell")}
                >
                  <div className="flex justify-center">
                    <StatusIcon active={p.parecerMpco} />
                  </div>
                </TableCell>
                <TableCell
                  className={cn(cellBase, "hidden text-center md:table-cell")}
                >
                  <div className="flex justify-center">
                    <StatusIconComDispensa
                      active={p.despachadoComRelator}
                      dispensado={p.despachoDispensado}
                    />
                  </div>
                </TableCell>
                <TableCell
                  className={cn(cellBase, "hidden text-center md:table-cell")}
                >
                  <div className="flex justify-center">
                    <StatusIconComDispensa
                      active={p.memorialPronto}
                      dispensado={p.memorialDispensado}
                    />
                  </div>
                </TableCell>
                <TableCell className={cellBase}>
                  {p.prazoAberto ? (
                    <PrazoBadge
                      dias={p.prazoAberto.diasUteisRestantes}
                      tipo={p.prazoAberto.tipo}
                    />
                  ) : (
                    <span className="text-muted-foreground">—</span>
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
