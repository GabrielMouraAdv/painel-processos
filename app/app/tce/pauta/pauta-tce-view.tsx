"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CamaraTce } from "@prisma/client";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Eye,
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
import { TCE_CAMARA_LABELS } from "@/lib/tce-config";
import { cn } from "@/lib/utils";

import {
  ItemPautaDialog,
  type ItemPautaInitial,
  type ProcessoTceOption,
} from "./item-pauta-dialog";

export type SessaoRow = {
  id: string;
  data: string;
  camara: CamaraTce;
  observacoesGerais: string | null;
  itens: ItemPautaInitial[];
};

type Filters = {
  camara: string;
  relator: string;
  advogadoResp: string;
  q: string;
};

type Props = {
  sessoes: SessaoRow[];
  weekStart: string;
  weekEnd: string;
  initialFilters: Filters;
  advogadosCadastrados: string[];
  municipiosCadastrados: string[];
  relatoresPadrao: string[];
  processosTce: ProcessoTceOption[];
};

const CAMARA_COLORS: Record<CamaraTce, { bg: string; badge: string; border: string }> = {
  PRIMEIRA: {
    bg: "bg-blue-50",
    badge: "bg-[#1e40af] text-white",
    border: "border-l-[#1e40af]",
  },
  SEGUNDA: {
    bg: "bg-emerald-50",
    badge: "bg-[#047857] text-white",
    border: "border-l-[#047857]",
  },
  PLENO: {
    bg: "bg-purple-50",
    badge: "bg-[#6b21a8] text-white",
    border: "border-l-[#6b21a8]",
  },
};

function parseISO(d: string): Date {
  return new Date(`${d}T00:00:00Z`);
}

