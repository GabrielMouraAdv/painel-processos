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

  return (
    <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead>Numero</TableHead>
              <TableHead>Gestor</TableHead>
              <TableHead className="hidden md:table-cell">Tribunal</TableHead>
              <TableHead className="hidden md:table-cell">Tipo</TableHead>
              <TableHead className="hidden md:table-cell">Risco</TableHead>
              <TableHead>Situacao</TableHead>
              <TableHead>Resultado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processos.map((p) => (
              <TableRow
                key={p.id}
                onClick={() => router.push(`/app/processos/${p.id}`)}
                className="cursor-pointer transition-colors hover:bg-slate-50"
              >
                <TableCell className="font-mono text-xs font-medium text-brand-navy">
                  {p.numero}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{p.gestor.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.gestor.municipio}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <TribunalBadge tribunal={p.tribunal} />
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <TipoBadge tipo={p.tipo} tipoLivre={p.tipoLivre} />
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <RiscoBadge risco={p.risco} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <GrauBadge grau={p.grau} />
                    <span className="text-xs text-muted-foreground">
                      {faseLabel(p.fase)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {p.julgado && p.resultadoJulgamento ? (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
