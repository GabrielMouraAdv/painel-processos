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
import { faseLabel } from "@/lib/processo-labels";

export type ProcessoRow = {
  id: string;
  numero: string;
  tipo: TipoProcesso;
  tipoLivre: string | null;
  tribunal: Tribunal;
  risco: Risco;
  grau: Grau;
  fase: string;
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
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50">
            <TableHead>Numero</TableHead>
            <TableHead>Gestor</TableHead>
            <TableHead>Tribunal</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Risco</TableHead>
            <TableHead>Situacao</TableHead>
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
              <TableCell>
                <TribunalBadge tribunal={p.tribunal} />
              </TableCell>
              <TableCell>
                <TipoBadge tipo={p.tipo} tipoLivre={p.tipoLivre} />
              </TableCell>
              <TableCell>
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
