"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Download,
  Eye,
  MessageCircle,
  Mic,
  MonitorCheck,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { addDaysIso, parseISODate } from "@/lib/semana";
import { TIPOS_SESSAO } from "@/lib/tjpe-config";
import { cn } from "@/lib/utils";

import {
  ItemPautaJudicialDialog,
  type ItemPautaJudicialInitial,
  type ProcessoJudicialOption,
} from "./item-pauta-judicial-dialog";

export type TribunalKey = "TJPE" | "TRF5";

export type OrgaoJulgadorOption = {
  label: string;
  horario: string | null;
};

export type MembroComposicao = {
  nome: string;
  cargo: "Presidente" | "Titular" | "Substituto" | "Cargo Vago";
  observacao: string | null;
};

export type ComposicaoRecord = Record<string, MembroComposicao[]>;

export type SessaoRow = {
  id: string;
  data: string;
  tribunal: string;
  orgaoJulgador: string;
  tipoSessao: string;
  observacoesGerais: string | null;
  itens: ItemPautaJudicialInitial[];
};

type Filters = {
  orgaoJulgador: string;
  tipoSessao: string;
  relator: string;
  advogadoResp: string;
  q: string;
};

type Props = {
  tribunal: TribunalKey;
  sessoes: SessaoRow[];
  weekStart: string;
  weekEnd: string;
  initialFilters: Filters;
  advogadosCadastrados: string[];
  desembargadores: string[];
  processosJudiciais: ProcessoJudicialOption[];
  orgaosJulgadores: OrgaoJulgadorOption[];
  composicao: ComposicaoRecord;
  tiposRecurso: string[];
  canEdit: boolean;
};

type Categoria =
  | "direito_publico"
  | "criminal"
  | "regional_caruaru"
  | "pleno"
  | "turma"
  | "secao";

function categoriaOrgao(orgao: string, tribunal: TribunalKey): Categoria {
  if (tribunal === "TRF5") {
    if (orgao.includes("Pleno") || orgao.includes("Plenario Virtual"))
      return "pleno";
    if (orgao.includes("Secao")) return "secao";
    return "turma";
  }
  if (orgao.includes("Regional Caruaru")) return "regional_caruaru";
  if (orgao.includes("Pleno") || orgao === "Plenario Virtual") return "pleno";
  if (orgao.includes("Criminal")) return "criminal";
  return "direito_publico";
}

const CATEGORIA_STYLE: Record<
  Categoria,
  { badge: string; border: string; bg: string }
> = {
  direito_publico: {
    badge: "bg-[#1e40af] text-white",
    border: "border-l-[#1e40af]",
    bg: "bg-blue-50",
  },
  criminal: {
    badge: "bg-[#b91c1c] text-white",
    border: "border-l-[#b91c1c]",
    bg: "bg-red-50",
  },
  regional_caruaru: {
    badge: "bg-[#047857] text-white",
    border: "border-l-[#047857]",
    bg: "bg-emerald-50",
  },
  pleno: {
    badge: "bg-[#6b21a8] text-white",
    border: "border-l-[#6b21a8]",
    bg: "bg-purple-50",
  },
  turma: {
    badge: "bg-[#0f766e] text-white",
    border: "border-l-[#0f766e]",
    bg: "bg-teal-50",
  },
  secao: {
    badge: "bg-[#be185d] text-white",
    border: "border-l-[#be185d]",
    bg: "bg-pink-50",
  },
};

const TIPO_SESSAO_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  presencial: {
    label: "Presencial",
    className: "bg-slate-200 text-slate-800",
  },
  virtual: {
    label: "Virtual",
    className: "bg-orange-100 text-orange-800",
  },
  plenario_virtual: {
    label: "Plenario Virtual",
    className: "bg-orange-100 text-orange-800",
  },
};

