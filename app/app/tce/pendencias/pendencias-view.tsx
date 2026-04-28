"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CamaraTce } from "@prisma/client";
import {
  AlertTriangle,
  Ban,
  Check,
  ClipboardCheck,
  ExternalLink,
  FileDown,
  FileText,
  Loader2,
  StickyNote,
} from "lucide-react";

import { BancaBadgeList } from "@/components/bancas/banca-badge";
import { BancaFilter } from "@/components/bancas/banca-filter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { TCE_TIPO_LABELS, faseTceLabel } from "@/lib/tce-config";
import type {
  AggregadoPendencias,
  Pendencia,
  ProcessoComPendencias,
  TipoPendencia,
} from "@/lib/tce-pendencias";
import { cn } from "@/lib/utils";

import { CriarPrazoDialog } from "./criar-prazo-dialog";
import { AgendarPendenciaDialog } from "./agendar-dialog";
import { DespachoFeitoDialog } from "./despacho-feito-dialog";
import { DispensarPendenciaDialog } from "./dispensar-dialog";
import { MemorialProntoDialog } from "./memorial-pronto-dialog";

const CAMARA_LABEL: Record<CamaraTce, string> = {
  PRIMEIRA: "1a Camara",
  SEGUNDA: "2a Camara",
  PLENO: "Pleno",
};

type Advogado = { id: string; nome: string };

type FiltroKpi = TipoPendencia | "todas" | null;
type FiltroStatus = "pendentes" | "concluidas" | "dispensados" | "todas";

