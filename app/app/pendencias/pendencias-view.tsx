"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tribunal } from "@prisma/client";
import {
  AlertTriangle,
  Check,
  ClipboardCheck,
  ExternalLink,
  FileDown,
  Loader2,
  Search,
  StickyNote,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type {
  AgregadoPendenciasJud,
  PendenciaJud,
  ProcessoComPendenciasJud,
  TipoPendenciaJud,
} from "@/lib/judicial-pendencias";
import {
  faseLabel,
  tipoLabels,
  tribunalLabels,
} from "@/lib/processo-labels";
import { cn } from "@/lib/utils";

import { CriarPrazoDialog } from "./criar-prazo-dialog";

type Advogado = { id: string; nome: string };

type FiltroKpi = TipoPendenciaJud | "todas" | null;
type FiltroStatus = "pendentes" | "concluidas" | "todas";

const TODOS = "__todos__";

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function PendenciasView({
  cards,
  agregado,
  advogados,
}: {
  cards: ProcessoComPendenciasJud[];
  agregado: AgregadoPendenciasJud;
  advogados: Advogado[];
}) {
  const [filtroKpi, setFiltroKpi] = React.useState<FiltroKpi>(null);
  const [filtroStatus, setFiltroStatus] =
    React.useState<FiltroStatus>("pendentes");
  const [busca, setBusca] = React.useState("");
  const [filtroTribunal, setFiltroTribunal] = React.useState<string>(TODOS);
  const [filtroAdvogado, setFiltroAdvogado] = React.useState<string>(TODOS);

  const cardsFiltrados = React.useMemo(() => {
    const q = normalizar(busca.trim());
    return cards
      .filter((c) => {
        if (q && !normalizar(c.numero).includes(q)) return false;
        if (filtroTribunal !== TODOS && c.tribunal !== filtroTribunal)
          return false;
        if (filtroAdvogado !== TODOS && c.advogadoId !== filtroAdvogado)
          return false;
        return true;
      })
      .map((c) => {
        const filtradas = c.pendencias.filter((pd) => {
          if (filtroStatus === "pendentes" && pd.concluida) return false;
          if (filtroStatus === "concluidas" && !pd.concluida) return false;
          if (filtroKpi && filtroKpi !== "todas" && pd.tipo !== filtroKpi)
            return false;
          return true;
        });
        return { ...c, pendencias: filtradas };
      })
      .filter((c) => c.pendencias.length > 0);
  }, [
    cards,
    filtroKpi,
    filtroStatus,
    busca,
    filtroTribunal,
    filtroAdvogado,
  ]);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Judicial
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-brand-navy">
            Pendencias Judiciais
          </h1>
          <p className="text-sm text-muted-foreground">
            Memoriais, despachos e prazos pendentes.
          </p>
        </div>
        <Button asChild variant="outline">
          <a href="/api/pendencias/export" download>
            <FileDown className="mr-2 h-4 w-4" />
            Exportar PDF
          </a>
        </Button>
      </header>

      {/* KPIs clicaveis */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiBox
          label="Memoriais Pendentes"
          value={agregado.memorial}
          tone="amber"
          ativo={filtroKpi === "memorial"}
          onClick={() => setFiltroKpi("memorial")}
        />
        <KpiBox
          label="Despachos Pendentes"
          value={agregado.despacho}
          tone="amber"
          ativo={filtroKpi === "despacho"}
          onClick={() => setFiltroKpi("despacho")}
        />
        <KpiBox
          label="Prazos Vencendo"
          value={agregado.prazo}
          tone="orange"
          ativo={filtroKpi === "prazo"}
          onClick={() => setFiltroKpi("prazo")}
        />
        <KpiBox
          label="Total Pendencias"
          value={agregado.total}
          tone="slate"
          ativo={filtroKpi === "todas"}
          onClick={() => setFiltroKpi("todas")}
        />
      </section>

      {/* Filtros */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por numero do processo..."
              className="pl-9"
            />
          </div>
          <div className="flex min-w-[160px] flex-col gap-1">
            <Label className="text-xs">Tribunal</Label>
            <Select value={filtroTribunal} onValueChange={setFiltroTribunal}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos</SelectItem>
                <SelectItem value={Tribunal.TJPE}>TJPE</SelectItem>
                <SelectItem value={Tribunal.TRF5}>TRF5</SelectItem>
                <SelectItem value={Tribunal.TRF1}>TRF1</SelectItem>
                <SelectItem value={Tribunal.STJ}>STJ</SelectItem>
                <SelectItem value={Tribunal.STF}>STF</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-[200px] flex-col gap-1">
            <Label className="text-xs">Advogado responsavel</Label>
            <Select value={filtroAdvogado} onValueChange={setFiltroAdvogado}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos</SelectItem>
                {advogados.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-[180px] flex-col gap-1">
            <Label className="text-xs">Status</Label>
            <Select
              value={filtroStatus}
              onValueChange={(v) => setFiltroStatus(v as FiltroStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendentes">Pendentes</SelectItem>
                <SelectItem value="concluidas">Concluidas</SelectItem>
                <SelectItem value="todas">Todas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(filtroKpi !== null ||
            filtroStatus !== "pendentes" ||
            busca ||
            filtroTribunal !== TODOS ||
            filtroAdvogado !== TODOS) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFiltroKpi(null);
                setFiltroStatus("pendentes");
                setBusca("");
                setFiltroTribunal(TODOS);
                setFiltroAdvogado(TODOS);
              }}
            >
              Limpar
            </Button>
          )}
          <p className="ml-auto text-xs text-muted-foreground">
            {cardsFiltrados.length} processo
            {cardsFiltrados.length === 1 ? "" : "s"}
          </p>
        </CardContent>
      </Card>

      {cardsFiltrados.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Nenhuma pendencia no recorte selecionado.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {cardsFiltrados.map((c) => (
            <ProcessoCardComponent
              key={c.id}
              processo={c}
              advogados={advogados}
            />
          ))}
        </div>
      )}
    </>
  );
}