function formatDateShort(iso: string): string {
  const d = parseISO(iso.slice(0, 10));
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateFullUTC(iso: string): string {
  const d = parseISO(iso.slice(0, 10));
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

function addDaysIso(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + days);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayIso(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function PautaTceView({
  sessoes,
  weekStart,
  weekEnd,
  initialFilters,
  advogadosCadastrados,
  municipiosCadastrados,
  relatoresPadrao,
  processosTce,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [filters, setFilters] = React.useState(initialFilters);
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
    item?: ItemPautaInitial;
  } | null>(null);
  const [excluirItem, setExcluirItem] = React.useState<{
    id: string;
    numero: string;
  } | null>(null);
  const [itemPending, setItemPending] = React.useState(false);

  function pushWithFilters(next: Filters, week?: string) {
    const params = new URLSearchParams();
    if (week) params.set("semana", week);
    else params.set("semana", weekStart);
    if (next.camara) params.set("camara", next.camara);
    if (next.relator) params.set("relator", next.relator);
    if (next.advogadoResp) params.set("advogadoResp", next.advogadoResp);
    if (next.q) params.set("q", next.q);
    router.push(`/app/tce/pauta?${params.toString()}`);
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
    const next = { camara: "", relator: "", advogadoResp: "", q: "" };
    setFilters(next);
    pushWithFilters(next);
  }

  async function excluirSessaoConfirm() {
    if (!excluirSessao) return;
    setSessaoPending(true);
    try {
      const res = await fetch(`/api/tce/pauta/${excluirSessao.id}`, {
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
      const res = await fetch(`/api/tce/pauta/itens/${excluirItem.id}`, {
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

  const temFiltroAtivo =
    !!filters.camara ||
    !!filters.relator ||
    !!filters.advogadoResp ||
    !!filters.q;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Tribunal de Contas
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-brand-navy">
            Monitoramento de Pauta TCE
          </h1>
          <p className="text-sm text-muted-foreground">
            Acompanhamento semanal das sessoes das Camaras e Pleno.
          </p>
        </div>
        <Button
          onClick={() => setNovaSessaoOpen(true)}
          className="bg-brand-navy hover:bg-brand-navy/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Sessao de Pauta
        </Button>
      </header>

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
          <div className="flex min-w-[160px] flex-col gap-1">
            <Label className="text-xs">Camara</Label>
            <Select
              value={filters.camara || "__all__"}
              onValueChange={(v) =>
                updateFilter("camara", v === "__all__" ? "" : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {Object.values(CamaraTce).map((c) => (
                  <SelectItem key={c} value={c}>
                    {TCE_CAMARA_LABELS[c]}
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
              placeholder="Ex.: Eduardo Porto"
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
            <Label className="text-xs">Busca (numero/municipio)</Label>
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
              placeholder="Ex.: 26100233 ou Serra Dourada"
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
            <Button
              onClick={() => setNovaSessaoOpen(true)}
              className="bg-brand-navy hover:bg-brand-navy/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Sessao de Pauta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {sessoes.map((sessao) => (
            <SessaoCard
              key={sessao.id}
              sessao={sessao}
              onEditar={() => setEditarSessao(sessao)}
              onExcluir={() => setExcluirSessao(sessao)}
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
        open={novaSessaoOpen}
        onOpenChange={setNovaSessaoOpen}
        defaultDate={todayIso()}
      />

      <EditarSessaoDialog
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
                ? `A sessao de ${TCE_CAMARA_LABELS[excluirSessao.camara]} em ${formatDateShort(excluirSessao.data)} sera removida junto com todos os seus ${excluirSessao.itens.length} itens.`
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
                ? `O item do processo ${excluirItem.numero} sera removido da sessao.`
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
        <ItemPautaDialog
          open={true}
          onOpenChange={(v) => !v && setItemDialog(null)}
          mode={itemDialog.mode}
          sessaoId={itemDialog.sessaoId}
          item={itemDialog.item}
          advogadosCadastrados={advogadosCadastrados}
          municipiosCadastrados={municipiosCadastrados}
          relatoresPadrao={relatoresPadrao}
          processosTce={processosTce}
        />
      )}
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
  sessao,
  onEditar,
  onExcluir,
  onNovoItem,
  onEditarItem,
  onExcluirItem,
}: {
  sessao: SessaoRow;
  onEditar: () => void;
  onExcluir: () => void;
  onNovoItem: () => void;
  onEditarItem: (item: ItemPautaInitial) => void;
  onExcluirItem: (item: ItemPautaInitial) => void;
}) {
  const cores = CAMARA_COLORS[sessao.camara];
  return (
    <Card className={cn("overflow-hidden border-l-4", cores.border)}>
      <CardHeader className={cn("flex flex-col gap-3 py-4", cores.bg)}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                cores.badge,
              )}
            >
              {TCE_CAMARA_LABELS[sessao.camara]}
            </span>
            <div>
              <p className="text-sm font-semibold text-brand-navy">
                {formatDateFullUTC(sessao.data)}
              </p>
              <p className="text-xs text-muted-foreground">
                {sessao.itens.length} item{sessao.itens.length === 1 ? "" : "s"} na pauta
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
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
        </div>
        {sessao.observacoesGerais && (
          <p className="text-xs italic text-slate-700">
            {sessao.observacoesGerais}
          </p>
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
                  <th className="px-3 py-2">Municipio/Exerc.</th>
                  <th className="px-3 py-2">Relator</th>
                  <th className="px-3 py-2">Adv.</th>
                  <th className="px-3 py-2">Situacao</th>
                  <th className="px-3 py-2">Obs./Prognostico</th>
                  <th className="px-3 py-2">Providencia</th>
                  <th className="w-16 px-3 py-2">Flags</th>
                  <th className="w-20 px-3 py-2 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {sessao.itens.map((item, idx) => {
                  const isFlagged = item.retiradoDePauta || item.pedidoVistas;
                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        "cursor-pointer border-b align-top transition-colors hover:bg-slate-50",
                        isFlagged && "bg-amber-50/40",
                      )}
                      onClick={() => onEditarItem(item)}
                    >
                      <td className="px-3 py-3 text-xs font-medium text-muted-foreground">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-mono text-xs font-medium text-brand-navy">
                          {item.numeroProcesso}
                        </p>
                        {item.tituloProcesso && (
                          <p className="text-[11px] text-slate-700">
                            {item.tituloProcesso}
                          </p>
                        )}
                        {item.processoTce && (
                          <Link
                            href={`/app/tce/processos/${item.processoTce.id}`}
                            className="text-[10px] text-muted-foreground hover:text-brand-navy hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            abrir processo TCE
                          </Link>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <p className="font-medium text-slate-700">{item.municipio}</p>
                        {item.exercicio && (
                          <p className="text-[11px] text-muted-foreground">
                            exercicio {item.exercicio}
                          </p>
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
                      <td className="max-w-[200px] px-3 py-3 text-xs text-slate-700">
                        {item.prognostico ?? item.observacoes ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="max-w-[160px] px-3 py-3 text-xs text-slate-700">
                        {item.providencia ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1">
                          {item.retiradoDePauta && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-800"
                              title="Retirado de pauta"
                            >
                              <X className="h-2.5 w-2.5" />
                              retirado
                            </span>
                          )}
                          {item.pedidoVistas && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-800"
                              title={
                                item.conselheiroVistas
                                  ? `Pedido de vistas por ${item.conselheiroVistas}`
                                  : "Pedido de vistas"
                              }
                            >
                              <Eye className="h-2.5 w-2.5" />
                              vistas
                              {item.conselheiroVistas ? ` (${item.conselheiroVistas.split(" ")[0]})` : ""}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-end border-t bg-slate-50 px-3 py-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onNovoItem}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Adicionar Item
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function NovaSessaoDialog({
  open,
  onOpenChange,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDate: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = React.useState(defaultDate);
  const [camara, setCamara] = React.useState<CamaraTce | "">("");
  const [observacoesGerais, setObservacoesGerais] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setData(defaultDate);
      setCamara("");
      setObservacoesGerais("");
    }
  }, [open, defaultDate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!data || !camara) {
      toast({
        variant: "destructive",
        title: "Preencha data e camara",
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/tce/pauta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data,
          camara,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova sessao de pauta</DialogTitle>
          <DialogDescription>
            Cadastre uma nova sessao para iniciar o lancamento dos itens.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
              <Label>
                Camara <span className="text-red-600">*</span>
              </Label>
              <Select
                value={camara}
                onValueChange={(v) => setCamara(v as CamaraTce)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(CamaraTce).map((c) => (
                    <SelectItem key={c} value={c}>
                      {TCE_CAMARA_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Observacoes gerais (opcional)</Label>
            <Textarea
              rows={2}
              value={observacoesGerais}
              onChange={(e) => setObservacoesGerais(e.target.value)}
              placeholder="Ex.: Sessao extensa, prioridade para processos de prestacao de contas."
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
  sessao,
  onOpenChange,
}: {
  sessao: SessaoRow | null;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = React.useState("");
  const [camara, setCamara] = React.useState<CamaraTce | "">("");
  const [observacoesGerais, setObservacoesGerais] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (sessao) {
      setData(sessao.data.slice(0, 10));
      setCamara(sessao.camara);
      setObservacoesGerais(sessao.observacoesGerais ?? "");
    }
  }, [sessao]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sessao || !data || !camara) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tce/pauta/${sessao.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data,
          camara,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar sessao</DialogTitle>
          <DialogDescription>
            Atualize data, camara ou observacoes gerais.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Camara</Label>
              <Select
                value={camara}
                onValueChange={(v) => setCamara(v as CamaraTce)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(CamaraTce).map((c) => (
                    <SelectItem key={c} value={c}>
                      {TCE_CAMARA_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