export function PendenciasView({
  cards,
  agregado,
  advogados,
}: {
  cards: ProcessoComPendencias[];
  agregado: AggregadoPendencias;
  advogados: Advogado[];
}) {
  const [filtroKpi, setFiltroKpi] = React.useState<FiltroKpi>(null);
  const [filtroStatus, setFiltroStatus] =
    React.useState<FiltroStatus>("pendentes");

  const cardsFiltrados = React.useMemo(() => {
    return cards
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
  }, [cards, filtroKpi, filtroStatus]);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Tribunal de Contas
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-brand-navy">
            Pendencias TCE
          </h1>
          <p className="text-sm text-muted-foreground">
            Contrarrazoes, memoriais, despachos e prazos pendentes.
          </p>
        </div>
        <Button asChild variant="outline">
          <a href="/api/tce/pendencias/export" download>
            <FileDown className="mr-2 h-4 w-4" />
            Exportar PDF
          </a>
        </Button>
      </header>

      {/* KPIs clicaveis */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiBox
          label="Contrarrazoes NT"
          value={agregado.contrarrazoesNt}
          tone="red"
          ativo={filtroKpi === "contrarrazoes_nt"}
          onClick={() => setFiltroKpi("contrarrazoes_nt")}
        />
        <KpiBox
          label="Contrarrazoes MPCO"
          value={agregado.contrarrazoesMpco}
          tone="red"
          ativo={filtroKpi === "contrarrazoes_mpco"}
          onClick={() => setFiltroKpi("contrarrazoes_mpco")}
        />
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

      {/* Filtro de status */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="flex min-w-[200px] flex-col gap-1">
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
          {(filtroKpi !== null || filtroStatus !== "pendentes") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFiltroKpi(null);
                setFiltroStatus("pendentes");
              }}
            >
              Limpar filtros
            </Button>
          )}
          <div className="w-full">
            <BancaFilter />
          </div>
          <p className="ml-auto text-xs text-muted-foreground">
            {cardsFiltrados.length} processo
            {cardsFiltrados.length === 1 ? "" : "s"} no recorte
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
  tone: "red" | "amber" | "orange" | "slate";
  ativo: boolean;
  onClick: () => void;
}) {
  const toneClass = {
    red: "border-red-200 bg-red-50 text-red-900 hover:bg-red-100",
    amber: "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100",
    orange:
      "border-orange-200 bg-orange-50 text-orange-900 hover:bg-orange-100",
    slate: "border-slate-200 bg-slate-100 text-slate-900 hover:bg-slate-200",
  }[tone];
  const ativoClass = {
    red: "border-red-600 bg-red-100 ring-2 ring-red-500 ring-offset-1",
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

// =============== Card por processo ===============
function ProcessoCardComponent({
  processo,
  advogados,
}: {
  processo: ProcessoComPendencias;
  advogados: Advogado[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [criarPrazoFor, setCriarPrazoFor] =
    React.useState<TipoPendencia | null>(null);
  const [agendarMemorialOpen, setAgendarMemorialOpen] = React.useState(false);
  const [agendarDespachoOpen, setAgendarDespachoOpen] = React.useState(false);
  const [memorialProntoOpen, setMemorialProntoOpen] = React.useState(false);
  const [despachoFeitoOpen, setDespachoFeitoOpen] = React.useState(false);
  const [dispensarMemorialOpen, setDispensarMemorialOpen] = React.useState(false);
  const [dispensarDespachoOpen, setDispensarDespachoOpen] = React.useState(false);
  const [dispensarPrazoCtx, setDispensarPrazoCtx] = React.useState<{
    prazoId: string;
    prazoTipo: string;
  } | null>(null);

  async function reverterDispensa(modo: "memorial" | "despacho") {
    setBusyId(`reverter-${modo}`);
    try {
      const res = await fetch("/api/tce/pendencias", {
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

  // Quando o user marca cumprido um prazo do tipo "Agendar..." abrimos o modal
  // de agendamento com a data pre-preenchida.
  function isAgendarMemorialPrazo(tipo: string | null | undefined): boolean {
    return !!tipo && /agendar.*memorial|memorial.*elabora/i.test(tipo);
  }
  function isAgendarDespachoPrazo(tipo: string | null | undefined): boolean {
    return !!tipo && /agendar.*despacho|marca.*despacho/i.test(tipo);
  }

  const TIPO_PRAZO_POR_PENDENCIA: Record<TipoPendencia, string | null> = {
    contrarrazoes_nt: "Contrarrazoes a Nota Tecnica",
    contrarrazoes_mpco: "Contrarrazoes ao Parecer MPCO",
    memorial: "Agendar Elaboracao do Memorial",
    despacho: "Agendar Marcacao do Despacho",
    prazo: null,
  };

  async function chamarAcao(
    body: Record<string, unknown>,
    pendenciaId: string,
    msgSucesso: string,
  ): Promise<boolean> {
    setBusyId(pendenciaId);
    try {
      const res = await fetch("/api/tce/pendencias", {
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

  async function concluir(pd: Pendencia) {
    if (pd.tipo === "contrarrazoes_nt") {
      await chamarAcao(
        { acao: "contrarrazoes_nt", processoId: processo.id },
        pd.id,
        "Contrarrazoes registradas",
      );
    } else if (pd.tipo === "contrarrazoes_mpco") {
      await chamarAcao(
        { acao: "contrarrazoes_mpco", processoId: processo.id },
        pd.id,
        "Contrarrazoes registradas",
      );
    } else if (pd.tipo === "memorial") {
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
      return;
    }
  }

  return (
    <Card className="overflow-hidden border">
      {/* Cabecalho */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-slate-50 px-5 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/app/tce/processos/${processo.id}`}
              className="font-mono text-sm font-bold text-brand-navy hover:underline"
            >
              {processo.numero}
            </Link>
            <span className="rounded bg-brand-navy/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-navy">
              {CAMARA_LABEL[processo.camara]}
            </span>
            <BancaBadgeList slugs={processo.bancasSlug} max={3} />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {TCE_TIPO_LABELS[processo.tipo]}
            {processo.municipio
              ? ` • ${processo.municipio.nome}/${processo.municipio.uf}`
              : ""}
            {processo.exercicio ? ` • exercicio ${processo.exercicio}` : ""}
            {processo.relator ? ` • ${processo.relator}` : ""}
          </p>
          <p className="mt-0.5 text-xs text-slate-700">
            Fase: {faseTceLabel(processo.tipo, processo.faseAtual)}
          </p>
        </div>
      </div>

      {/* Lista de pendencias */}
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
                    <Link href="/app/tce/prazos">
                      Ver prazo
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </Button>
                )}
                {pd.tipo === "prazo" &&
                  pd.prazoId &&
                  pd.prazoStatus === "alerta" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-300 text-slate-700 hover:bg-slate-100"
                      onClick={() =>
                        setDispensarPrazoCtx({
                          prazoId: pd.prazoId!.replace(/^sub-/, ""),
                          prazoTipo: pd.prazoTipo ?? pd.descricao,
                        })
                      }
                      disabled={busyId !== null}
                    >
                      <Ban className="mr-1 h-3.5 w-3.5" />
                      Dispensar
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
                  ) : pd.tipo === "prazo" ? (
                    "Marcar Cumprido"
                  ) : (
                    "Concluir"
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
        apiPath="/api/tce/pendencias"
      />

      <AgendarPendenciaDialog
        open={agendarDespachoOpen}
        onOpenChange={setAgendarDespachoOpen}
        modo="despacho"
        processoId={processo.id}
        advogados={advogados}
        apiPath="/api/tce/pendencias"
      />

      <MemorialProntoDialog
        open={memorialProntoOpen}
        onOpenChange={setMemorialProntoOpen}
        processoId={processo.id}
        escopo="tce"
        pendenciasApiPath="/api/tce/pendencias"
      />

      <DespachoFeitoDialog
        open={despachoFeitoOpen}
        onOpenChange={setDespachoFeitoOpen}
        processoId={processo.id}
        pendenciasApiPath="/api/tce/pendencias"
      />

      <DispensarPendenciaDialog
        open={dispensarMemorialOpen}
        onOpenChange={setDispensarMemorialOpen}
        modo="memorial"
        processoId={processo.id}
        advogados={advogados}
        apiPath="/api/tce/pendencias"
      />

      <DispensarPendenciaDialog
        open={dispensarDespachoOpen}
        onOpenChange={setDispensarDespachoOpen}
        modo="despacho"
        processoId={processo.id}
        advogados={advogados}
        apiPath="/api/tce/pendencias"
      />

      <DispensarPendenciaDialog
        open={dispensarPrazoCtx !== null}
        onOpenChange={(v) => {
          if (!v) setDispensarPrazoCtx(null);
        }}
        modo="prazo"
        prazoId={dispensarPrazoCtx?.prazoId}
        prazoTipo={dispensarPrazoCtx?.prazoTipo}
        advogados={advogados}
        apiPath="/api/tce/pendencias"
        onSuccess={() => setDispensarPrazoCtx(null)}
      />
    </Card>
  );
}

function PendenciaIcon({ tipo }: { tipo: TipoPendencia }) {
  if (tipo === "contrarrazoes_nt" || tipo === "contrarrazoes_mpco") {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-100 text-red-700">
        <FileText className="h-4 w-4" />
      </span>
    );
  }
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
