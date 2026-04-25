"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tribunal } from "@prisma/client";
import {
  AlertTriangle,
  Ban,
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
import { useToast } from "@/hooks/use-toast";
import type {
  AgregadoPendenciasJud,
  PendenciaJud,
  ProcessoComPendenciasJud,
  TipoPendenciaJud,
} from "@/lib/judicial-pendencias";
import {
  faseLabel,
  tipoProcessoLabel,
  tribunalLabels,
} from "@/lib/processo-labels";
import { cn } from "@/lib/utils";

import { CriarPrazoDialog } from "./criar-prazo-dialog";
import { AgendarPendenciaDialog } from "../tce/pendencias/agendar-dialog";
import { DespachoFeitoDialog } from "../tce/pendencias/despacho-feito-dialog";
import { DispensarPendenciaDialog } from "../tce/pendencias/dispensar-dialog";
import { MemorialProntoDialog } from "../tce/pendencias/memorial-pronto-dialog";

type Advogado = { id: string; nome: string };

type FiltroKpi = TipoPendenciaJud | "todas" | null;
type FiltroStatus = "pendentes" | "concluidas" | "dispensados" | "todas";

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
          if (filtroStatus === "pendentes" && (pd.concluida || pd.dispensado))
            return false;
          if (filtroStatus === "concluidas" && (!pd.concluida || pd.dispensado))
            return false;
          if (filtroStatus === "dispensados" && !pd.dispensado) return false;
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
                <SelectItem value="dispensados">Dispensados</SelectItem>
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
  memorial: "Agendar Elaboracao do Memorial",
  despacho: "Agendar Marcacao do Despacho",
  prazo: null,
};

