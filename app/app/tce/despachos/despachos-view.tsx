"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import { CamaraTce, type TipoProcessoTce } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { faseTceLabel, TCE_TIPO_LABELS } from "@/lib/tce-config";
import { cn } from "@/lib/utils";

export type DespachoCard = {
  id: string;
  numero: string;
  tipo: TipoProcessoTce;
  camara: CamaraTce;
  faseAtual: string;
  exercicio: string | null;
  relator: string | null;
  conselheiroSubstituto: string | null;
  municipio: { id: string; nome: string; uf: string } | null;
  interessados: { id: string; nome: string; cargo: string }[];
  prognosticoDespacho: string | null;
  retornoDespacho: string | null;
  despachadoComRelator: boolean;
  dataDespacho: Date | null;
  memorialPronto: boolean;
  incluidoNoDespacho: boolean;
  memoriais: { id: string; nome: string; url: string; createdAt: Date }[];
  // Quando o card representa um SubprocessoTce em vez de ProcessoTce
  subprocesso?: {
    isSubprocesso: true;
    tipoRecursoCode: string;
    processoPai: { id: string; numero: string };
  } | null;
};

type ProcessoLite = {
  id: string;
  numero: string;
  tipo: TipoProcessoTce;
  camara: CamaraTce;
  memorialPronto: boolean;
  despachadoComRelator: boolean;
  incluidoNoDespacho: boolean;
};

const COR_PENDENTE = "#92400e";
const COR_DESPACHADO = "#065f46";
const CAMARA_LABEL: Record<CamaraTce, string> = {
  PRIMEIRA: "1a Camara",
  SEGUNDA: "2a Camara",
  PLENO: "Pleno",
};

