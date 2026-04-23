"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Grau, Risco, TipoProcesso, Tribunal } from "@prisma/client";
import { CalendarDays, Check, ChevronRight, CircleAlert, Clock, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  GrauBadge,
  RiscoBadge,
  TipoBadge,
  TribunalBadge,
} from "@/components/processo-badges";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { faseLabel } from "@/lib/processo-labels";
import { cn } from "@/lib/utils";

import { AndamentoForm } from "./andamento-form";
import {
  ProcessoForm,
  type AdvogadoOption,
  type GestorOption,
  type ProcessoFormInitial,
} from "../processo-form";

type Andamento = {
  id: string;
  data: string;
  grau: Grau;
  fase: string;
  resultado: string | null;
  texto: string;
  autor: { nome: string };
};

type Prazo = {
  id: string;
  tipo: string;
  data: string;
  hora: string | null;
  observacoes: string | null;
  cumprido: boolean;
  geradoAuto: boolean;
  origemFase: string | null;
};

export type ProcessoDetail = {
  id: string;
  numero: string;
  tipo: TipoProcesso;
  tribunal: Tribunal;
  juizo: string;
  grau: Grau;
  fase: string;
  resultado: string | null;
  risco: Risco;
  valor: number | null;
  dataDistribuicao: string;
  objeto: string;
  gestorId: string;
  advogadoId: string;
  createdAt: string;
  updatedAt: string;
  gestor: { id: string; nome: string; cargo: string; observacoes: string | null };
  advogado: { id: string; nome: string; email: string };
  andamentos: Andamento[];
  prazos: Prazo[];
};

type Props = {
  processo: ProcessoDetail;
  gestores: GestorOption[];
  advogados: AdvogadoOption[];
};

function formatDate(d: string | null | undefined): string {
  if (!d) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(d));
}

function formatCurrency(v: number | null): string {
  if (v === null || v === undefined) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

export function ProcessoView({ processo, gestores, advogados }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const initial: ProcessoFormInitial = {
    numero: processo.numero,
    tipo: processo.tipo,
    tribunal: processo.tribunal,
    juizo: processo.juizo,
    grau: processo.grau,
    fase: processo.fase,
    resultado: processo.resultado ?? "",
    risco: processo.risco,
    valor: processo.valor,
    dataDistribuicao: processo.dataDistribuicao,
    objeto: processo.objeto,
    gestorId: processo.gestorId,
    advogadoId: processo.advogadoId,
  };

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/processos/${processo.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast({
          variant: "destructive",
          title: "Erro ao excluir",
          description: json.error ?? "Nao foi possivel excluir o processo.",
        });
        return;
      }
      toast({ title: "Processo excluido" });
      router.push("/app/processos");
      router.refresh();
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  if (editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Editar processo</CardTitle>
          <CardDescription>Atualize os dados e salve.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProcessoForm
            mode="edit"
            processoId={processo.id}
            initial={initial}
            gestores={gestores}
            advogados={advogados}
            onCancel={() => setEditing(false)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-muted-foreground">{processo.numero}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-brand-navy md:text-3xl">
            {processo.gestor.observacoes ?? processo.gestor.nome}
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestor responsavel: {processo.gestor.nome} ({processo.gestor.cargo})
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <TipoBadge tipo={processo.tipo} />
            <TribunalBadge tribunal={processo.tribunal} />
            <GrauBadge grau={processo.grau} />
            <RiscoBadge risco={processo.risco} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="mr-1.5 h-4 w-4" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Excluir
            </Button>
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Situacao</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Info label="Fase atual" value={faseLabel(processo.fase)} />
            <Info label="Resultado" value={processo.resultado ?? "-"} />
            <Info label="Juizo" value={processo.juizo} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Datas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Info label="Distribuicao" value={formatDate(processo.dataDistribuicao)} />
            <Info label="Criado em" value={formatDate(processo.createdAt)} />
            <Info label="Atualizado em" value={formatDate(processo.updatedAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Financeiro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Info label="Valor envolvido" value={formatCurrency(processo.valor)} />
            <Info label="Advogado responsavel" value={processo.advogado.nome} />
            <Info label="Contato" value={processo.advogado.email} />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Objeto</CardTitle>
          <CardDescription>Descricao do objeto da acao.</CardDescription>
        </CardHeader>
        <CardContent className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
          {processo.objeto}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo andamento</CardTitle>
          <CardDescription>
            Registre uma movimentacao e, se houver, gere prazos automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AndamentoForm
            processoId={processo.id}
            currentGrau={processo.grau}
            currentFase={processo.fase}
          />
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Andamentos</CardTitle>
            <CardDescription>
              {processo.andamentos.length} registro
              {processo.andamentos.length === 1 ? "" : "s"} — mais recente primeiro.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {processo.andamentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem andamentos registrados.</p>
            ) : (
              <ol className="relative space-y-6 border-l border-slate-200 pl-6">
                {processo.andamentos.map((a) => (
                  <li key={a.id} className="relative">
                    <span className="absolute -left-[29px] top-1 flex h-3 w-3 items-center justify-center">
                      <span className="h-3 w-3 rounded-full border-2 border-brand-navy bg-white" />
                    </span>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>{formatDate(a.data)}</span>
                      <span aria-hidden="true">•</span>
                      <span className="font-medium text-brand-navy">{faseLabel(a.fase)}</span>
                      {a.resultado && (
                        <>
                          <ChevronRight className="h-3 w-3" aria-hidden="true" />
                          <span>{a.resultado}</span>
                        </>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-700">{a.texto}</p>
                    <p className="mt-1 text-xs text-muted-foreground">por {a.autor.nome}</p>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prazos</CardTitle>
            <CardDescription>
              {processo.prazos.length} prazo
              {processo.prazos.length === 1 ? "" : "s"} vinculado
              {processo.prazos.length === 1 ? "" : "s"} a este processo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {processo.prazos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem prazos cadastrados.</p>
            ) : (
              <ul className="space-y-3">
                {processo.prazos.map((p) => (
                  <li
                    key={p.id}
                    className={cn(
                      "rounded-md border p-3 text-sm",
                      p.cumprido
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-slate-200 bg-white",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-medium text-brand-navy">
                        {p.cumprido ? (
                          <Check className="h-4 w-4 text-emerald-700" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-600" />
                        )}
                        {p.tipo}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(p.data)}
                        {p.hora ? ` as ${p.hora}` : ""}
                      </span>
                    </div>
                    {p.observacoes && (
                      <p className="mt-2 text-xs text-muted-foreground">{p.observacoes}</p>
                    )}
                    {p.geradoAuto && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <CircleAlert className="h-3 w-3" />
                        Gerado automaticamente a partir da fase {p.origemFase ?? "-"}.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir processo?</DialogTitle>
            <DialogDescription>
              Esta acao e irreversivel. Todos os andamentos, prazos e documentos vinculados serao removidos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Excluindo..." : "Confirmar exclusao"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-slate-800">{value}</p>
    </div>
  );
}