function formatDateShort(iso: string): string {
  const d = parseISO(iso.slice(0, 10));
  if (!d) return iso;
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateFullUTC(iso: string): string {
  const d = parseISO(iso.slice(0, 10));
  if (!d) return iso;
  const weekdays = [
    "Domingo",
    "Segunda-feira",
    "Terca-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sabado",
  ];
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${weekdays[d.getUTCDay()]}, ${day}/${month}/${year}`;
}

function parseISO(d: string): Date | null {
  return parseISODate(d);
}

function todayIso(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function horaDoHorario(horario: string | null | undefined): {
  hour: number;
  minute: number;
} {
  if (!horario) return { hour: 9, minute: 0 };
  const m = /(\d+)h(\d{0,2})/i.exec(horario.trim());
  if (!m) return { hour: 9, minute: 0 };
  const hour = parseInt(m[1], 10);
  const minute = m[2] ? parseInt(m[2], 10) : 0;
  return { hour: Number.isFinite(hour) ? hour : 9, minute: Number.isFinite(minute) ? minute : 0 };
}

function sessaoDateTimeLocal(
  sessaoIso: string,
  horario: string | null | undefined,
): Date {
  const day = sessaoIso.slice(0, 10);
  const [y, m, d] = day.split("-").map(Number);
  const { hour, minute } = horaDoHorario(horario);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hour, minute, 0, 0);
}

function formatDateTimeBR(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const hour = String(d.getHours()).padStart(2, "0");
  const minute = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month} ${hour}:${minute}`;
}

function SustentacaoOralBadge({
  sessaoIso,
  horario,
}: {
  sessaoIso: string;
  horario: string | null | undefined;
}) {
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  if (!now) return null;

  const sessaoStart = sessaoDateTimeLocal(sessaoIso, horario);
  const diffMs = sessaoStart.getTime() - now.getTime();
  if (diffMs <= 0) return null;

  const prazo48h = new Date(sessaoStart.getTime() - 48 * 60 * 60 * 1000);
  const urgente = diffMs < 48 * 60 * 60 * 1000;

  if (urgente) {
    return (
      <span
        className="inline-flex animate-pulse items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
        title="Prazo para inscricao de sustentacao oral vencendo"
      >
        <AlertTriangle className="h-2.5 w-2.5" />
        ATENCAO: Prazo sustentacao oral vencendo!
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold text-yellow-900"
      title="Prazo para inscricao de sustentacao oral"
    >
      <Mic className="h-2.5 w-2.5" />
      Sustentacao oral agendada — prazo ate {formatDateTimeBR(prazo48h)}
    </span>
  );
}

export function PautasJudiciaisView({
  tribunal,
  sessoes,
  weekStart,
  weekEnd,
  initialFilters,
  advogadosCadastrados,
  desembargadores,
  processosJudiciais,
  orgaosJulgadores,
  composicao,
  tiposRecurso,
  canEdit,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [filters, setFilters] = React.useState(initialFilters);
  const [duplicandoId, setDuplicandoId] = React.useState<string | null>(null);
  const [exportando, setExportando] = React.useState<
    "pdf" | "whatsapp" | null
  >(null);
  const [whatsappTexto, setWhatsappTexto] = React.useState<string | null>(null);
  const [relatorDraft, setRelatorDraft] = React.useState(initialFilters.relator);
  const [advDraft, setAdvDraft] = React.useState(initialFilters.advogadoResp);
  const [qDraft, setQDraft] = React.useState(initialFilters.q);

  const [novaSessaoOpen, setNovaSessaoOpen] = React.useState(false);
  const [editarSessao, setEditarSessao] = React.useState<SessaoRow | null>(null);
  const [excluirSessao, setExcluirSessao] = React.useState<SessaoRow | null>(null);
  const [sessaoPending, setSessaoPending] = React.useState(false);

  const [itemDialog, setItemDialog] = React.useState<{
    mode: "create" | "edit";
    sessaoId: string;
    item?: ItemPautaJudicialInitial;
  } | null>(null);
  const [excluirItem, setExcluirItem] = React.useState<{
    id: string;
    numero: string;
  } | null>(null);
  const [itemPending, setItemPending] = React.useState(false);

  function pushWithFilters(next: Filters, week?: string, tribunalOverride?: TribunalKey) {
    const params = new URLSearchParams();
    params.set("tribunal", tribunalOverride ?? tribunal);
    params.set("semana", week ?? weekStart);
    if (next.orgaoJulgador) params.set("orgaoJulgador", next.orgaoJulgador);
    if (next.tipoSessao) params.set("tipoSessao", next.tipoSessao);
    if (next.relator) params.set("relator", next.relator);
    if (next.advogadoResp) params.set("advogadoResp", next.advogadoResp);
    if (next.q) params.set("q", next.q);
    router.push(`/app/pautas?${params.toString()}`);
  }

  function goToTribunal(t: TribunalKey) {
    if (t === tribunal) return;
    pushWithFilters(
      {
        orgaoJulgador: "",
        tipoSessao: filters.tipoSessao,
        relator: filters.relator,
        advogadoResp: filters.advogadoResp,
        q: filters.q,
      },
      weekStart,
      t,
    );
  }

  function goToWeek(iso: string) {
    pushWithFilters(filters, iso);
  }

  function updateFilter<K extends keyof Filters>(k: K, v: Filters[K]) {
    const next = { ...filters, [k]: v };
    setFilters(next);
    pushWithFilters(next);
  }

  function applyTextFilters() {
    const next = {
      ...filters,
      relator: relatorDraft.trim(),
      advogadoResp: advDraft.trim(),
      q: qDraft.trim(),
    };
    setFilters(next);
    pushWithFilters(next);
  }

  function clearFilters() {
    setRelatorDraft("");
    setAdvDraft("");
    setQDraft("");
    const next = {
      orgaoJulgador: "",
      tipoSessao: "",
      relator: "",
      advogadoResp: "",
      q: "",
    };
    setFilters(next);
    pushWithFilters(next);
  }

  async function excluirSessaoConfirm() {
    if (!excluirSessao) return;
    setSessaoPending(true);
    try {
      const res = await fetch(`/api/pautas/${excluirSessao.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast({ variant: "destructive", title: "Erro ao excluir sessao" });
        return;
      }
      toast({ title: "Sessao excluida" });
      setExcluirSessao(null);
      router.refresh();
    } finally {
      setSessaoPending(false);
    }
  }

  async function excluirItemConfirm() {
    if (!excluirItem) return;
    setItemPending(true);
    try {
      const res = await fetch(`/api/pautas/itens/${excluirItem.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast({ variant: "destructive", title: "Erro ao excluir item" });
        return;
      }
      toast({ title: "Item excluido" });
      setExcluirItem(null);
      router.refresh();
    } finally {
      setItemPending(false);
    }
  }

  async function duplicarSessao(sessaoId: string) {
    setDuplicandoId(sessaoId);
    try {
      const res = await fetch(`/api/pautas/${sessaoId}/duplicar`, {
        method: "POST",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast({
          variant: "destructive",
          title: "Erro ao duplicar sessao",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toast({
        title: "Sessao duplicada",
        description: "Nova sessao criada na semana seguinte com os itens.",
      });
      router.refresh();
    } finally {
      setDuplicandoId(null);
    }
  }

  async function exportarPdf() {
    setExportando("pdf");
    try {
      const res = await fetch(
        `/api/pautas/export?semana=${weekStart}&format=pdf&tribunal=${tribunal}`,
      );
      if (!res.ok) {
        toast({ variant: "destructive", title: "Erro ao exportar PDF" });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pauta-${tribunal.toLowerCase()}-${weekStart}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExportando(null);
    }
  }

  async function exportarWhatsApp() {
    setExportando("whatsapp");
    try {
      const res = await fetch(
        `/api/pautas/export?semana=${weekStart}&format=whatsapp`,
      );
      if (!res.ok) {
        toast({ variant: "destructive", title: "Erro ao gerar texto" });
        return;
      }
      const texto = await res.text();
      setWhatsappTexto(texto);
    } finally {
      setExportando(null);
    }
  }

  async function copiarWhatsApp() {
    if (!whatsappTexto) return;
    try {
      await navigator.clipboard.writeText(whatsappTexto);
      toast({ title: "Texto copiado para a area de transferencia" });
    } catch {
      toast({
        variant: "destructive",
        title: "Nao foi possivel copiar",
        description: "Selecione manualmente o texto e copie.",
      });
    }
  }

  const temFiltroAtivo =
    !!filters.orgaoJulgador ||
    !!filters.tipoSessao ||
    !!filters.relator ||
    !!filters.advogadoResp ||
    !!filters.q;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Judicial
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-brand-navy">
            Pautas Judiciais
          </h1>
          <p className="text-sm text-muted-foreground">
            Acompanhamento semanal das sessoes do Tribunal.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={exportarPdf}
            disabled={exportando === "pdf"}
          >
            <Download className="mr-2 h-4 w-4" />
            {exportando === "pdf" ? "Gerando..." : "Exportar semana"}
          </Button>
          <Button
            variant="outline"
            onClick={exportarWhatsApp}
            disabled={exportando === "whatsapp"}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            {exportando === "whatsapp" ? "Gerando..." : "Exportar WhatsApp"}
          </Button>
          {canEdit && (
            <Button
              onClick={() => setNovaSessaoOpen(true)}
              className="bg-brand-navy hover:bg-brand-navy/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Sessao
            </Button>
          )}
        </div>
      </header>

      <div className="flex gap-1 border-b">
        <button
          type="button"
          onClick={() => goToTribunal("TJPE")}
          className={cn(
            "border-b-2 px-4 py-2 text-sm font-semibold transition-colors",
            tribunal === "TJPE"
              ? "border-brand-navy text-brand-navy"
              : "border-transparent text-muted-foreground hover:text-brand-navy",
          )}
        >
          TJPE
        </button>
        <button
          type="button"
          onClick={() => goToTribunal("TRF5")}
          className={cn(
            "border-b-2 px-4 py-2 text-sm font-semibold transition-colors",
            tribunal === "TRF5"
              ? "border-brand-navy text-brand-navy"
              : "border-transparent text-muted-foreground hover:text-brand-navy",
          )}
        >
          TRF5
        </button>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToWeek(addDaysIso(weekStart, -7))}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Semana Anterior
          </Button>
          <div className="flex flex-1 flex-col items-center">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Semana selecionada
            </p>
            <p className="text-lg font-semibold text-brand-navy">
              {formatDateShort(weekStart)} a {formatDateShort(weekEnd)}
            </p>
            {weekStart !== todayStartOfWeek() && (
              <button
                type="button"
                onClick={() => goToWeek(todayIso())}
                className="text-[11px] text-muted-foreground underline-offset-2 hover:text-brand-navy hover:underline"
              >
                Ir para semana atual
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToWeek(addDaysIso(weekStart, 7))}
          >
            Semana Seguinte
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="flex min-w-[240px] flex-1 flex-col gap-1">
            <Label className="text-xs">Orgao julgador</Label>
            <Select
              value={filters.orgaoJulgador || "__all__"}
              onValueChange={(v) =>
                updateFilter("orgaoJulgador", v === "__all__" ? "" : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {orgaosJulgadores.map((o) => (
                  <SelectItem key={o.label} value={o.label}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-[160px] flex-col gap-1">
            <Label className="text-xs">Tipo de sessao</Label>
            <Select
              value={filters.tipoSessao || "__all__"}
              onValueChange={(v) =>
                updateFilter("tipoSessao", v === "__all__" ? "" : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {TIPOS_SESSAO.map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-[180px] flex-1 flex-col gap-1">
            <Label className="text-xs">Relator</Label>
            <Input
              value={relatorDraft}
              onChange={(e) => setRelatorDraft(e.target.value)}
              onBlur={applyTextFilters}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyTextFilters();
                }
              }}
              placeholder="Ex.: Fernando Cerqueira"
            />
          </div>
          <div className="flex min-w-[180px] flex-1 flex-col gap-1">
            <Label className="text-xs">Advogado responsavel</Label>
            <Input
              value={advDraft}
              onChange={(e) => setAdvDraft(e.target.value)}
              onBlur={applyTextFilters}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyTextFilters();
                }
              }}
              placeholder="Ex.: Gabriel Moura"
            />
          </div>
          <div className="flex min-w-[200px] flex-1 flex-col gap-1">
            <Label className="text-xs">Busca (numero/partes)</Label>
            <Input
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              onBlur={applyTextFilters}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyTextFilters();
                }
              }}
              placeholder="Ex.: 0001542 ou Municipio"
            />
          </div>
          {temFiltroAtivo && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpar filtros
            </Button>
          )}
        </CardContent>
      </Card>

      {sessoes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <CalendarRange className="h-10 w-10 text-slate-400" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-slate-700">
                Nenhuma sessao registrada nesta semana
              </p>
              <p className="text-xs text-muted-foreground">
                {temFiltroAtivo
                  ? "Ajuste os filtros ou cadastre uma nova sessao."
                  : "Lance a primeira sessao da semana para comecar o acompanhamento."}
              </p>
            </div>
            {canEdit && (
              <Button
                onClick={() => setNovaSessaoOpen(true)}
                className="bg-brand-navy hover:bg-brand-navy/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nova Sessao
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {sessoes.map((sessao) => (
            <SessaoCard
              key={sessao.id}
              tribunal={tribunal}
              composicao={composicao}
              orgaosJulgadores={orgaosJulgadores}
              sessao={sessao}
              canEdit={canEdit}
              duplicando={duplicandoId === sessao.id}
              onEditar={() => setEditarSessao(sessao)}
              onExcluir={() => setExcluirSessao(sessao)}
              onDuplicar={() => duplicarSessao(sessao.id)}
              onNovoItem={() =>
                setItemDialog({ mode: "create", sessaoId: sessao.id })
              }
              onEditarItem={(it) =>
                setItemDialog({ mode: "edit", sessaoId: sessao.id, item: it })
              }
              onExcluirItem={(it) =>
                setExcluirItem({ id: it.id, numero: it.numeroProcesso })
              }
            />
          ))}
        </div>
      )}

      <NovaSessaoDialog
        tribunal={tribunal}
        orgaosJulgadores={orgaosJulgadores}
        open={novaSessaoOpen}
        onOpenChange={setNovaSessaoOpen}
        defaultDate={todayIso()}
      />

      <EditarSessaoDialog
        tribunal={tribunal}
        orgaosJulgadores={orgaosJulgadores}
        sessao={editarSessao}
        onOpenChange={(v) => !v && setEditarSessao(null)}
      />

      <Dialog
        open={!!excluirSessao}
        onOpenChange={(v) => !v && setExcluirSessao(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir sessao?</DialogTitle>
            <DialogDescription>
              {excluirSessao
                ? `A sessao de ${excluirSessao.orgaoJulgador} em ${formatDateShort(excluirSessao.data)} sera removida com os ${excluirSessao.itens.length} itens.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setExcluirSessao(null)}
              disabled={sessaoPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={excluirSessaoConfirm}
              disabled={sessaoPending}
            >
              {sessaoPending ? "Excluindo..." : "Confirmar exclusao"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!excluirItem}
        onOpenChange={(v) => !v && setExcluirItem(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir item da pauta?</DialogTitle>
            <DialogDescription>
              {excluirItem
                ? `O item do processo ${excluirItem.numero} sera removido.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setExcluirItem(null)}
              disabled={itemPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={excluirItemConfirm}
              disabled={itemPending}
            >
              {itemPending ? "Excluindo..." : "Confirmar exclusao"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {itemDialog && (
        <ItemPautaJudicialDialog
          open={true}
          onOpenChange={(v) => !v && setItemDialog(null)}
          mode={itemDialog.mode}
          sessaoId={itemDialog.sessaoId}
          item={itemDialog.item}
          advogadosCadastrados={advogadosCadastrados}
          desembargadores={desembargadores}
          processosJudiciais={processosJudiciais}
          canEdit={canEdit}
          tribunal={tribunal}
          tiposRecurso={tiposRecurso}
        />
      )}

      <Dialog
        open={whatsappTexto !== null}
        onOpenChange={(v) => !v && setWhatsappTexto(null)}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Exportar para WhatsApp</DialogTitle>
            <DialogDescription>
              Texto formatado pronto para colar no WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            readOnly
            value={whatsappTexto ?? ""}
            rows={18}
            className="font-mono text-xs"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setWhatsappTexto(null)}>
              Fechar
            </Button>
            <Button
              onClick={copiarWhatsApp}
              className="bg-brand-navy hover:bg-brand-navy/90"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copiar texto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function todayStartOfWeek(): string {
  const d = new Date();
  const dUTC = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  const day = dUTC.getUTCDay();
  const diff = (day + 6) % 7;
  dUTC.setUTCDate(dUTC.getUTCDate() - diff);
  const y = dUTC.getUTCFullYear();
  const m = String(dUTC.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(dUTC.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
}

function SessaoCard({
  tribunal,
  composicao,
  orgaosJulgadores,
  sessao,
  canEdit,
  duplicando,
  onEditar,
  onExcluir,
  onDuplicar,
  onNovoItem,
  onEditarItem,
  onExcluirItem,
}: {
  tribunal: TribunalKey;
  composicao: ComposicaoRecord;
  orgaosJulgadores: OrgaoJulgadorOption[];
  sessao: SessaoRow;
  canEdit: boolean;
  duplicando: boolean;
  onEditar: () => void;
  onExcluir: () => void;
  onDuplicar: () => void;
  onNovoItem: () => void;
  onEditarItem: (item: ItemPautaJudicialInitial) => void;
  onExcluirItem: (item: ItemPautaJudicialInitial) => void;
}) {
  const [composicaoAberta, setComposicaoAberta] = React.useState(false);
  const categoria = categoriaOrgao(sessao.orgaoJulgador, tribunal);
  const estilo = CATEGORIA_STYLE[categoria];
  const orgaoCfg = orgaosJulgadores.find((o) => o.label === sessao.orgaoJulgador);
  const tipoBadge = TIPO_SESSAO_BADGE[sessao.tipoSessao] ?? TIPO_SESSAO_BADGE.presencial;
  const composicaoMembros = composicao[sessao.orgaoJulgador] ?? [];

  return (
    <Card className={cn("overflow-hidden border-l-4", estilo.border)}>
      <CardHeader className={cn("flex flex-col gap-3 py-4", estilo.bg)}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                estilo.badge,
              )}
            >
              {sessao.orgaoJulgador}
            </span>
            <div>
              <p className="text-sm font-semibold text-brand-navy">
                {formatDateFullUTC(sessao.data)}
                {orgaoCfg?.horario ? ` — ${orgaoCfg.horario}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {sessao.itens.length} item
                {sessao.itens.length === 1 ? "" : "s"} na pauta
              </p>
            </div>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                tipoBadge.className,
              )}
            >
              {tipoBadge.label}
            </span>
          </div>
          {canEdit && (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onDuplicar}
                disabled={duplicando}
                title="Duplicar sessao para a semana seguinte"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onEditar}
                title="Editar sessao"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-700 hover:bg-red-50"
                onClick={onExcluir}
                title="Excluir sessao"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
        {sessao.observacoesGerais && (
          <p className="text-xs italic text-slate-700">
            {sessao.observacoesGerais}
          </p>
        )}
        {composicaoMembros.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setComposicaoAberta((v) => !v)}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-navy hover:underline"
            >
              {composicaoAberta ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
              {composicaoAberta ? "Ocultar composicao" : "Ver composicao"}
            </button>
            {composicaoAberta && (
              <ul className="mt-2 grid grid-cols-1 gap-1 text-xs md:grid-cols-2">
                {composicaoMembros.map((m, idx) => (
                  <li
                    key={`${m.nome}-${idx}`}
                    className="flex items-start gap-2 rounded-md border border-white bg-white/60 px-2 py-1"
                  >
                    <span
                      className={cn(
                        "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase",
                        m.cargo === "Presidente"
                          ? "bg-brand-navy text-white"
                          : m.cargo === "Cargo Vago"
                            ? "bg-slate-200 text-slate-600"
                            : "bg-slate-100 text-slate-700",
                      )}
                    >
                      {m.cargo}
                    </span>
                    <span
                      className={cn(
                        "text-slate-700",
                        m.cargo === "Cargo Vago" && "italic text-muted-foreground",
                      )}
                    >
                      {m.nome}
                      {m.observacao && (
                        <span className="block text-[10px] italic text-muted-foreground">
                          {m.observacao}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {sessao.itens.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <p>Nenhum item cadastrado nesta sessao.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="w-8 px-3 py-2">#</th>
                  <th className="px-3 py-2">Processo</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Relator</th>
                  <th className="px-3 py-2">Adv.</th>
                  <th className="px-3 py-2">Situacao</th>
                  <th className="px-3 py-2">Prognostico</th>
                  <th className="px-3 py-2">Flags</th>
                  <th className="w-16 px-3 py-2 text-right">
                    {canEdit ? "Acoes" : ""}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sessao.itens.map((item, idx) => (
                  <tr
                    key={item.id}
                    onClick={canEdit ? () => onEditarItem(item) : undefined}
                    className={cn(
                      "border-b align-top transition-colors",
                      canEdit && "cursor-pointer hover:bg-slate-50",
                      item.retiradoDePauta && "bg-slate-100/60",
                    )}
                  >
                    <td className="px-3 py-3 text-xs font-medium text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-3">
                      <p
                        className={cn(
                          "font-mono text-xs font-medium text-brand-navy",
                          item.retiradoDePauta &&
                            "text-muted-foreground line-through",
                        )}
                      >
                        {item.numeroProcesso}
                      </p>
                      {item.tituloProcesso && (
                        <p
                          className={cn(
                            "text-[11px] text-slate-700",
                            item.retiradoDePauta && "line-through",
                          )}
                        >
                          {item.tituloProcesso}
                        </p>
                      )}
                      {item.partes && (
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {item.partes}
                        </p>
                      )}
                      {item.processo && (
                        <Link
                          href={`/app/processos/${item.processo.id}`}
                          className="text-[10px] text-muted-foreground hover:text-brand-navy hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          abrir processo
                        </Link>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-700">
                      {item.tipoRecurso ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-700">
                      {item.relator}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-700">
                      {item.advogadoResp}
                    </td>
                    <td className="max-w-[200px] px-3 py-3 text-xs text-slate-700">
                      {item.situacao ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="max-w-[180px] px-3 py-3 text-xs text-slate-700">
                      {item.prognostico ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1">
                        {item.sustentacaoOral && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800"
                            title={
                              item.advogadoSustentacao ?? "Sustentacao oral"
                            }
                          >
                            <Mic className="h-2.5 w-2.5" />
                            Sustentacao
                            {item.advogadoSustentacao
                              ? ` (${item.advogadoSustentacao.split(" ")[0]})`
                              : ""}
                          </span>
                        )}
                        {item.sustentacaoOral && !item.retiradoDePauta && (
                          <SustentacaoOralBadge
                            sessaoIso={sessao.data}
                            horario={orgaoCfg?.horario ?? null}
                          />
                        )}
                        {item.sessaoVirtual && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800"
                            title="Sessao virtual"
                          >
                            <MonitorCheck className="h-2.5 w-2.5" />
                            Virtual
                          </span>
                        )}
                        {item.pedidoRetPresencial && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-800"
                            title="Pedido de retirada para presencial"
                          >
                            Ret. presencial
                          </span>
                        )}
                        {item.retiradoDePauta && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-800"
                            title="Retirado de pauta"
                          >
                            <X className="h-2.5 w-2.5" />
                            Retirado
                          </span>
                        )}
                        {item.pedidoVistas && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-800"
                            title={
                              item.desPedidoVistas
                                ? `Pedido de vistas por ${item.desPedidoVistas}`
                                : "Pedido de vistas"
                            }
                          >
                            <Eye className="h-2.5 w-2.5" />
                            Vistas
                            {item.desPedidoVistas
                              ? ` — ${item.desPedidoVistas.split(" ")[0]}`
                              : ""}
                          </span>
                        )}
                        {tribunal === "TRF5" && item.parecerMpf && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-800"
                            title="Parecer do MPF"
                          >
                            Parecer MPF
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {canEdit ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:bg-red-50 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            onExcluirItem(item);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {canEdit && (
          <div className="flex justify-end border-t bg-slate-50 px-3 py-2">
            <Button type="button" variant="outline" size="sm" onClick={onNovoItem}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Adicionar Item
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NovaSessaoDialog({
  tribunal,
  orgaosJulgadores,
  open,
  onOpenChange,
  defaultDate,
}: {
  tribunal: TribunalKey;
  orgaosJulgadores: OrgaoJulgadorOption[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDate: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = React.useState(defaultDate);
  const [orgaoJulgador, setOrgaoJulgador] = React.useState("");
  const [tipoSessao, setTipoSessao] = React.useState<string>("presencial");
  const [observacoesGerais, setObservacoesGerais] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setData(defaultDate);
      setOrgaoJulgador("");
      setTipoSessao("presencial");
      setObservacoesGerais("");
    }
  }, [open, defaultDate]);

  const horarioPadrao = orgaoJulgador
    ? (orgaosJulgadores.find((o) => o.label === orgaoJulgador)?.horario ?? null)
    : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!data || !orgaoJulgador) {
      toast({
        variant: "destructive",
        title: "Preencha data e orgao julgador",
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/pautas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data,
          tribunal,
          orgaoJulgador,
          tipoSessao,
          observacoesGerais: observacoesGerais.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro ao criar sessao",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toast({ title: "Sessao criada" });
      onOpenChange(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nova sessao</DialogTitle>
          <DialogDescription>
            Cadastre uma sessao para lancar os itens da pauta.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[140px_120px_1fr]">
            <div className="space-y-1.5">
              <Label>
                Data <span className="text-red-600">*</span>
              </Label>
              <Input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tribunal</Label>
              <Input value={tribunal} readOnly disabled />
            </div>
            <div className="space-y-1.5">
              <Label>
                Orgao julgador <span className="text-red-600">*</span>
              </Label>
              <Select value={orgaoJulgador} onValueChange={setOrgaoJulgador}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {orgaosJulgadores.map((o) => (
                    <SelectItem key={o.label} value={o.label}>
                      {o.label}
                      {o.horario ? ` (${o.horario})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {horarioPadrao && (
                <p className="text-[11px] text-muted-foreground">
                  Horario padrao: {horarioPadrao}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de sessao</Label>
            <Select value={tipoSessao} onValueChange={setTipoSessao}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_SESSAO.map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Observacoes gerais (opcional)</Label>
            <Textarea
              rows={2}
              value={observacoesGerais}
              onChange={(e) => setObservacoesGerais(e.target.value)}
              placeholder="Ex.: Sessao ordinaria terca-feira 14h."
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-brand-navy hover:bg-brand-navy/90"
            >
              {submitting ? "Salvando..." : "Criar Sessao"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditarSessaoDialog({
  orgaosJulgadores,
  sessao,
  onOpenChange,
}: {
  tribunal: TribunalKey;
  orgaosJulgadores: OrgaoJulgadorOption[];
  sessao: SessaoRow | null;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = React.useState("");
  const [orgaoJulgador, setOrgaoJulgador] = React.useState("");
  const [tipoSessao, setTipoSessao] = React.useState("presencial");
  const [observacoesGerais, setObservacoesGerais] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (sessao) {
      setData(sessao.data.slice(0, 10));
      setOrgaoJulgador(sessao.orgaoJulgador);
      setTipoSessao(sessao.tipoSessao);
      setObservacoesGerais(sessao.observacoesGerais ?? "");
    }
  }, [sessao]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sessao || !data || !orgaoJulgador) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/pautas/${sessao.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data,
          orgaoJulgador,
          tipoSessao,
          observacoesGerais: observacoesGerais.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro ao atualizar sessao",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toast({ title: "Sessao atualizada" });
      onOpenChange(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={!!sessao} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar sessao</DialogTitle>
          <DialogDescription>
            Atualize data, orgao, tipo de sessao ou observacoes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[140px_1fr]">
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Orgao julgador</Label>
              <Select value={orgaoJulgador} onValueChange={setOrgaoJulgador}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {orgaosJulgadores.map((o) => (
                    <SelectItem key={o.label} value={o.label}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de sessao</Label>
            <Select value={tipoSessao} onValueChange={setTipoSessao}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_SESSAO.map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Observacoes gerais</Label>
            <Textarea
              rows={2}
              value={observacoesGerais}
              onChange={(e) => setObservacoesGerais(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-brand-navy hover:bg-brand-navy/90"
            >
              {submitting ? "Salvando..." : "Salvar alteracoes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