function KpiBox({
  label,
  value,
  tone,
  ativo,
  onClick,
}: {
  label: string;
  value: number;
  tone: "amber" | "orange" | "slate";
  ativo: boolean;
  onClick: () => void;
}) {
  const toneClass = {
    amber: "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100",
    orange:
      "border-orange-200 bg-orange-50 text-orange-900 hover:bg-orange-100",
    slate: "border-slate-200 bg-slate-100 text-slate-900 hover:bg-slate-200",
  }[tone];
  const ativoClass = {
    amber: "border-amber-500 bg-amber-100 ring-2 ring-amber-400 ring-offset-1",
    orange:
      "border-orange-500 bg-orange-100 ring-2 ring-orange-400 ring-offset-1",
    slate:
      "border-slate-500 bg-slate-200 ring-2 ring-slate-400 ring-offset-1",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn(
        "rounded-md border p-3 text-left shadow-sm transition-all",
        toneClass,
        ativo && ativoClass,
      )}
    >
      <p className="text-2xl font-semibold leading-tight">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
        {label}
      </p>
    </button>
  );
}

const TIPO_PRAZO_POR_PENDENCIA: Record<TipoPendenciaJud, string | null> = {
  memorial: "Elaborar Memorial",
  despacho: "Despacho com Relator",
  prazo: null,
};