function isAgendarMemorialPrazo(tipo: string | null | undefined): boolean {
  return !!tipo && /agendar.*memorial|memorial.*elabora/i.test(tipo);
}
function isAgendarDespachoPrazo(tipo: string | null | undefined): boolean {
  return !!tipo && /agendar.*despacho|marca.*despacho/i.test(tipo);
}

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
  const [criarPrazoFor, setCriarPrazoFor] =
    React.useState<TipoPendenciaJud | null>(null);
  const [agendarMemorialOpen, setAgendarMemorialOpen] = React.useState(false);
  const [agendarDespachoOpen, setAgendarDespachoOpen] = React.useState(false);
  const [memorialProntoOpen, setMemorialProntoOpen] = React.useState(false);
  const [despachoFeitoOpen, setDespachoFeitoOpen] = React.useState(false);
  const [dispensarMemorialOpen, setDispensarMemorialOpen] = React.useState(false);
  const [dispensarDespachoOpen, setDispensarDespachoOpen] = React.useState(false);

  async function reverterDispensa(modo: "memorial" | "despacho") {
    setBusyId(`reverter-${modo}`);
    try {
      const res = await fetch("/api/pendencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao:
            modo === "memorial"
              ? "reverter_dispensa_memorial"
              : "reverter_dispensa_despacho",
          processoId: processo.id,
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
      toast({ title: "Dispensa revertida" });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

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
      setMemorialProntoOpen(true);
    } else if (pd.tipo === "despacho") {
      setDespachoFeitoOpen(true);
    } else if (pd.tipo === "prazo") {
      if (!pd.prazoId) return;
      const ok = await chamarAcao(
        { acao: "prazo_cumprido", prazoId: pd.prazoId },
        pd.id,
        "Prazo marcado como cumprido",
      );
      if (ok && isAgendarMemorialPrazo(pd.prazoTipo)) {
        setAgendarMemorialOpen(true);
      } else if (ok && isAgendarDespachoPrazo(pd.prazoTipo)) {
        setAgendarDespachoOpen(true);
      }
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
            {tipoProcessoLabel(processo.tipo, processo.tipoLivre)}
            {` • Gestor: ${processo.gestorNome}`}
            {` • Adv: ${processo.advogadoNome}`}
          </p>
          <p className="mt-0.5 text-xs text-slate-700">
            Fase: {faseLabel(processo.fase)}
          </p>
        </div>
      </div>

      <ul className="divide-y">
        {processo.pendencias.map((pd) => {
          const isVencido = pd.tipo === "prazo" && pd.prazoStatus === "vencido";
          const isAgendado = !!pd.agendado;
          const isDispensado = !!pd.dispensado;
          return (
          <li
            key={pd.id}
            className={
              isDispensado
                ? "flex flex-wrap items-center gap-3 border-l-4 border-l-slate-400 bg-slate-100 px-5 py-3"
                : isVencido
                  ? "flex flex-wrap items-center gap-3 border-l-4 border-l-red-700 bg-red-50 px-5 py-3"
                  : isAgendado
                    ? "flex flex-wrap items-center gap-3 border-l-4 border-l-blue-500 bg-blue-50 px-5 py-3"
                    : "flex flex-wrap items-center gap-3 px-5 py-3"
            }
          >
            <PendenciaIcon tipo={pd.tipo} />
            <div className="min-w-0 flex-1">
              <p
                className={
                  isVencido
                    ? "text-sm font-bold uppercase tracking-wide text-red-800"
                    : "text-sm font-medium text-slate-800"
                }
              >
                {pd.descricao}
              </p>
              {pd.detalhe && (
                <p className="text-xs text-muted-foreground">{pd.detalhe}</p>
              )}
              {pd.tipo === "prazo" && (
                <p
                  className={
                    pd.advogadoResp
                      ? "text-xs text-muted-foreground"
                      : "text-xs font-semibold text-orange-800"
                  }
                >
                  Responsavel:{" "}
                  {pd.advogadoResp ? `Dr. ${pd.advogadoResp}` : "nao vinculado"}
                </p>
              )}
            </div>
            {isDispensado ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-200 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700">
                <Ban className="h-3 w-3" />
                Dispensado
              </span>
            ) : pd.tipo === "prazo" ? (
              pd.prazoStatus === "vencido" ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-red-700 bg-[#fecaca] px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-[#7f1d1d]">
                  Vencido
                </span>
              ) : pd.prazoStatus === "cumprido_com_atraso" ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-200 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700">
                  <Check className="h-3 w-3" />
                  Cumprido com atraso
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md bg-[#fed7aa] px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-[#9a3412]">
                  Alerta
                </span>
              )
            ) : pd.concluida ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                <Check className="h-3 w-3" />
                Concluida
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-red-700">
                Pendente
              </span>
            )}
            {isDispensado && (pd.tipo === "memorial" || pd.tipo === "despacho") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => reverterDispensa(pd.tipo as "memorial" | "despacho")}
                disabled={busyId !== null}
              >
                {busyId === `reverter-${pd.tipo}` ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Reverter Dispensa"
                )}
              </Button>
            )}
            {!pd.concluida && !isDispensado && (
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
                {TIPO_PRAZO_POR_PENDENCIA[pd.tipo] && !isAgendado && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCriarPrazoFor(pd.tipo)}
                    disabled={busyId !== null}
                  >
                    Criar Prazo
                  </Button>
                )}
                {isAgendado && pd.tipo === "memorial" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAgendarMemorialOpen(true)}
                    disabled={busyId !== null}
                  >
                    Reagendar
                  </Button>
                )}
                {isAgendado && pd.tipo === "despacho" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAgendarDespachoOpen(true)}
                    disabled={busyId !== null}
                  >
                    Reagendar
                  </Button>
                )}
                {(pd.tipo === "memorial" || pd.tipo === "despacho") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-300 text-slate-700 hover:bg-slate-100"
                    onClick={() =>
                      pd.tipo === "memorial"
                        ? setDispensarMemorialOpen(true)
                        : setDispensarDespachoOpen(true)
                    }
                    disabled={busyId !== null}
                  >
                    <Ban className="mr-1 h-3.5 w-3.5" />
                    Dispensar
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
          );
        })}
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

      <AgendarPendenciaDialog
        open={agendarMemorialOpen}
        onOpenChange={setAgendarMemorialOpen}
        modo="memorial"
        processoId={processo.id}
        advogados={advogados}
        apiPath="/api/pendencias"
      />

      <AgendarPendenciaDialog
        open={agendarDespachoOpen}
        onOpenChange={setAgendarDespachoOpen}
        modo="despacho"
        processoId={processo.id}
        advogados={advogados}
        apiPath="/api/pendencias"
      />

      <MemorialProntoDialog
        open={memorialProntoOpen}
        onOpenChange={setMemorialProntoOpen}
        processoId={processo.id}
        escopo="judicial"
        pendenciasApiPath="/api/pendencias"
      />

      <DespachoFeitoDialog
        open={despachoFeitoOpen}
        onOpenChange={setDespachoFeitoOpen}
        processoId={processo.id}
        pendenciasApiPath="/api/pendencias"
      />

      <DispensarPendenciaDialog
        open={dispensarMemorialOpen}
        onOpenChange={setDispensarMemorialOpen}
        modo="memorial"
        processoId={processo.id}
        advogados={advogados}
        apiPath="/api/pendencias"
      />

      <DispensarPendenciaDialog
        open={dispensarDespachoOpen}
        onOpenChange={setDispensarDespachoOpen}
        modo="despacho"
        processoId={processo.id}
        advogados={advogados}
        apiPath="/api/pendencias"
      />
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
