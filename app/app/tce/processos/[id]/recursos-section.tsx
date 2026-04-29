"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  ChevronRight,
  Plus,
} from "lucide-react";
import { TipoRecursoTce } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TCE_RECURSO_CODE, TCE_RECURSO_LABELS } from "@/lib/tce-config";
import { cn } from "@/lib/utils";

import { InterporRecursoDialog } from "./interpor-recurso-dialog";

export type RecursoNode = {
  id: string;
  numero: string;
  tipoRecurso: TipoRecursoTce | null;
  relator: string | null;
  faseAtual: string;
  notaTecnica: boolean;
  parecerMpco: boolean;
  memorialPronto: boolean;
  despachadoComRelator: boolean;
  dataAutuacao: string | null;
  processoOrigemId: string | null;
  prazosAbertos: number;
  prazoMaisProximo: { tipo: string; data: string } | null;
  filhos: RecursoNode[];
};

type Props = {
  processoId: string;
  baseNumero: string;
  bancasOrigem: string[];
  recursos: Omit<RecursoNode, "filhos">[];
};

function formatDate(d: string | null): string {
  if (!d) return "—";
  const date = new Date(d);
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
}

function montarArvore(
  raizId: string,
  todos: Omit<RecursoNode, "filhos">[],
): RecursoNode[] {
  function filhosDe(paiId: string): RecursoNode[] {
    return todos
      .filter((r) => r.processoOrigemId === paiId)
      .map((r) => ({ ...r, filhos: filhosDe(r.id) }));
  }
  return filhosDe(raizId);
}

function proximaSeqFactory(
  todos: Omit<RecursoNode, "filhos">[],
): (paiNumero: string, tipo: TipoRecursoTce) => number {
  return (paiNumero, tipo) => {
    const code = TCE_RECURSO_CODE[tipo];
    const prefixo = `${paiNumero}${code}`;
    let max = 0;
    for (const r of todos) {
      if (!r.numero.startsWith(prefixo)) continue;
      const sufixo = r.numero.slice(prefixo.length);
      const n = Number.parseInt(sufixo, 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
    return max + 1;
  };
}

export function RecursosSection({
  processoId,
  baseNumero,
  bancasOrigem,
  recursos,
}: Props) {
  const [novoOpenForRoot, setNovoOpenForRoot] = React.useState(false);
  const [novoOpenForRecurso, setNovoOpenForRecurso] =
    React.useState<RecursoNode | null>(null);

  const arvore = React.useMemo(
    () => montarArvore(processoId, recursos),
    [processoId, recursos],
  );

  const proximaSeq = React.useMemo(
    () => proximaSeqFactory(recursos),
    [recursos],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">Recursos Vinculados</CardTitle>
        <Button
          size="sm"
          className="bg-brand-navy hover:bg-brand-navy/90"
          onClick={() => setNovoOpenForRoot(true)}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Cadastrar Recurso
        </Button>
      </CardHeader>
      <CardContent>
        {arvore.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum recurso vinculado a este processo.
          </p>
        ) : (
          <ArvoreRecursos
            nodes={arvore}
            onInterporRecurso={(node) => setNovoOpenForRecurso(node)}
            depth={0}
          />
        )}
      </CardContent>

      <InterporRecursoDialog
        open={novoOpenForRoot}
        onOpenChange={setNovoOpenForRoot}
        processoOrigemId={processoId}
        baseNumero={baseNumero}
        bancasOrigem={bancasOrigem}
        proximaSequencial={(tipo) => proximaSeq(baseNumero, tipo)}
      />

      {novoOpenForRecurso && (
        <InterporRecursoDialog
          open={!!novoOpenForRecurso}
          onOpenChange={(v) => {
            if (!v) setNovoOpenForRecurso(null);
          }}
          processoOrigemId={novoOpenForRecurso.id}
          baseNumero={novoOpenForRecurso.numero}
          bancasOrigem={bancasOrigem}
          proximaSequencial={(tipo) =>
            proximaSeq(novoOpenForRecurso.numero, tipo)
          }
        />
      )}
    </Card>
  );
}

function ArvoreRecursos({
  nodes,
  onInterporRecurso,
  depth,
}: {
  nodes: RecursoNode[];
  onInterporRecurso: (n: RecursoNode) => void;
  depth: number;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {nodes.map((node) => (
        <li key={node.id}>
          <NoRecurso
            node={node}
            onInterporRecurso={onInterporRecurso}
            depth={depth}
          />
          {node.filhos.length > 0 && (
            <div className="ml-6 mt-2 border-l-2 border-slate-200 pl-3">
              <ArvoreRecursos
                nodes={node.filhos}
                onInterporRecurso={onInterporRecurso}
                depth={depth + 1}
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function StatusPill({ label, ativo }: { label: string; ativo: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
        ativo
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-200 bg-slate-50 text-slate-500",
      )}
    >
      {label}
    </span>
  );
}

function NoRecurso({
  node,
  onInterporRecurso,
}: {
  node: RecursoNode;
  onInterporRecurso: (n: RecursoNode) => void;
  depth: number;
}) {
  return (
    <div className="flex flex-wrap items-start gap-3 rounded-md border bg-white px-3 py-2 transition-colors hover:bg-slate-50">
      <div className="min-w-0 flex-1">
        <Link
          href={`/app/tce/processos/${node.id}`}
          className="flex items-center gap-2 font-mono text-sm font-bold text-brand-navy hover:underline"
        >
          {node.numero}
          {node.tipoRecurso && (
            <span className="inline-flex items-center rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-purple-800">
              {TCE_RECURSO_CODE[node.tipoRecurso]}
            </span>
          )}
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </Link>
        <p className="mt-0.5 text-xs text-slate-700">
          <span className="font-medium">
            {node.tipoRecurso ? TCE_RECURSO_LABELS[node.tipoRecurso] : "Recurso"}
          </span>
          {node.dataAutuacao
            ? ` • Autuado em ${formatDate(node.dataAutuacao)}`
            : ""}
          {node.relator ? ` • Rel. ${node.relator}` : ""}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Fase: {node.faseAtual}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <StatusPill label="NT" ativo={node.notaTecnica} />
          <StatusPill label="MPCO" ativo={node.parecerMpco} />
          <StatusPill label="Memorial" ativo={node.memorialPronto} />
          <StatusPill label="Despacho" ativo={node.despachadoComRelator} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {node.prazosAbertos > 0 && node.prazoMaisProximo && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800",
            )}
          >
            <CalendarClock className="h-3 w-3" />
            {node.prazoMaisProximo.tipo} —{" "}
            {formatDate(node.prazoMaisProximo.data)}
            {node.prazosAbertos > 1
              ? ` (+${node.prazosAbertos - 1})`
              : ""}
          </span>
        )}
        {node.prazosAbertos === 0 && (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
            <AlertTriangle className="h-3 w-3" />
            Sem prazos abertos
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-[11px]"
          onClick={() => onInterporRecurso(node)}
        >
          <Plus className="mr-1 h-3 w-3" />
          Recurso vinculado
        </Button>
      </div>
    </div>
  );
}
