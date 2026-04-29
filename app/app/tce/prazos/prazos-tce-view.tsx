"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CamaraTce, TipoProcessoTce } from "@prisma/client";
import { ListChecks, Plus, Trash2 } from "lucide-react";

import { BancaBadgeList } from "@/components/bancas/banca-badge";
import { BancaFilter } from "@/components/bancas/banca-filter";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useToast } from "@/hooks/use-toast";
import {
  diasUteisEntre,
  isDataNoRecesso,
  periodoIncluiRecesso,
} from "@/lib/dias-uteis";
import { TCE_CAMARA_LABELS, TCE_TIPO_LABELS } from "@/lib/tce-config";
import { cn } from "@/lib/utils";
import {
  EditPrazosTceDialog,
} from "@/components/tce/edit-prazos-tce-dialog";
import {
  PrazoTceForm,
  type AdvogadoOption,
  type PrazoTceInitial,
  type ProcessoTceOption,
} from "@/components/tce/prazo-tce-form";

export type PrazoTceRow = {
  id: string;
  tipo: string;
  dataIntimacao: string;
  dataVencimento: string;
  diasUteis: number;
  prorrogavel: boolean;
  prorrogacaoPedida: boolean;
  dataProrrogacao: string | null;
  cumprido: boolean;
  observacoes: string | null;
  advogadoResp: { id: string; nome: string } | null;
  dispensado: boolean;
  dispensadoPor: string | null;
  dispensadoEm: string | null;
  dispensadoMotivo: string | null;
  processo: {
    id: string;
    numero: string;
    tipo: TipoProcessoTce;
    camara: CamaraTce;
    bancasSlug: string[];
    municipio: { id: string; nome: string; uf: string } | null;
    interessados: { nome: string }[];
  };
  // Quando o ProcessoTce do prazo eh um recurso, mostra badge do tipo de
  // recurso e link para o processo de origem.
  recurso?: {
    tipoRecursoCode: string; // RO, ED, AG, AGR, PR, PSC
    origem: { id: string; numero: string };
  } | null;
};

type Filters = {
  advogadoRespId: string;
  tipo: string;
  municipioId: string;
  status: string;
  camara: string;
  numero: string;
};

type Props = {
  prazos: PrazoTceRow[];
  processos: ProcessoTceOption[];
  advogados: AdvogadoOption[];
  municipios: { id: string; nome: string; uf: string }[];
  tipos: string[];
  initialFilters: Filters;
};

function formatDateDay(d: string | Date): { dia: string; mes: string } {
  const date = d instanceof Date ? d : new Date(d);
  const dia = new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(date);
  const mes = new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(date)
    .replace(".", "");
  return { dia, mes };
}

function formatDateFull(d: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(d instanceof Date ? d : new Date(d));
}

function urgenciaPorDiasUteis(dias: number): "urgente" | "proximo" | "normal" {
  if (dias <= 3) return "urgente";
  if (dias <= 7) return "proximo";
  return "normal";
}

function countdownLabel(dias: number, cumprido: boolean): string {
  if (cumprido) return "cumprido";
  if (dias < 0) return `vencido ${-dias}d uteis`;
  if (dias === 0) return "vence hoje";
  if (dias === 1) return "1 dia util";
  return `${dias} dias uteis`;
}