const TODOS = "todas";

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function formatDate(d: Date | string | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function DespachosView({
  cards,
  conselheiros,
  processosDisponiveis,
}: {
  cards: DespachoCard[];
  conselheiros: string[];
  processosDisponiveis: ProcessoLite[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [busca, setBusca] = React.useState("");
  const [filtroCamara, setFiltroCamara] = React.useState<string>(TODOS);
  const [filtroRelator, setFiltroRelator] = React.useState("");
  const [filtroStatus, setFiltroStatus] = React.useState<string>("todos");
  const [filtroKpi, setFiltroKpi] = React.useState<
    "todos" | "pendentes" | "despachados" | null
  >(null);
  const [adicionarOpen, setAdicionarOpen] = React.useState(false);

  const filtrados = React.useMemo(() => {
    const q = normalizar(busca.trim());
    const r = normalizar(filtroRelator.trim());
    return cards.filter((c) => {
      if (q && !normalizar(c.numero).includes(q)) return false;
      if (filtroCamara !== TODOS && c.camara !== filtroCamara) return false;
      if (r && !normalizar(c.relator ?? "").includes(r)) return false;
      if (filtroKpi === "pendentes" && c.despachadoComRelator) return false;
      if (filtroKpi === "despachados" && !c.despachadoComRelator) return false;
      if (filtroStatus === "pendente") {
        if (!(c.memorialPronto && !c.despachadoComRelator)) return false;
      } else if (filtroStatus === "despachado") {
        if (!c.despachadoComRelator) return false;
      } else if (filtroStatus === "memorial_pendente") {
        if (c.memorialPronto) return false;
      }
      return true;
    });
  }, [cards, busca, filtroCamara, filtroRelator, filtroStatus, filtroKpi]);

  const totalPendentes = cards.filter(
    (c) => c.memorialPronto && !c.despachadoComRelator,
  ).length;
  const totalDespachados = cards.filter((c) => c.despachadoComRelator).length;

  const naoListadosIds = new Set(cards.map((c) => c.id));
  const processosParaAdicionar = processosDisponiveis.filter(
    (p) => !naoListadosIds.has(p.id),
  );

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Tribunal de Contas
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-brand-navy">
            Despachos TCE
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerenciamento de despachos com relatores.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setAdicionarOpen(true)}
            className="bg-brand-navy hover:bg-brand-navy/90"
            disabled={processosParaAdicionar.length === 0}
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Processo
          </Button>
        </div>
      </header>

      {/* KPIs rapidos clicaveis */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi
          label="Pendentes de despacho"
          value={totalPendentes}
          tone="amber"
          ativo={filtroKpi === "pendentes"}
          onClick={() => setFiltroKpi("pendentes")}
        />
        <Kpi
          label="Despachados"
          value={totalDespachados}
          tone="green"
          ativo={filtroKpi === "despachados"}
          onClick={() => setFiltroKpi("despachados")}
        />
        <Kpi
          label="Total na lista"
          value={cards.length}
          tone="navy"
          ativo={filtroKpi === "todos"}
          onClick={() => setFiltroKpi("todos")}
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
            <Label className="text-xs">Camara</Label>
            <Select value={filtroCamara} onValueChange={setFiltroCamara}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todas</SelectItem>
                <SelectItem value={CamaraTce.PRIMEIRA}>1a Camara</SelectItem>
                <SelectItem value={CamaraTce.SEGUNDA}>2a Camara</SelectItem>
                <SelectItem value={CamaraTce.PLENO}>Pleno</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-[200px] flex-col gap-1">
            <Label className="text-xs">Relator</Label>
            <Input
              value={filtroRelator}
              onChange={(e) => setFiltroRelator(e.target.value)}
              list="relatores-list"
              placeholder="Filtrar por relator"
            />
            <datalist id="relatores-list">
              {conselheiros.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="flex min-w-[200px] flex-col gap-1">
            <Label className="text-xs">Status</Label>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendente de despacho</SelectItem>
                <SelectItem value="despachado">Despachado</SelectItem>
                <SelectItem value="memorial_pendente">
                  Memorial pendente
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(busca ||
            filtroCamara !== TODOS ||
            filtroRelator ||
            filtroStatus !== "todos" ||
            filtroKpi !== null) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setBusca("");
                setFiltroCamara(TODOS);
                setFiltroRelator("");
                setFiltroStatus("todos");
                setFiltroKpi(null);
              }}
            >
              Limpar
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Lista de cards */}
      {filtrados.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {cards.length === 0
              ? "Nenhum processo na lista de despachos. Use '+ Adicionar Processo' ou marque memorial pronto em algum processo TCE."
              : "Nenhum processo bate com o filtro."}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {filtrados.map((c) => (
            <DespachoCardComponent
              key={c.id}
              card={c}
              onChanged={() => router.refresh()}
              toastFn={toast}
            />
          ))}
        </div>
      )}

      <AdicionarProcessoDialog
        open={adicionarOpen}
        onOpenChange={setAdicionarOpen}
        processos={processosParaAdicionar}
        onAdded={() => {
          setAdicionarOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}

function Kpi({
  label,
  value,
  tone,
  ativo,
  onClick,
}: {
  label: string;
  value: number;
  tone: "amber" | "green" | "navy";
  ativo: boolean;
  onClick: () => void;
}) {
  const toneClass = {
    amber: "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100",
    green:
      "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100",
    navy: "border-slate-200 bg-white text-brand-navy hover:bg-slate-50",
  }[tone];
  const ativoClass = {
    amber: "border-amber-500 bg-amber-100 ring-2 ring-amber-400 ring-offset-1",
    green:
      "border-emerald-600 bg-emerald-100 ring-2 ring-emerald-500 ring-offset-1",
    navy: "border-brand-navy bg-brand-navy/10 ring-2 ring-brand-navy ring-offset-1",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn(
        "rounded-md border p-4 text-left shadow-sm transition-all",
        toneClass,
        ativo && ativoClass,
      )}
    >
      <p className="text-2xl font-semibold leading-tight">{value}</p>
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
    </button>
  );
}

// ============== Card individual ==============
function DespachoCardComponent({
  card,
  onChanged,
  toastFn,
}: {
  card: DespachoCard;
  onChanged: () => void;
  toastFn: (opts: {
    title?: string;
    description?: string;
    variant?: "default" | "destructive";
  }) => void;
}) {
  const [prognostico, setPrognostico] = React.useState(
    card.prognosticoDespacho ?? "",
  );
  const [retorno, setRetorno] = React.useState(card.retornoDespacho ?? "");
  const [despachado, setDespachado] = React.useState(card.despachadoComRelator);
  const corHeader = despachado ? COR_DESPACHADO : COR_PENDENTE;
  const [savingPg, setSavingPg] = React.useState(false);
  const [savingRet, setSavingRet] = React.useState(false);
  const [togglingDespacho, setTogglingDespacho] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setPrognostico(card.prognosticoDespacho ?? "");
    setRetorno(card.retornoDespacho ?? "");
    setDespachado(card.despachadoComRelator);
  }, [card.prognosticoDespacho, card.retornoDespacho, card.despachadoComRelator]);

  async function patch(payload: Record<string, unknown>): Promise<boolean> {
    const res = await fetch(`/api/tce/despachos/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toastFn({
        variant: "destructive",
        title: "Erro ao salvar",
        description: json.error ?? "Tente novamente.",
      });
      return false;
    }
    return true;
  }

  async function salvarPrognostico() {
    if ((card.prognosticoDespacho ?? "") === prognostico) return;
    setSavingPg(true);
    const ok = await patch({ prognosticoDespacho: prognostico });
    setSavingPg(false);
    if (ok) onChanged();
  }

  async function salvarRetorno() {
    if ((card.retornoDespacho ?? "") === retorno) return;
    setSavingRet(true);
    const ok = await patch({ retornoDespacho: retorno });
    setSavingRet(false);
    if (ok) onChanged();
  }

  async function toggleDespacho() {
    setTogglingDespacho(true);
    const novoValor = !despachado;
    setDespachado(novoValor);
    const ok = await patch({ despachadoComRelator: novoValor });
    setTogglingDespacho(false);
    if (!ok) {
      setDespachado(!novoValor);
    } else {
      onChanged();
    }
  }

  async function uploadMemorial(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("escopo", "tce");
      fd.append("processoId", card.id);
      fd.append("tipo", "memorial");
      fd.append("nome", file.name);
      const res = await fetch("/api/documentos/upload", {
        method: "POST",
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toastFn({
          variant: "destructive",
          title: "Erro ao anexar memorial",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toastFn({ title: "Memorial anexado" });
      onChanged();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <Card className="overflow-hidden border">
      {/* Cabecalho colorido */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-white"
        style={{ backgroundColor: corHeader }}
      >
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-mono text-sm font-bold tracking-wide">
            {card.numero}
            {card.subprocesso && (
              <span className="rounded bg-white/25 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                {card.subprocesso.tipoRecursoCode}
              </span>
            )}
          </p>
          <p className="text-xs opacity-95">
            {TCE_TIPO_LABELS[card.tipo]}
            {card.municipio
              ? ` • ${card.municipio.nome}/${card.municipio.uf}`
              : ""}
            {card.exercicio ? ` • exercicio ${card.exercicio}` : ""}
          </p>
          {card.subprocesso && (
            <p className="text-[11px] italic opacity-80">
              Recurso vinculado ao processo {card.subprocesso.processoPai.numero}
            </p>
          )}
        </div>
        <span className="rounded bg-white/20 px-2 py-1 text-[11px] font-bold uppercase tracking-wide">
          {CAMARA_LABEL[card.camara]}
        </span>
      </div>

      {/* Corpo em 3 colunas */}
      <div className="grid grid-cols-1 gap-4 border-b border-slate-100 bg-white px-5 py-4 md:grid-cols-3">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Situacao atual
          </p>
          <span className="inline-flex items-center rounded-md border border-brand-navy/30 bg-brand-navy/10 px-2 py-1 text-xs font-medium text-brand-navy">
            {faseTceLabel(card.tipo, card.faseAtual)}
          </span>
          {card.interessados.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Interessados
              </p>
              <ul className="mt-1 space-y-0.5">
                {card.interessados.map((i) => (
                  <li key={i.id} className="text-xs text-slate-700">
                    {i.nome}{" "}
                    <span className="text-muted-foreground">
                      — {i.cargo}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Localizacao
          </p>
          <ul className="space-y-1 text-xs text-slate-800">
            <li>
              <span className="font-medium text-muted-foreground">
                Relator:
              </span>{" "}
              {card.relator ?? "-"}
            </li>
            <li>
              <span className="font-medium text-muted-foreground">
                Camara:
              </span>{" "}
              {CAMARA_LABEL[card.camara]}
            </li>
            {card.conselheiroSubstituto && (
              <li>
                <span className="font-medium text-muted-foreground">
                  Substituto:
                </span>{" "}
                {card.conselheiroSubstituto}
              </li>
            )}
          </ul>
        </div>

        <div>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Prognostico
            {savingPg && (
              <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />
            )}
          </Label>
          <Textarea
            value={prognostico}
            onChange={(e) => setPrognostico(e.target.value)}
            onBlur={salvarPrognostico}
            rows={4}
            placeholder="Anote o prognostico para este despacho..."
            className="mt-1 text-xs"
          />
        </div>
      </div>

      {/* Rodape */}
      <div className="flex flex-col gap-3 bg-slate-50/60 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={despachado}
              onChange={toggleDespacho}
              disabled={togglingDespacho}
              className="h-5 w-5 rounded border-slate-300 text-brand-navy focus:ring-brand-navy"
            />
            <ClipboardCheck className="h-4 w-4 text-brand-navy" />
            Despachado com relator
            {despachado && card.dataDespacho && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                em {formatDate(card.dataDespacho)}
              </span>
            )}
          </label>
          {despachado && (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
              <Check className="h-3 w-3" />
              Despachado
            </span>
          )}
        </div>

        {despachado && (
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Retorno do despacho
              {savingRet && (
                <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />
              )}
            </Label>
            <Textarea
              value={retorno}
              onChange={(e) => setRetorno(e.target.value)}
              onBlur={salvarRetorno}
              rows={3}
              placeholder="O que o relator decidiu ou comentou..."
              className="mt-1 text-xs"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Memorial
            </p>
            {card.memoriais.length > 0 ? (
              <ul className="mt-1 flex flex-col gap-1">
                {card.memoriais.map((m) => (
                  <li key={m.id}>
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-navy hover:underline"
                    >
                      <FileText className="h-3.5 w-3.5 text-red-600" />
                      {m.nome}
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </a>
                    <span className="ml-2 text-[10px] text-muted-foreground">
                      {formatDate(m.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                <AlertCircle className="h-3 w-3" />
                Memorial pendente
              </span>
            )}
          </div>
          {!card.subprocesso && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadMemorial(f);
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-3.5 w-3.5" />
                    Anexar Memorial
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ============== Adicionar Processo ==============
function AdicionarProcessoDialog({
  open,
  onOpenChange,
  processos,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  processos: ProcessoLite[];
  onAdded: () => void;
}) {
  const { toast } = useToast();
  const [busca, setBusca] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) setBusca("");
  }, [open]);

  const lista = React.useMemo(() => {
    const q = normalizar(busca.trim());
    if (!q) return processos.slice(0, 50);
    return processos
      .filter((p) => normalizar(p.numero).includes(q))
      .slice(0, 50);
  }, [busca, processos]);

  async function adicionar(processoId: string) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/tce/despachos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ processoId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro ao adicionar",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toast({ title: "Processo adicionado a lista de despachos" });
      onAdded();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar processo a lista de despachos</DialogTitle>
          <DialogDescription>
            Escolha um processo TCE pelo numero. O processo aparecera na lista
            mesmo sem memorial pronto ou despacho.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar pelo numero do processo..."
            className="pl-9"
          />
        </div>

        <div className="max-h-72 overflow-y-auto rounded-md border bg-white">
          {lista.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {processos.length === 0
                ? "Todos os processos ja estao na lista."
                : "Nenhum processo encontrado."}
            </p>
          ) : (
            <ul className="divide-y">
              {lista.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => adicionar(p.id)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 disabled:opacity-60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs font-medium text-brand-navy">
                        {p.numero}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {TCE_TIPO_LABELS[p.tipo]} •{" "}
                        {CAMARA_LABEL[p.camara]}
                      </p>
                    </div>
                    <Plus className="h-4 w-4 text-brand-navy" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