function ProcessoCardComponent({
  processo,
  advogados,
}: {
  processo: ProcessoComPendenciasJud;
  advogados: Advogado[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [retornoOpen, setRetornoOpen] = React.useState(false);
  const [retornoTexto, setRetornoTexto] = React.useState("");
  const [criarPrazoFor, setCriarPrazoFor] =
    React.useState<TipoPendenciaJud | null>(null);

  async function chamarAcao(
    body: Record<string, unknown>,
    pendenciaId: string,
    msgSucesso: string,
  ): Promise<boolean> {
    setBusyId(pendenciaId);
    try {
      const res = await fetch("/api/pendencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: json.error ?? "Tente novamente.",
        });
        return false;
      }
      toast({ title: msgSucesso });
      router.refresh();
      return true;
    } finally {
      setBusyId(null);
    }
  }

  async function concluir(pd: PendenciaJud) {
    if (pd.tipo === "memorial") {
      await chamarAcao(
        { acao: "memorial_pronto", processoId: processo.id },
        pd.id,
        "Memorial marcado como pronto",
      );
    } else if (pd.tipo === "despacho") {
      setRetornoOpen(true);
    } else if (pd.tipo === "prazo") {
      if (!pd.prazoId) return;
      await chamarAcao(
        { acao: "prazo_cumprido", prazoId: pd.prazoId },
        pd.id,
        "Prazo marcado como cumprido",
      );
    }
  }

  async function confirmarDespacho() {
    setBusyId(`${processo.id}-despacho`);
    try {
      const res = await fetch("/api/pendencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "despacho_feito",
          processoId: processo.id,
          retorno: retornoTexto.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toast({ title: "Despacho registrado" });
      setRetornoOpen(false);
      setRetornoTexto("");
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card className="overflow-hidden border">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-slate-50 px-5 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/app/processos/${processo.id}`}
              className="font-mono text-sm font-bold text-brand-navy hover:underline"
            >
              {processo.numero}
            </Link>
            <span className="rounded bg-brand-navy/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-navy">
              {tribunalLabels[processo.tribunal]}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {tipoLabels[processo.tipo]}
            {` • Gestor: ${processo.gestorNome}`}
            {` • Adv: ${processo.advogadoNome}`}
          </p>
          <p className="mt-0.5 text-xs text-slate-700">
            Fase: {faseLabel(processo.fase)}
          </p>
        </div>
      </div>

      <ul className="divide-y">
        {processo.pendencias.map((pd) => (
          <li
            key={pd.id}
            className="flex flex-wrap items-center gap-3 px-5 py-3"
          >
            <PendenciaIcon tipo={pd.tipo} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800">
                {pd.descricao}
              </p>
              {pd.detalhe && (
                <p className="text-xs text-muted-foreground">{pd.detalhe}</p>
              )}
            </div>
            {pd.concluida ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                <Check className="h-3 w-3" />
                Concluida
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-red-700">
                Pendente
              </span>
            )}
            {!pd.concluida && (
              <div className="flex flex-wrap items-center gap-2">
                {pd.tipo === "prazo" && pd.prazoId && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="gap-1"
                  >
                    <Link href="/app/prazos">
                      Ver prazo
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </Button>
                )}
                {TIPO_PRAZO_POR_PENDENCIA[pd.tipo] && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCriarPrazoFor(pd.tipo)}
                    disabled={busyId !== null}
                  >
                    Criar Prazo
                  </Button>
                )}
                <Button
                  size="sm"
                  className="bg-brand-navy hover:bg-brand-navy/90"
                  onClick={() => concluir(pd)}
                  disabled={busyId !== null}
                >
                  {busyId === pd.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : pd.tipo === "memorial" ? (
                    "Memorial Pronto"
                  ) : pd.tipo === "despacho" ? (
                    "Marcar Despachado"
                  ) : (
                    "Marcar Cumprido"
                  )}
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <CriarPrazoDialog
        open={criarPrazoFor !== null}
        onOpenChange={(v) => {
          if (!v) setCriarPrazoFor(null);
        }}
        processoId={processo.id}
        tipoPrazo={
          (criarPrazoFor && TIPO_PRAZO_POR_PENDENCIA[criarPrazoFor]) || ""
        }
        advogados={advogados}
        onCreated={() => {
          setCriarPrazoFor(null);
          router.refresh();
        }}
      />

      {retornoOpen && (
        <div className="border-t bg-amber-50 px-5 py-4">
          <Label className="text-xs font-semibold uppercase tracking-wide text-amber-900">
            Retorno do despacho (opcional)
          </Label>
          <Textarea
            value={retornoTexto}
            onChange={(e) => setRetornoTexto(e.target.value)}
            rows={3}
            placeholder="O que o relator decidiu ou comentou..."
            className="mt-1 text-xs"
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRetornoOpen(false);
                setRetornoTexto("");
              }}
              disabled={busyId !== null}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-brand-navy hover:bg-brand-navy/90"
              onClick={confirmarDespacho}
              disabled={busyId !== null}
            >
              <ClipboardCheck className="mr-1 h-3.5 w-3.5" />
              Marcar como Despachado
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function PendenciaIcon({ tipo }: { tipo: TipoPendenciaJud }) {
  if (tipo === "memorial") {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700">
        <StickyNote className="h-4 w-4" />
      </span>
    );
  }
  if (tipo === "despacho") {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700">
        <ClipboardCheck className="h-4 w-4" />
      </span>
    );
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-orange-100 text-orange-700">
      <AlertTriangle className="h-4 w-4" />
    </span>
  );
}