export function PrazosTceView({
  prazos,
  processos,
  advogados,
  municipios,
  tipos,
  initialFilters,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [filters, setFilters] = React.useState(initialFilters);
  const [numeroDraft, setNumeroDraft] = React.useState(initialFilters.numero);
  const [toggling, setToggling] = React.useState<Record<string, boolean>>({});
  const [prorrogando, setProrrogando] = React.useState<Record<string, boolean>>({});
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editAllOpen, setEditAllOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<PrazoTceRow | null>(null);
  const [deletePending, setDeletePending] = React.useState(false);
  const [prorrogarConfirm, setProrrogarConfirm] =
    React.useState<PrazoTceRow | null>(null);

  async function handleDelete() {
    if (!deleting) return;
    setDeletePending(true);
    try {
      const res = await fetch(`/api/tce/prazos/${deleting.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro ao excluir prazo",
        });
        return;
      }
      toast({ title: "Prazo excluido" });
      setDeleting(null);
      router.refresh();
    } finally {
      setDeletePending(false);
    }
  }

  function applyFilters(next: Filters) {
    setFilters(next);
    // Preserva params extras (ex.: banca) ao reescrever a query string
    const params = new URLSearchParams(searchParams.toString());
    const setOrDel = (key: string, value: string) => {
      if (value) params.set(key, value);
      else params.delete(key);
    };
    setOrDel("advogadoRespId", next.advogadoRespId);
    setOrDel("tipo", next.tipo);
    setOrDel("municipioId", next.municipioId);
    setOrDel("status", next.status);
    setOrDel("camara", next.camara);
    setOrDel("numero", next.numero);
    const qs = params.toString();
    router.push(qs ? `/app/tce/prazos?${qs}` : "/app/tce/prazos");
  }

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    applyFilters({ ...filters, [key]: value });
  }

  function applyNumeroFilter() {
    const next = { ...filters, numero: numeroDraft.trim() };
    if (next.numero === filters.numero) return;
    applyFilters(next);
  }

  function clearFilters() {
    setNumeroDraft("");
    applyFilters({
      advogadoRespId: "",
      tipo: "",
      municipioId: "",
      status: "",
      camara: "",
      numero: "",
    });
  }

  async function toggleCumprido(p: PrazoTceRow) {
    setToggling((t) => ({ ...t, [p.id]: true }));
    try {
      const res = await fetch(`/api/tce/prazos/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cumprido: !p.cumprido }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast({
          variant: "destructive",
          title: "Erro ao atualizar prazo",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toast({
        title: !p.cumprido ? "Prazo marcado como cumprido" : "Prazo reaberto",
      });
      router.refresh();
    } finally {
      setToggling((t) => ({ ...t, [p.id]: false }));
    }
  }

  async function confirmarProrrogacao() {
    if (!prorrogarConfirm) return;
    const p = prorrogarConfirm;
    setProrrogando((s) => ({ ...s, [p.id]: true }));
    try {
      const res = await fetch(`/api/tce/prazos/${p.id}/prorrogacao`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro ao pedir prorrogacao",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toast({ title: "Prorrogacao pedida — +15 dias uteis adicionados" });
      setProrrogarConfirm(null);
      router.refresh();
    } finally {
      setProrrogando((s) => ({ ...s, [p.id]: false }));
    }
  }

  const prazosParaEdicao: PrazoTceInitial[] = React.useMemo(
    () =>
      prazos.map((p) => ({
        id: p.id,
        tipo: p.tipo,
        dataIntimacao: p.dataIntimacao,
        dataVencimento: p.dataVencimento,
        diasUteis: p.diasUteis,
        prorrogavel: p.prorrogavel,
        prorrogacaoPedida: p.prorrogacaoPedida,
        dataProrrogacao: p.dataProrrogacao,
        cumprido: p.cumprido,
        observacoes: p.observacoes,
        advogadoResp: p.advogadoResp,
        processo: { id: p.processo.id, numero: p.processo.numero },
      })),
    [prazos],
  );

  const { diasUrgentes, diasProximos } = React.useMemo(() => {
    const u: Date[] = [];
    const p: Date[] = [];
    for (const prazo of prazos) {
      if (prazo.cumprido) continue;
      const venc = new Date(prazo.dataVencimento);
      const dias = diasUteisEntre(new Date(), venc);
      if (dias < 0) continue;
      const urg = urgenciaPorDiasUteis(dias);
      if (urg === "urgente") u.push(venc);
      else if (urg === "proximo") p.push(venc);
    }
    return { diasUrgentes: u, diasProximos: p };
  }, [prazos]);

  const emRecesso = isDataNoRecesso(new Date());

  return (
    <div className="flex flex-col gap-6">
      {emRecesso && (
        <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="font-bold">ATENCAO:</span>
          <span>
            Periodo de Recesso Forense (20/12 a 20/01). Os prazos estao
            suspensos.
          </span>
        </div>
      )}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Tribunal de Contas
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-brand-navy">
            Prazos TCE
          </h1>
          <p className="text-sm text-muted-foreground">
            Contagem em dias uteis considerando feriados nacionais e recesso
            forense (20/12 a 20/01).
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setEditAllOpen(true)}
            disabled={prazos.length === 0}
          >
            <ListChecks className="mr-2 h-4 w-4" />
            Editar Prazos
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-brand-navy hover:bg-brand-navy/90">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Prazo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Novo prazo TCE</DialogTitle>
                <DialogDescription>
                  Vincule o prazo a um processo TCE existente.
                </DialogDescription>
              </DialogHeader>
              <PrazoTceForm
                mode="create"
                processos={processos}
                advogados={advogados}
                onSuccess={() => {
                  setCreateOpen(false);
                  router.refresh();
                }}
                onCancel={() => setCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <EditPrazosTceDialog
        open={editAllOpen}
        onOpenChange={setEditAllOpen}
        prazos={prazosParaEdicao}
        advogados={advogados}
      />

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir prazo?</DialogTitle>
            <DialogDescription>
              Esta acao nao pode ser desfeita.
              {deleting ? ` Prazo: ${deleting.tipo}.` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleting(null)}
              disabled={deletePending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deletePending}
            >
              {deletePending ? "Excluindo..." : "Confirmar exclusao"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!prorrogarConfirm}
        onOpenChange={(o) => !o && setProrrogarConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pedir prorrogacao?</DialogTitle>
            <DialogDescription>
              {prorrogarConfirm
                ? `Serao adicionados 15 dias uteis ao vencimento do prazo "${prorrogarConfirm.tipo}". Esta acao so pode ser realizada uma vez.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setProrrogarConfirm(null)}
              disabled={
                prorrogarConfirm ? !!prorrogando[prorrogarConfirm.id] : false
              }
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarProrrogacao}
              disabled={
                prorrogarConfirm ? !!prorrogando[prorrogarConfirm.id] : false
              }
              className="bg-brand-navy hover:bg-brand-navy/90"
            >
              {prorrogarConfirm && prorrogando[prorrogarConfirm.id]
                ? "Salvando..."
                : "Confirmar prorrogacao"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="flex min-w-[220px] flex-1 flex-col gap-1">
            <Label className="text-xs">Numero do processo</Label>
            <Input
              value={numeroDraft}
              onChange={(e) => setNumeroDraft(e.target.value)}
              onBlur={applyNumeroFilter}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyNumeroFilter();
                }
              }}
              placeholder="Buscar por numero do processo"
            />
          </div>
          <div className="flex min-w-[180px] flex-col gap-1">
            <Label className="text-xs">Advogado responsavel</Label>
            <Select
              value={filters.advogadoRespId || "__all__"}
              onValueChange={(v) =>
                updateFilter("advogadoRespId", v === "__all__" ? "" : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {advogados.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-[180px] flex-col gap-1">
            <Label className="text-xs">Tipo</Label>
            <Select
              value={filters.tipo || "__all__"}
              onValueChange={(v) =>
                updateFilter("tipo", v === "__all__" ? "" : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {tipos.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-[180px] flex-col gap-1">
            <Label className="text-xs">Municipio</Label>
            <Select
              value={filters.municipioId || "__all__"}
              onValueChange={(v) =>
                updateFilter("municipioId", v === "__all__" ? "" : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {municipios.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome}/{m.uf}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-[140px] flex-col gap-1">
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
          <div className="flex min-w-[160px] flex-col gap-1">
            <Label className="text-xs">Status</Label>
            <Select
              value={filters.status || "__all__"}
              onValueChange={(v) =>
                updateFilter("status", v === "__all__" ? "" : v)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                <SelectItem value="aberto">Em aberto</SelectItem>
                <SelectItem value="cumprido">Cumpridos</SelectItem>
                <SelectItem value="vencido">Vencidos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Limpar filtros
          </Button>
          <div className="w-full">
            <BancaFilter />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          {prazos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Nenhum prazo TCE encontrado com os filtros atuais.
              </CardContent>
            </Card>
          ) : (
            prazos.map((p) => (
              <PrazoTceCard
                key={p.id}
                prazo={p}
                togglingCumprido={!!toggling[p.id]}
                prorrogando={!!prorrogando[p.id]}
                onToggleCumprido={() => toggleCumprido(p)}
                onPedirProrrogacao={() => setProrrogarConfirm(p)}
                onDelete={() => setDeleting(p)}
              />
            ))
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Calendario</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                modifiers={{
                  urgente: diasUrgentes,
                  proximo: diasProximos,
                }}
                modifiersClassNames={{
                  urgente: "day-urgente",
                  proximo: "day-proximo",
                }}
              />
              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-600" />
                  <span className="text-muted-foreground">
                    Vence em ate 3 dias uteis
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />
                  <span className="text-muted-foreground">
                    Vence em ate 7 dias uteis
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PrazoTceCard({
  prazo,
  togglingCumprido,
  prorrogando,
  onToggleCumprido,
  onPedirProrrogacao,
  onDelete,
}: {
  prazo: PrazoTceRow;
  togglingCumprido: boolean;
  prorrogando: boolean;
  onToggleCumprido: () => void;
  onPedirProrrogacao: () => void;
  onDelete: () => void;
}) {
  const venc = new Date(prazo.dataVencimento);
  const dias = diasUteisEntre(new Date(), venc);
  const urg = prazo.cumprido
    ? "normal"
    : dias < 0
      ? "urgente"
      : urgenciaPorDiasUteis(dias);
  const { dia, mes } = formatDateDay(venc);

  const borderClass = prazo.cumprido
    ? "border-l-emerald-400"
    : urg === "urgente"
      ? "border-l-red-600"
      : urg === "proximo"
        ? "border-l-yellow-500"
        : "border-l-slate-300";

  const countdownClass = prazo.cumprido
    ? "text-emerald-700"
    : urg === "urgente"
      ? "text-red-700"
      : urg === "proximo"
        ? "text-yellow-700"
        : "text-muted-foreground";

  const isCautelar = prazo.processo.tipo === TipoProcessoTce.MEDIDA_CAUTELAR;
  const podeProrrogar =
    !prazo.cumprido &&
    !isCautelar &&
    prazo.prorrogavel &&
    !prazo.prorrogacaoPedida;

  return (
    <div
      className={cn(
        "flex gap-4 rounded-lg border border-l-4 bg-white p-4 shadow-sm",
        borderClass,
        prazo.cumprido && "opacity-70",
      )}
    >
      <label className="flex cursor-pointer items-start pt-1">
        <Checkbox
          checked={prazo.cumprido}
          disabled={togglingCumprido}
          onChange={onToggleCumprido}
        />
      </label>

      <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-md bg-slate-50 py-2 text-brand-navy">
        <span className="text-2xl font-semibold leading-none">{dia}</span>
        <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {mes}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3
            className={cn(
              "text-sm font-semibold text-brand-navy",
              prazo.cumprido && "text-muted-foreground line-through",
            )}
          >
            {prazo.tipo}
          </h3>
          {prazo.advogadoResp ? (
            <span className="inline-flex items-center rounded-full bg-brand-navy/10 px-2 py-0.5 text-[11px] font-semibold text-brand-navy">
              {prazo.advogadoResp.nome}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
              sem responsavel
            </span>
          )}
          {(isCautelar || !prazo.prorrogavel) && (
            <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-orange-800">
              improrrogavel
            </span>
          )}
          {prazo.dispensado && (
            <span
              className="inline-flex items-center rounded-full bg-slate-300 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-800"
              title={prazo.dispensadoMotivo ?? undefined}
            >
              Dispensado
              {prazo.dispensadoPor ? ` por ${prazo.dispensadoPor}` : ""}
            </span>
          )}
          {prazo.prorrogacaoPedida && (
            <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-800">
              prorrogacao pedida
            </span>
          )}
          {periodoIncluiRecesso(prazo.dataIntimacao, prazo.dataVencimento) && (
            <span
              className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800"
              title="A contagem deste prazo passa pelo recesso forense (20/12 a 20/01) e foi suspensa nesse periodo."
            >
              Inclui recesso
            </span>
          )}
        </div>
        <p
          className={cn(
            "text-xs text-muted-foreground",
            prazo.cumprido && "line-through",
          )}
        >
          <Link
            href={`/app/tce/processos/${prazo.processo.id}`}
            className="font-mono font-bold text-brand-navy hover:underline"
          >
            {prazo.processo.numero}
          </Link>
          {prazo.recurso && (
            <span className="ml-1.5 inline-block rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-purple-800">
              {prazo.recurso.tipoRecursoCode}
            </span>
          )}
          {prazo.processo.municipio && (
            <>
              {" — "}
              <span className="font-medium text-slate-700">
                {prazo.processo.municipio.nome}/{prazo.processo.municipio.uf}
              </span>
            </>
          )}
          {" • "}
          <span>{TCE_TIPO_LABELS[prazo.processo.tipo]}</span>
        </p>
        <div className="mt-1">
          <BancaBadgeList slugs={prazo.processo.bancasSlug} max={3} />
        </div>
        {prazo.recurso && (
          <p className="text-[11px] italic text-muted-foreground">
            Recurso vinculado ao processo{" "}
            <Link
              href={`/app/tce/processos/${prazo.recurso.origem.id}`}
              className="font-mono not-italic hover:underline"
            >
              {prazo.recurso.origem.numero}
            </Link>
          </p>
        )}
        <p className="text-xs text-muted-foreground capitalize">
          {formatDateFull(venc)} • {prazo.diasUteis} dias uteis totais
        </p>
        {prazo.processo.interessados.length > 0 && (
          <p className="text-xs text-slate-600">
            <span className="font-medium">Interessados:</span>{" "}
            {prazo.processo.interessados.map((i) => i.nome).join(", ")}
          </p>
        )}
        {prazo.observacoes && (
          <p
            className={cn(
              "mt-1 text-xs text-slate-600",
              prazo.cumprido && "line-through",
            )}
          >
            {prazo.observacoes}
          </p>
        )}
      </div>

      <div className="flex flex-col items-end justify-between gap-2">
        <div className="flex items-center gap-1">
          {podeProrrogar && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={prorrogando}
              onClick={onPedirProrrogacao}
              title="Pedir prorrogacao de 15 dias uteis"
            >
              {prorrogando ? "..." : "Pedir prorrogacao"}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:bg-red-50 hover:text-red-700"
            onClick={onDelete}
            title="Excluir prazo"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex flex-col items-end">
          <span className={cn("text-sm font-semibold", countdownClass)}>
            {countdownLabel(dias, prazo.cumprido)}
          </span>
          {!prazo.cumprido && (
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              restantes
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
