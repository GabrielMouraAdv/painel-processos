"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { CompromissoForm } from "./compromisso-form";
import {
  type CalendarEvento,
  type EventoOrigem,
} from "./types";

export type AdvogadoOption = { id: string; nome: string };
export type ProcessoTceOption = {
  id: string;
  numero: string;
  municipio: string | null;
};
export type ProcessoJudOption = {
  id: string;
  numero: string;
  gestor: string;
};

type ViewMode = "mes" | "semana" | "dia" | "lista";

type FiltroTipo = "todos" | "prazoTce" | "prazoJudicial" | "compromisso";

type Props = {
  usuario: { id: string; nome: string };
  isAdmin: boolean;
  advogados: AdvogadoOption[];
  processosTce: ProcessoTceOption[];
  processosJud: ProcessoJudOption[];
};

const COR_PRAZO_TCE = "#3b82f6";
const COR_PRAZO_JUDICIAL = "#10b981";
const COR_COMPROMISSO_DEFAULT = "#8b5cf6";

const MESES_PT = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const DIAS_SEMANA_CURTO = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfWeek(d: Date): Date {
  const r = startOfDay(d);
  const dow = r.getDay();
  return addDays(r, -dow);
}

function startOfMonth(d: Date): Date {
  const r = new Date(d);
  r.setDate(1);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfMonth(d: Date): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + 1, 0);
  r.setHours(23, 59, 59, 999);
  return r;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function diasEntre(a: Date, b: Date): number {
  return Math.round(
    (startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000,
  );
}

function formatHora(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function formatDataBR(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

function urgenciaEvento(
  ev: CalendarEvento,
  hoje: Date,
): "vencido" | "urgente" | "normal" {
  if (ev.cumprido || ev.dispensado) return "normal";
  const d = new Date(ev.dataInicio);
  const dias = diasEntre(hoje, d);
  if (dias < 0) return "vencido";
  if (dias <= 1) return "urgente";
  return "normal";
}

function eventoLink(ev: CalendarEvento): string | null {
  if (!ev.processoRef) return null;
  return ev.processoRef.tipo === "tce"
    ? `/app/tce/processos/${ev.processoRef.id}`
    : `/app/processos/${ev.processoRef.id}`;
}

export function CompromissosView({
  usuario,
  isAdmin,
  advogados,
  processosTce,
  processosJud,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [view, setView] = React.useState<ViewMode>("mes");
  const [referencia, setReferencia] = React.useState(() => startOfDay(new Date()));
  const [filtroTipo, setFiltroTipo] = React.useState<FiltroTipo>("todos");
  const [filtroAdvogado, setFiltroAdvogado] = React.useState<string>(
    isAdmin ? "__todos__" : usuario.id,
  );

  const [eventos, setEventos] = React.useState<CalendarEvento[]>([]);
  const [loading, setLoading] = React.useState(false);

  const [novoOpen, setNovoOpen] = React.useState(false);
  const [novoDataInicial, setNovoDataInicial] = React.useState<string | null>(
    null,
  );
  const [visualizando, setVisualizando] = React.useState<CalendarEvento | null>(
    null,
  );
  const [editando, setEditando] = React.useState<CalendarEvento | null>(null);

  const hoje = React.useMemo(() => startOfDay(new Date()), []);

  const { rangeInicio, rangeFim } = React.useMemo(() => {
    if (view === "mes") {
      const ini = startOfWeek(startOfMonth(referencia));
      const fim = addDays(ini, 41);
      fim.setHours(23, 59, 59, 999);
      return { rangeInicio: ini, rangeFim: fim };
    }
    if (view === "semana") {
      const ini = startOfWeek(referencia);
      const fim = addDays(ini, 6);
      fim.setHours(23, 59, 59, 999);
      return { rangeInicio: ini, rangeFim: fim };
    }
    if (view === "dia") {
      const ini = startOfDay(referencia);
      const fim = new Date(ini);
      fim.setHours(23, 59, 59, 999);
      return { rangeInicio: ini, rangeFim: fim };
    }
    // lista: 30 dias a frente
    const ini = startOfDay(referencia);
    const fim = addDays(ini, 30);
    fim.setHours(23, 59, 59, 999);
    return { rangeInicio: ini, rangeFim: fim };
  }, [view, referencia]);

  const carregar = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("inicio", rangeInicio.toISOString());
      params.set("fim", rangeFim.toISOString());
      if (filtroAdvogado && filtroAdvogado !== "__todos__") {
        params.set("advogadoId", filtroAdvogado);
      }
      if (filtroTipo !== "todos") params.set("origens", filtroTipo);
      const res = await fetch(`/api/compromissos?${params.toString()}`);
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro ao carregar agenda",
        });
        setEventos([]);
        return;
      }
      const data: CalendarEvento[] = await res.json();
      setEventos(data);
    } finally {
      setLoading(false);
    }
  }, [rangeInicio, rangeFim, filtroAdvogado, filtroTipo, toast]);

  React.useEffect(() => {
    carregar();
  }, [carregar]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  async function handleDragEnd(e: DragEndEvent) {
    if (!e.over) return;
    const ev = eventos.find((x) => x.id === String(e.active.id));
    const novaDataStr = String(e.over.id);
    if (!ev || !novaDataStr.startsWith("day-")) return;
    const novaData = new Date(novaDataStr.slice(4) + "T00:00:00");
    if (sameDay(new Date(ev.dataInicio), novaData)) return;

    const antes = eventos;
    setEventos((prev) =>
      prev.map((x) =>
        x.id === ev.id
          ? {
              ...x,
              dataInicio: new Date(
                novaData.getFullYear(),
                novaData.getMonth(),
                novaData.getDate(),
                new Date(x.dataInicio).getHours(),
                new Date(x.dataInicio).getMinutes(),
              ).toISOString(),
            }
          : x,
      ),
    );

    const res = await fetch("/api/compromissos/mover", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: ev.id,
        origem: ev.origem,
        novaData: novaData.toISOString(),
      }),
    });
    if (!res.ok) {
      setEventos(antes);
      const json = await res.json().catch(() => ({}));
      toast({
        variant: "destructive",
        title: "Erro ao mover",
        description: json.error ?? "Tente novamente",
      });
      return;
    }
    toast({ title: "Evento movido" });
    router.refresh();
  }

  async function handleToggleCumprido(ev: CalendarEvento) {
    const novo = !ev.cumprido;
    if (ev.origem === "compromisso") {
      const res = await fetch(`/api/compromissos/${ev.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cumprido: novo }),
      });
      if (!res.ok) {
        toast({ variant: "destructive", title: "Erro ao atualizar" });
        return;
      }
    } else if (ev.origem === "prazoJudicial") {
      const res = await fetch(`/api/prazos/${ev.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cumprido: novo }),
      });
      if (!res.ok) {
        toast({ variant: "destructive", title: "Erro ao atualizar" });
        return;
      }
    } else {
      const res = await fetch(`/api/tce/prazos/${ev.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cumprido: novo }),
      });
      if (!res.ok) {
        toast({ variant: "destructive", title: "Erro ao atualizar" });
        return;
      }
    }
    toast({ title: novo ? "Marcado como cumprido" : "Reaberto" });
    setVisualizando(null);
    carregar();
  }

  async function handleExcluirCompromisso(ev: CalendarEvento) {
    if (ev.origem !== "compromisso") return;
    if (!window.confirm(`Excluir o compromisso "${ev.titulo}"?`)) return;
    const res = await fetch(`/api/compromissos/${ev.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast({ variant: "destructive", title: "Erro ao excluir" });
      return;
    }
    toast({ title: "Compromisso excluido" });
    setVisualizando(null);
    carregar();
  }

  function navegar(direcao: -1 | 1) {
    if (view === "mes") {
      const r = new Date(referencia);
      r.setMonth(r.getMonth() + direcao);
      setReferencia(r);
    } else if (view === "semana") {
      setReferencia(addDays(referencia, direcao * 7));
    } else if (view === "dia") {
      setReferencia(addDays(referencia, direcao));
    } else {
      setReferencia(addDays(referencia, direcao * 30));
    }
  }

  function tituloPeriodo(): string {
    if (view === "mes") {
      return `${MESES_PT[referencia.getMonth()]} ${referencia.getFullYear()}`;
    }
    if (view === "semana") {
      const ini = startOfWeek(referencia);
      const fim = addDays(ini, 6);
      return `${formatDataBR(ini.toISOString())} — ${formatDataBR(fim.toISOString())}`;
    }
    if (view === "dia") {
      return new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(referencia);
    }
    return "Proximos 30 dias";
  }

  function abrirNovoEm(dataIso: string) {
    setNovoDataInicial(dataIso);
    setNovoOpen(true);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-brand-navy">
              Meus Compromissos
            </h1>
            <p className="text-sm text-muted-foreground">
              Visao unificada de prazos TCE, judiciais e compromissos pessoais.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                setNovoDataInicial(null);
                setNovoOpen(true);
              }}
              className="bg-brand-navy hover:bg-brand-navy/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar Compromisso
            </Button>
          </div>
        </header>

        <Card>
          <CardContent className="flex flex-wrap items-end gap-3 pt-6">
            <div className="flex items-center rounded-md border bg-white p-1 text-sm">
              {(["mes", "semana", "dia", "lista"] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={cn(
                    "rounded-sm px-3 py-1 capitalize transition-colors",
                    view === v
                      ? "bg-brand-navy text-white"
                      : "text-slate-600 hover:bg-slate-100",
                  )}
                >
                  {v === "mes"
                    ? "Mes"
                    : v === "semana"
                      ? "Semana"
                      : v === "dia"
                        ? "Dia"
                        : "Lista"}
                </button>
              ))}
            </div>

            <div className="flex min-w-[200px] flex-col gap-1">
              <Label className="text-xs">
                <Filter className="mr-1 inline h-3 w-3" /> Tipo
              </Label>
              <Select
                value={filtroTipo}
                onValueChange={(v) => setFiltroTipo(v as FiltroTipo)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="prazoTce">Prazos TCE</SelectItem>
                  <SelectItem value="prazoJudicial">Prazos Judiciais</SelectItem>
                  <SelectItem value="compromisso">Compromissos avulsos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex min-w-[220px] flex-col gap-1">
              <Label className="text-xs">Advogado</Label>
              <Select
                value={filtroAdvogado}
                onValueChange={setFiltroAdvogado}
                disabled={!isAdmin}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isAdmin && (
                    <SelectItem value="__todos__">Todos</SelectItem>
                  )}
                  {advogados.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto flex items-center gap-2 text-sm">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navegar(-1)}
                aria-label="Anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReferencia(startOfDay(new Date()))}
              >
                Hoje
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navegar(1)}
                aria-label="Proximo"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="ml-2 min-w-[200px] text-right font-semibold capitalize text-brand-navy">
                {tituloPeriodo()}
              </div>
            </div>
          </CardContent>
        </Card>

        <Legenda />

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        )}

        {view === "mes" && (
          <CalendarioMensal
            referencia={referencia}
            hoje={hoje}
            eventos={eventos}
            onClickDia={(iso) => abrirNovoEm(iso)}
            onClickEvento={setVisualizando}
          />
        )}
        {view === "semana" && (
          <CalendarioSemanal
            referencia={referencia}
            hoje={hoje}
            eventos={eventos}
            onClickDia={(iso) => abrirNovoEm(iso)}
            onClickEvento={setVisualizando}
          />
        )}
        {view === "dia" && (
          <CalendarioDia
            referencia={referencia}
            eventos={eventos}
            onClickEvento={setVisualizando}
            onClickHora={(iso) => abrirNovoEm(iso)}
          />
        )}
        {view === "lista" && (
          <ListaEventos
            eventos={eventos}
            hoje={hoje}
            onClickEvento={setVisualizando}
          />
        )}
      </div>

      <Dialog
        open={novoOpen}
        onOpenChange={(o) => {
          setNovoOpen(o);
          if (!o) setNovoDataInicial(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo compromisso</DialogTitle>
            <DialogDescription>
              Crie um compromisso pessoal ou vincule a um processo.
            </DialogDescription>
          </DialogHeader>
          <CompromissoForm
            mode="create"
            dataInicialIso={novoDataInicial}
            usuario={usuario}
            isAdmin={isAdmin}
            advogados={advogados}
            processosTce={processosTce}
            processosJud={processosJud}
            onSuccess={() => {
              setNovoOpen(false);
              setNovoDataInicial(null);
              carregar();
            }}
            onCancel={() => {
              setNovoOpen(false);
              setNovoDataInicial(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editando}
        onOpenChange={(o) => !o && setEditando(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar compromisso</DialogTitle>
            <DialogDescription>
              Atualize os dados do compromisso.
            </DialogDescription>
          </DialogHeader>
          {editando && editando.origem === "compromisso" && (
            <CompromissoForm
              mode="edit"
              evento={editando}
              usuario={usuario}
              isAdmin={isAdmin}
              advogados={advogados}
              processosTce={processosTce}
              processosJud={processosJud}
              onSuccess={() => {
                setEditando(null);
                carregar();
              }}
              onCancel={() => setEditando(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!visualizando}
        onOpenChange={(o) => !o && setVisualizando(null)}
      >
        <DialogContent>
          {visualizando && (
            <VisualizarEvento
              evento={visualizando}
              onEditar={() => {
                if (visualizando.origem === "compromisso") {
                  setEditando(visualizando);
                  setVisualizando(null);
                } else {
                  const link = eventoLink(visualizando);
                  if (link) router.push(link);
                }
              }}
              onExcluir={() => handleExcluirCompromisso(visualizando)}
              onToggleCumprido={() => handleToggleCumprido(visualizando)}
            />
          )}
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}

function Legenda() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block h-3 w-3 rounded-sm"
          style={{ backgroundColor: COR_PRAZO_TCE }}
        />
        Prazo TCE
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block h-3 w-3 rounded-sm"
          style={{ backgroundColor: COR_PRAZO_JUDICIAL }}
        />
        Prazo Judicial
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block h-3 w-3 rounded-sm"
          style={{ backgroundColor: COR_COMPROMISSO_DEFAULT }}
        />
        Compromisso
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-sm bg-red-600" />
        Urgente / vencido
      </span>
    </div>
  );
}

function eventosDoDia(
  eventos: CalendarEvento[],
  dia: Date,
): CalendarEvento[] {
  return eventos.filter((e) => sameDay(new Date(e.dataInicio), dia));
}

function CalendarioMensal({
  referencia,
  hoje,
  eventos,
  onClickDia,
  onClickEvento,
}: {
  referencia: Date;
  hoje: Date;
  eventos: CalendarEvento[];
  onClickDia: (isoDate: string) => void;
  onClickEvento: (ev: CalendarEvento) => void;
}) {
  const inicio = startOfWeek(startOfMonth(referencia));
  const dias: Date[] = [];
  for (let i = 0; i < 42; i++) dias.push(addDays(inicio, i));

  return (
    <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
      <div className="grid grid-cols-7 border-b bg-slate-50">
        {DIAS_SEMANA_CURTO.map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-600"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dias.map((d) => {
          const ehHoje = sameDay(d, hoje);
          const noMes = d.getMonth() === referencia.getMonth();
          const evs = eventosDoDia(eventos, d);
          return (
            <DropDia
              key={d.toISOString()}
              dia={d}
              ehHoje={ehHoje}
              noMes={noMes}
              eventos={evs}
              onClickDia={onClickDia}
              onClickEvento={onClickEvento}
              hoje={hoje}
            />
          );
        })}
      </div>
    </div>
  );
}

function DropDia({
  dia,
  ehHoje,
  noMes,
  eventos,
  hoje,
  onClickDia,
  onClickEvento,
}: {
  dia: Date;
  ehHoje: boolean;
  noMes: boolean;
  eventos: CalendarEvento[];
  hoje: Date;
  onClickDia: (isoDate: string) => void;
  onClickEvento: (ev: CalendarEvento) => void;
}) {
  const iso = ymd(dia);
  const { setNodeRef, isOver } = useDroppable({ id: `day-${iso}` });
  const [expandido, setExpandido] = React.useState(false);
  const mostrar = expandido ? eventos : eventos.slice(0, 3);
  const restantes = eventos.length - mostrar.length;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[110px] border-b border-r p-1.5",
        !noMes && "bg-slate-50/40",
        ehHoje && "bg-amber-50",
        isOver && "ring-2 ring-inset ring-brand-navy/40",
      )}
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onClickDia(`${iso}T09:00:00`)}
          className={cn(
            "text-xs font-semibold",
            ehHoje
              ? "text-amber-800"
              : noMes
                ? "text-slate-900"
                : "text-slate-400",
          )}
        >
          {dia.getDate()}
        </button>
        {ehHoje && (
          <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white">
            hoje
          </span>
        )}
      </div>
      <div className="mt-1 space-y-1">
        {mostrar.map((ev) => (
          <EventoBadge
            key={ev.id}
            ev={ev}
            hoje={hoje}
            onClick={() => onClickEvento(ev)}
          />
        ))}
        {restantes > 0 && (
          <button
            type="button"
            onClick={() => setExpandido(true)}
            className="text-[10px] font-semibold text-brand-navy hover:underline"
          >
            + {restantes} mais
          </button>
        )}
        {expandido && eventos.length > 3 && (
          <button
            type="button"
            onClick={() => setExpandido(false)}
            className="text-[10px] font-semibold text-slate-500 hover:underline"
          >
            recolher
          </button>
        )}
      </div>
    </div>
  );
}

function EventoBadge({
  ev,
  hoje,
  onClick,
}: {
  ev: CalendarEvento;
  hoje: Date;
  onClick: () => void;
}) {
  const { setNodeRef, listeners, attributes, isDragging, transform } =
    useDraggable({ id: ev.id });
  const urg = urgenciaEvento(ev, hoje);
  const corBorda =
    urg === "vencido" || urg === "urgente"
      ? "#dc2626"
      : ev.cor ?? COR_COMPROMISSO_DEFAULT;
  const style: React.CSSProperties = {
    borderLeftColor: corBorda,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.55 : 1,
    background:
      urg === "vencido"
        ? "repeating-linear-gradient(45deg, #fee2e2, #fee2e2 4px, #fecaca 4px, #fecaca 8px)"
        : undefined,
  };
  const titleTooltip = [
    ev.titulo,
    ev.local ? `Local: ${ev.local}` : null,
    ev.advogado ? `Resp: ${ev.advogado.nome}` : "Sem responsavel",
    !ev.diaInteiro ? `As ${formatHora(ev.dataInicio)}` : null,
    ev.processoRef ? `Processo: ${ev.processoRef.numero}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      title={titleTooltip}
      onClick={(e) => {
        e.stopPropagation();
        if (!isDragging) onClick();
      }}
      className={cn(
        "cursor-pointer truncate rounded-sm border-l-4 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-700 shadow-sm hover:bg-slate-50",
        ev.cumprido && "opacity-60 line-through",
      )}
    >
      {!ev.advogado && (
        <span className="mr-1 rounded bg-amber-200 px-0.5 text-[8px] font-bold uppercase text-amber-900">
          SR
        </span>
      )}
      {ev.titulo}
    </div>
  );
}

function CalendarioSemanal({
  referencia,
  hoje,
  eventos,
  onClickDia,
  onClickEvento,
}: {
  referencia: Date;
  hoje: Date;
  eventos: CalendarEvento[];
  onClickDia: (isoDate: string) => void;
  onClickEvento: (ev: CalendarEvento) => void;
}) {
  const inicio = startOfWeek(referencia);
  const dias: Date[] = [];
  for (let i = 0; i < 7; i++) dias.push(addDays(inicio, i));
  const horas: number[] = [];
  for (let h = 6; h <= 22; h++) horas.push(h);

  return (
    <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-slate-50">
        <div />
        {dias.map((d) => {
          const ehHoje = sameDay(d, hoje);
          return (
            <div
              key={d.toISOString()}
              className={cn(
                "px-2 py-2 text-center text-xs font-semibold",
                ehHoje ? "bg-amber-100 text-amber-800" : "text-slate-700",
              )}
            >
              <div className="text-[10px] uppercase tracking-wider">
                {DIAS_SEMANA_CURTO[d.getDay()]}
              </div>
              <div className="text-base">{d.getDate()}</div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-[60px_repeat(7,1fr)]">
        {horas.map((h) => (
          <React.Fragment key={h}>
            <div className="border-b border-r px-2 py-1 text-right text-[10px] text-slate-500">
              {String(h).padStart(2, "0")}:00
            </div>
            {dias.map((d) => {
              const slotIso = `${ymd(d)}T${String(h).padStart(2, "0")}:00:00`;
              const evs = eventos.filter((e) => {
                if (!sameDay(new Date(e.dataInicio), d)) return false;
                const eh = new Date(e.dataInicio).getHours();
                return eh === h;
              });
              const ehHoje = sameDay(d, hoje);
              return (
                <div
                  key={`${ymd(d)}-${h}`}
                  className={cn(
                    "min-h-[42px] cursor-pointer border-b border-r p-1 transition-colors hover:bg-slate-50",
                    ehHoje && "bg-amber-50/40",
                  )}
                  onClick={() => onClickDia(slotIso)}
                >
                  {evs.map((ev) => (
                    <EventoBadge
                      key={ev.id}
                      ev={ev}
                      hoje={hoje}
                      onClick={() => onClickEvento(ev)}
                    />
                  ))}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function CalendarioDia({
  referencia,
  eventos,
  onClickEvento,
  onClickHora,
}: {
  referencia: Date;
  eventos: CalendarEvento[];
  onClickEvento: (ev: CalendarEvento) => void;
  onClickHora: (iso: string) => void;
}) {
  const horas: number[] = [];
  for (let h = 6; h <= 22; h++) horas.push(h);
  const hoje = startOfDay(new Date());
  const ehHoje = sameDay(referencia, hoje);

  const diaInteiro = eventos.filter(
    (e) => sameDay(new Date(e.dataInicio), referencia) && e.diaInteiro,
  );

  return (
    <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
      {diaInteiro.length > 0 && (
        <div className="border-b bg-slate-50 px-4 py-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Dia inteiro / sem hora
          </p>
          <div className="flex flex-wrap gap-1.5">
            {diaInteiro.map((ev) => (
              <EventoBadge
                key={ev.id}
                ev={ev}
                hoje={hoje}
                onClick={() => onClickEvento(ev)}
              />
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-[60px_1fr]">
        {horas.map((h) => {
          const slotIso = `${ymd(referencia)}T${String(h).padStart(2, "0")}:00:00`;
          const evs = eventos.filter((e) => {
            if (!sameDay(new Date(e.dataInicio), referencia)) return false;
            if (e.diaInteiro) return false;
            return new Date(e.dataInicio).getHours() === h;
          });
          return (
            <React.Fragment key={h}>
              <div className="border-b border-r px-2 py-2 text-right text-xs text-slate-500">
                {String(h).padStart(2, "0")}:00
              </div>
              <div
                onClick={() => onClickHora(slotIso)}
                className={cn(
                  "min-h-[52px] cursor-pointer border-b p-1.5 transition-colors hover:bg-slate-50",
                  ehHoje && "bg-amber-50/30",
                )}
              >
                {evs.map((ev) => (
                  <EventoBadge
                    key={ev.id}
                    ev={ev}
                    hoje={hoje}
                    onClick={() => onClickEvento(ev)}
                  />
                ))}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function ListaEventos({
  eventos,
  hoje,
  onClickEvento,
}: {
  eventos: CalendarEvento[];
  hoje: Date;
  onClickEvento: (ev: CalendarEvento) => void;
}) {
  if (eventos.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhum evento nos proximos 30 dias.
        </CardContent>
      </Card>
    );
  }
  // agrupa por dia
  const byDay = new Map<string, CalendarEvento[]>();
  for (const ev of eventos) {
    const k = ymd(new Date(ev.dataInicio));
    const list = byDay.get(k) ?? [];
    list.push(ev);
    byDay.set(k, list);
  }
  const sortedKeys = Array.from(byDay.keys()).sort();
  return (
    <div className="flex flex-col gap-3">
      {sortedKeys.map((k) => {
        const evs = byDay.get(k)!;
        const d = new Date(k + "T00:00:00");
        const ehHoje = sameDay(d, hoje);
        return (
          <Card key={k}>
            <CardContent className="pt-5">
              <p
                className={cn(
                  "mb-2 text-xs font-semibold uppercase tracking-wider",
                  ehHoje ? "text-amber-700" : "text-slate-600",
                )}
              >
                {ehHoje ? "Hoje — " : ""}
                {new Intl.DateTimeFormat("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                }).format(d)}
              </p>
              <div className="flex flex-col gap-1.5">
                {evs.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onClickEvento(ev)}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-md border-l-4 bg-slate-50 px-3 py-2 text-left text-sm hover:bg-slate-100",
                      ev.cumprido && "opacity-60",
                    )}
                    style={{
                      borderLeftColor: ev.cor ?? COR_COMPROMISSO_DEFAULT,
                    }}
                  >
                    <span className="flex items-center gap-2">
                      {!ev.diaInteiro && (
                        <span className="font-mono text-xs text-slate-500">
                          {formatHora(ev.dataInicio)}
                        </span>
                      )}
                      <span className={cn(ev.cumprido && "line-through")}>
                        {ev.titulo}
                      </span>
                    </span>
                    <span className="text-xs text-slate-500">
                      {ev.advogado?.nome ?? "Sem responsavel"}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function VisualizarEvento({
  evento,
  onEditar,
  onExcluir,
  onToggleCumprido,
}: {
  evento: CalendarEvento;
  onEditar: () => void;
  onExcluir: () => void;
  onToggleCumprido: () => void;
}) {
  const link = eventoLink(evento);
  const origemLabel =
    evento.origem === "prazoTce"
      ? "Prazo TCE"
      : evento.origem === "prazoJudicial"
        ? "Prazo Judicial"
        : "Compromisso";
  return (
    <div className="space-y-3">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CalendarDays
            className="h-4 w-4"
            style={{ color: evento.cor ?? COR_COMPROMISSO_DEFAULT }}
          />
          {evento.titulo}
        </DialogTitle>
        <DialogDescription>
          {origemLabel}
          {evento.tipo ? ` · ${evento.tipo}` : ""}
        </DialogDescription>
      </DialogHeader>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Quando
          </dt>
          <dd>
            {formatDataBR(evento.dataInicio)}
            {!evento.diaInteiro ? ` as ${formatHora(evento.dataInicio)}` : ""}
            {evento.dataFim
              ? ` — ${formatDataBR(evento.dataFim)}${
                  !evento.diaInteiro ? ` ${formatHora(evento.dataFim)}` : ""
                }`
              : ""}
          </dd>
        </div>
        {evento.local && (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Local
            </dt>
            <dd>{evento.local}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Responsavel
          </dt>
          <dd>{evento.advogado?.nome ?? "Sem responsavel"}</dd>
        </div>
        {evento.descricao && (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Descricao
            </dt>
            <dd className="whitespace-pre-wrap">{evento.descricao}</dd>
          </div>
        )}
        {evento.processoRef && link && (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Processo vinculado
            </dt>
            <dd>
              <Link
                href={link}
                className="font-mono text-brand-navy hover:underline"
              >
                {evento.processoRef.numero}
              </Link>
            </dd>
          </div>
        )}
      </dl>
      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onToggleCumprido}>
          {evento.cumprido ? "Reabrir" : "Marcar como cumprido"}
        </Button>
        {evento.origem === "compromisso" ? (
          <>
            <Button variant="outline" size="sm" onClick={onEditar}>
              Editar
            </Button>
            <Button variant="destructive" size="sm" onClick={onExcluir}>
              Excluir
            </Button>
          </>
        ) : link ? (
          <Button
            variant="default"
            size="sm"
            className="bg-brand-navy hover:bg-brand-navy/90"
            onClick={onEditar}
          >
            Ver Processo
          </Button>
        ) : null}
      </div>
    </div>
  );
}
