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
import { TCE_RECURSO_LABELS } from "@/lib/tce-config";
import { cn } from "@/lib/utils";

import { InterporRecursoDialog } from "./interpor-recurso-dialog";

export type SubprocessoNode = {
  id: string;
  numero: string;
  tipoRecurso: TipoRecursoTce;
  numeroSequencial: number;
  dataInterposicao: string;
  fase: string;
  relator: string | null;
  prazosAbertos: number;
  prazoMaisProximo: { tipo: string; data: string } | null;
  filhos: SubprocessoNode[];
};

type Props = {
  processoId: string;
  baseNumero: string;
  subprocessos: SubprocessoNode[];
};

function formatDate(d: string | null): string {
  if (!d) return "—";
  const date = new Date(d);
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
}

function proximaSeqFactory(
  todos: SubprocessoNode[],
  paiId: string | null,
): (tipo: TipoRecursoTce) => number {
  function findById(
    nodes: SubprocessoNode[],
    id: string,
  ): SubprocessoNode | null {
    for (const n of nodes) {
      if (n.id === id) return n;
      const r = findById(n.filhos, id);
      if (r) return r;
    }
    return null;
  }
  return (tipo: TipoRecursoTce) => {
    if (paiId === null) {
      // Filhos diretos do processo (raiz)
      const max = todos.reduce<number>((acc, n) => {
        if (n.tipoRecurso === tipo)
          return Math.max(acc, n.numeroSequencial);
        return acc;
      }, 0);
      return max + 1;
    }
    const pai = findById(todos, paiId);
    if (!pai) return 1;
    const max = pai.filhos.reduce<number>((acc, n) => {
      if (n.tipoRecurso === tipo) return Math.max(acc, n.numeroSequencial);
      return acc;
    }, 0);
    return max + 1;
  };
}

export function RecursosSection({
  processoId,
  baseNumero,
  subprocessos,
}: Props) {
  const [novoOpenForRoot, setNovoOpenForRoot] = React.useState(false);
  const [novoOpenForSub, setNovoOpenForSub] = React.useState<
    SubprocessoNode | null
  >(null);

  const proximaRoot = React.useMemo(
    () => proximaSeqFactory(subprocessos, null),
    [subprocessos],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">Recursos Interpostos</CardTitle>
        <Button
          size="sm"
          className="bg-brand-navy hover:bg-brand-navy/90"
          onClick={() => setNovoOpenForRoot(true)}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Interpor Recurso
        </Button>
      </CardHeader>
      <CardContent>
        {subprocessos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum recurso interposto neste processo.
          </p>
        ) : (
          <ArvoreSubprocessos
            nodes={subprocessos}
            processoId={processoId}
            todos={subprocessos}
            onInterporSub={(node) => setNovoOpenForSub(node)}
            depth={0}
          />
        )}
      </CardContent>

      <InterporRecursoDialog
        open={novoOpenForRoot}
        onOpenChange={setNovoOpenForRoot}
        processoPaiId={processoId}
        baseNumero={baseNumero}
        proximaSequencial={proximaRoot}
      />

      {novoOpenForSub && (
        <InterporRecursoDialog
          open={!!novoOpenForSub}
          onOpenChange={(v) => {
            if (!v) setNovoOpenForSub(null);
          }}
          subprocessoPaiId={novoOpenForSub.id}
          baseNumero={novoOpenForSub.numero}
          proximaSequencial={proximaSeqFactory(subprocessos, novoOpenForSub.id)}
        />
      )}
    </Card>
  );
}

function ArvoreSubprocessos({
  nodes,
  processoId,
  todos,
  onInterporSub,
  depth,
}: {
  nodes: SubprocessoNode[];
  processoId: string;
  todos: SubprocessoNode[];
  onInterporSub: (n: SubprocessoNode) => void;
  depth: number;
}) {
  void todos;
  return (
    <ul className="flex flex-col gap-2">
      {nodes.map((node) => (
        <li key={node.id}>
          <NoSubprocesso
            node={node}
            processoId={processoId}
            onInterporSub={onInterporSub}
            depth={depth}
          />
          {node.filhos.length > 0 && (
            <div className="ml-6 mt-2 border-l-2 border-slate-200 pl-3">
              <ArvoreSubprocessos
                nodes={node.filhos}
                processoId={processoId}
                todos={todos}
                onInterporSub={onInterporSub}
                depth={depth + 1}
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function NoSubprocesso({
  node,
  processoId,
  onInterporSub,
}: {
  node: SubprocessoNode;
  processoId: string;
  onInterporSub: (n: SubprocessoNode) => void;
  depth: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border bg-white px-3 py-2 transition-colors hover:bg-slate-50">
      <div className="min-w-0 flex-1">
        <Link
          href={`/app/tce/processos/${processoId}/recursos/${node.id}`}
          className="flex items-center gap-2 font-mono text-sm font-bold text-brand-navy hover:underline"
        >
          {node.numero}
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </Link>
        <p className="mt-0.5 text-xs text-slate-700">
          <span className="font-medium">
            {TCE_RECURSO_LABELS[node.tipoRecurso]}
          </span>
          {` • Interposto em ${formatDate(node.dataInterposicao)}`}
          {node.relator ? ` • Rel. ${node.relator}` : ""}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Fase: {node.fase}
        </p>
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
          onClick={() => onInterporSub(node)}
        >
          <Plus className="mr-1 h-3 w-3" />
          Recurso filho
        </Button>
      </div>
    </div>
  );
}
