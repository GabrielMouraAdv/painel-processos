"use client";

import { useRouter } from "next/navigation";
import type { Grau, Risco, TipoProcesso, Tribunal } from "@prisma/client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  GrauBadge,
  RiscoBadge,
  TipoBadge,
  TribunalBadge,
} from "@/components/processo-badges";
import {
  classeBadgeNaoJulgado,
  classeBadgeResultado,
  classificarResultadoJud,
} from "@/lib/julgamento-config";
import { faseLabel } from "@/lib/processo-labels";
import { cn } from "@/lib/utils";

export type ProcessoRow = {
  id: string;
  numero: string;
  tipo: TipoProcesso;
  tipoLivre: string | null;
  tribunal: Tribunal;
  risco: Risco;
  grau: Grau;
  fase: string;
  julgado: boolean;
  resultadoJulgamento: string | null;
  bancasSlug: string[];
  gestor: { nome: string; municipio: string };
};

export function ProcessosTable({ processos }: { processos: ProcessoRow[] }) {
  const router = useRouter();

  if (processos.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-12 text-center text-sm text-muted-foreground shadow-sm">
        Nenhum processo encontrado com os filtros atuais.
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
              <TableHead className={cn(headBase, "md:w-[140px]")}>
                Numero
              </TableHead>
              <TableHead className={cn(headBase, "md:w-[200px]")}>
                Gestor
              </TableHead>
              <TableHead
                className={cn(headBase, "hidden md:table-cell md:w-[80px]")}
              >
                Tribunal
              </TableHead>
              <TableHead
                className={cn(headBase, "hidden md:table-cell md:w-[160px]")}
              >
                Tipo
              </TableHead>
              <TableHead
                className={cn(headBase, "hidden md:table-cell md:w-[90px]")}
              >
                Risco
              </TableHead>
              <TableHead className={cn(headBase, "md:w-[200px]")}>
                Situacao
              </TableHead>
              <TableHead className={cn(headBase, "md:w-[120px]")}>
                Resultado
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processos.map((p) => (
              <TableRow
                key={p.id}
                onClick={() => router.push(`/app/processos/${p.id}`)}
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
                  <div className="break-words font-medium">
                    {p.gestor.nome}
                  </div>
                  <div className="break-words text-[11px] text-muted-foreground">
                    {p.gestor.municipio}
                  </div>
                </TableCell>
                <TableCell className={cn(cellBase, "hidden md:table-cell")}>
                  <TribunalBadge tribunal={p.tribunal} />
                </TableCell>
                <TableCell className={cn(cellBase, "hidden md:table-cell")}>
                  <TipoBadge tipo={p.tipo} tipoLivre={p.tipoLivre} />
                </TableCell>
                <TableCell className={cn(cellBase, "hidden md:table-cell")}>
                  <RiscoBadge risco={p.risco} />
                </TableCell>
                <TableCell className={cellBase}>
                  <div className="flex flex-col gap-1">
                    <GrauBadge grau={p.grau} />
                    <span className="break-words text-[11px] text-muted-foreground">
                      {faseLabel(p.fase)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className={cellBase}>
                  {p.julgado && p.resultadoJulgamento ? (
                    <span
                      className={cn(
                        "inline-block break-words rounded-full border px-1.5 py-0.5 text-[10px] font-semibold",
                        classeBadgeResultado(
                          classificarResultadoJud(
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
                        classeBadgeNaoJulgado(),
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
