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
import { ChevronLeft, ChevronRight, ExternalLink, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { STATUS_PRAZO_ELEITORAL, statusPrazoInfo } from "@/lib/eleitoral-labels";
import { cn } from "@/lib/utils";

export type PrazoCalendario = {
  id: string;
  tarefa: string;
  /** YYYY-MM-DD (a data e sempre tratada em UTC puro). */
  data: string;
  hora: string | null;
  status: string;
  observacoes: string | null;
  responsavel: { id: string; nome: string } | null;
  processo: { id: string; numero: string; apelido: string | null };
};

export type ProcessoOption = {
  id: string;
  numero: string;
  apelido: string | null;
};

export type UsuarioOption = { id: string; nome: string };

type Props = {
  ano: number;
  mes: number; // 0-11
  prazos: PrazoCalendario[];
  processos: ProcessoOption[];
  usuarios: UsuarioOption[];
};

const MESES = [
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

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

const NENHUM = "__nenhum__";

function ymdUTC(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hojeYmd(): string {
  return ymdUTC(new Date());
}

function mesParam(ano: number, mes: number): string {
  return `${ano}-${String(mes + 1).padStart(2, "0")}`;
}

export function CalendarioEleitoralView({
  ano,
  mes,
  prazos,
  processos,
  usuarios,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();

  // Copia local para o "otimismo" do arrastar-soltar: a celula muda na hora
  // e so volta atras se a API recusar.
  const [itens, setItens] = React.useState<PrazoCalendario[]>(prazos);
  React.useEffect(() => setItens(prazos), [prazos]);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editando, setEditando] = React.useState<PrazoCalendario | null>(null);
  const [dataInicial, setDataInicial] = React.useState<string>(hojeYmd());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  async function handleDragEnd(e: DragEndEvent) {
    if (!e.over) return;
    const alvo = String(e.over.id);
    if (!alvo.startsWith("day-")) return;
    const novaData = alvo.slice(4);
    const prazo = itens.find((p) => p.id === String(e.active.id));
    if (!prazo || prazo.data === novaData) return;

    const antes = itens;
    setItens((prev) =>
      prev.map((p) => (p.id === prazo.id ? { ...p, data: novaData } : p)),
    );

    const res = await fetch(`/api/eleitoral/prazos/${prazo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: novaData }),
    });
    if (!res.ok) {
      setItens(antes);
      const json = await res.json().catch(() => ({}));
      toast({
        variant: "destructive",
        title: "Erro ao mover o prazo",
        description: json?.error ?? "Tente novamente",
      });
      return;
    }
    toast({
      title: "Prazo movido",
      description: `${prazo.tarefa} → ${novaData.split("-").reverse().join("/")}`,
    });
    router.refresh();
  }

  function abrirNovo(dia: string) {
    setEditando(null);
    setDataInicial(dia);
    setDialogOpen(true);
  }

  function abrirEdicao(prazo: PrazoCalendario) {
    setEditando(prazo);
    setDataInicial(prazo.data);
    setDialogOpen(true);
  }

  const inicioMes = new Date(Date.UTC(ano, mes, 1));
  const fimMes = new Date(Date.UTC(ano, mes + 1, 0));
  const primeiroDiaSemana = inicioMes.getUTCDay();
  const diasNoMes = fimMes.getUTCDate();

  const celulas: Array<Date | null> = [
    ...Array.from({ length: primeiroDiaSemana }, () => null),
    ...Array.from(
      { length: diasNoMes },
      (_, i) => new Date(Date.UTC(ano, mes, i + 1)),
    ),
  ];
  while (celulas.length % 7 !== 0) celulas.push(null);

  const porDia = new Map<string, PrazoCalendario[]>();
  for (const p of itens) {
    const lista = porDia.get(p.data) ?? [];
    lista.push(p);
    porDia.set(p.data, lista);
  }
  porDia.forEach((lista) => {
    lista.sort((a, b) => (a.hora ?? "99:99").localeCompare(b.hora ?? "99:99"));
  });

  const hoje = hojeYmd();
  const anterior = mes === 0 ? mesParam(ano - 1, 11) : mesParam(ano, mes - 1);
  const proximo = mes === 11 ? mesParam(ano + 1, 0) : mesParam(ano, mes + 1);

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Calendario de prazos</h1>
            <p className="text-sm text-muted-foreground">
              {itens.length} prazo(s) em {MESES[mes]} de {ano} · clique no dia
              para criar, arraste para remarcar.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/app/eleitoral/calendario?mes=${anterior}`}>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <span className="min-w-[150px] text-center text-sm font-semibold">
              {MESES[mes]} {ano}
            </span>
            <Button asChild variant="outline" size="sm">
              <Link href={`/app/eleitoral/calendario?mes=${proximo}`}>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button size="sm" onClick={() => abrirNovo(hoje)}>
              <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
              Novo prazo
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {STATUS_PRAZO_ELEITORAL.map((s) => (
            <span key={s.value} className="flex items-center gap-1.5">
              <span className={cn("h-3 w-3 rounded", s.legenda)} />
              {s.label}
            </span>
          ))}
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[860px] rounded-md border bg-white">
            <div className="grid grid-cols-7 border-b bg-muted/50">
              {DIAS_SEMANA.map((d) => (
                <div
                  key={d}
                  className="px-2 py-2 text-center text-xs font-semibold uppercase text-muted-foreground"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {celulas.map((dia, idx) => (
                <CelulaDia
                  key={idx}
                  dia={dia}
                  hoje={hoje}
                  prazos={dia ? (porDia.get(ymdUTC(dia)) ?? []) : []}
                  onNovo={abrirNovo}
                  onEditar={abrirEdicao}
                />
              ))}
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Dica: clique no numero do dia (ou no + ) para cadastrar um prazo
          naquela data; arraste um prazo de um dia para outro para remarcar.
        </p>
      </div>

      <PrazoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        prazo={editando}
        dataInicial={dataInicial}
        processos={processos}
        usuarios={usuarios}
      />
    </DndContext>
  );
}

function CelulaDia({
  dia,
  hoje,
  prazos,
  onNovo,
  onEditar,
}: {
  dia: Date | null;
  hoje: string;
  prazos: PrazoCalendario[];
  onNovo: (dia: string) => void;
  onEditar: (p: PrazoCalendario) => void;
}) {
  const iso = dia ? ymdUTC(dia) : "";
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${iso}`,
    disabled: !dia,
  });

  if (!dia) {
    return <div className="min-h-[120px] border-b border-r bg-muted/30" />;
  }

  const ehHoje = iso === hoje;

  return (
    <div
      ref={setNodeRef}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onNovo(iso);
      }}
      className={cn(
        "group/dia min-h-[120px] cursor-pointer select-none border-b border-r p-1.5",
        ehHoje && "bg-amber-50",
        isOver && "ring-2 ring-inset ring-brand-navy/40",
      )}
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNovo(iso);
          }}
          className={cn(
            "text-xs font-semibold",
            ehHoje ? "text-amber-800" : "text-slate-500",
          )}
        >
          {dia.getUTCDate()}
        </button>
        <div className="flex items-center gap-1">
          {ehHoje && (
            <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white">
              hoje
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNovo(iso);
            }}
            aria-label="Novo prazo neste dia"
            className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-400 opacity-60 ring-1 ring-slate-200 transition-opacity hover:bg-brand-navy hover:text-white hover:opacity-100 group-hover/dia:opacity-100 sm:opacity-0"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>
      <div className="mt-1 space-y-1">
        {prazos.map((p) => (
          <PrazoBadge key={p.id} prazo={p} onClick={() => onEditar(p)} />
        ))}
      </div>
    </div>
  );
}

function PrazoBadge({
  prazo,
  onClick,
}: {
  prazo: PrazoCalendario;
  onClick: () => void;
}) {
  const { setNodeRef, listeners, attributes, isDragging, transform } =
    useDraggable({ id: prazo.id });
  const info = statusPrazoInfo(prazo.status);

  const style: React.CSSProperties = {
    borderLeftColor: info.cor,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.55 : 1,
  };

  const tooltip = [
    `${prazo.tarefa} — ${info.label}`,
    `Processo: ${prazo.processo.numero}`,
    prazo.processo.apelido ? `Caso: ${prazo.processo.apelido}` : null,
    prazo.responsavel ? `Resp: ${prazo.responsavel.nome}` : "Sem responsavel",
    prazo.hora ? `As ${prazo.hora}` : null,
    prazo.observacoes,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      title={tooltip}
      onClick={(e) => {
        e.stopPropagation();
        if (!isDragging) onClick();
      }}
      className={cn(
        "cursor-pointer truncate rounded-sm border-l-4 px-1.5 py-0.5 text-[11px] font-medium shadow-sm",
        info.badge,
        prazo.status === "DISPENSADO" && "line-through",
      )}
    >
      {prazo.hora ? `${prazo.hora} ` : ""}
      {prazo.tarefa}
      <span className="opacity-70">
        {" · "}
        {prazo.processo.apelido ?? prazo.processo.numero}
      </span>
    </div>
  );
}

function PrazoDialog({
  open,
  onOpenChange,
  prazo,
  dataInicial,
  processos,
  usuarios,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prazo: PrazoCalendario | null;
  dataInicial: string;
  processos: ProcessoOption[];
  usuarios: UsuarioOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const modo = prazo ? "edit" : "create";
  const [saving, setSaving] = React.useState(false);
  const [processoId, setProcessoId] = React.useState("");
  const [tarefa, setTarefa] = React.useState("");
  const [data, setData] = React.useState(dataInicial);
  const [hora, setHora] = React.useState("");
  const [status, setStatus] = React.useState("PENDENTE");
  const [responsavelId, setResponsavelId] = React.useState(NENHUM);
  const [observacoes, setObservacoes] = React.useState("");

  // Recarrega o formulario sempre que o dialog abre (novo ou edicao).
  React.useEffect(() => {
    if (!open) return;
    setProcessoId(prazo?.processo.id ?? processos[0]?.id ?? "");
    setTarefa(prazo?.tarefa ?? "");
    setData(prazo?.data ?? dataInicial);
    setHora(prazo?.hora ?? "");
    setStatus(prazo?.status ?? "PENDENTE");
    setResponsavelId(prazo?.responsavel?.id ?? NENHUM);
    setObservacoes(prazo?.observacoes ?? "");
  }, [open, prazo, dataInicial, processos]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...(modo === "create" ? { processoId } : {}),
        tarefa,
        data,
        hora: hora || null,
        status,
        responsavelId: responsavelId === NENHUM ? null : responsavelId,
        observacoes: observacoes || null,
      };
      const res = await fetch(
        modo === "create"
          ? "/api/eleitoral/prazos"
          : `/api/eleitoral/prazos/${prazo!.id}`,
        {
          method: modo === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Falha ao salvar o prazo");
      toast({ title: modo === "create" ? "Prazo criado" : "Prazo atualizado" });
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function excluir() {
    if (!prazo) return;
    if (!window.confirm(`Excluir o prazo "${prazo.tarefa}"?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/eleitoral/prazos/${prazo.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Falha ao excluir o prazo");
      toast({ title: "Prazo excluido" });
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {modo === "create" ? "Novo prazo" : "Editar prazo"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          {modo === "create" ? (
            <div className="space-y-1.5">
              <Label>Processo</Label>
              <Select value={processoId} onValueChange={setProcessoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o processo" />
                </SelectTrigger>
                <SelectContent>
                  {processos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.apelido ? `${p.apelido} — ` : ""}
                      {p.numero}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="rounded-md border bg-muted/40 p-2 text-xs">
              <span className="text-muted-foreground">Processo: </span>
              <Link
                href={`/app/eleitoral/processos/${prazo!.processo.id}`}
                className="font-medium text-brand-navy hover:underline"
              >
                {prazo!.processo.apelido
                  ? `${prazo!.processo.apelido} — `
                  : ""}
                {prazo!.processo.numero}
                <ExternalLink className="ml-1 inline h-3 w-3" />
              </Link>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="tarefaCal">Tarefa</Label>
            <Input
              id="tarefaCal"
              value={tarefa}
              onChange={(e) => setTarefa(e.target.value)}
              placeholder="Ex.: Defesa"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="dataCal">Data</Label>
              <Input
                id="dataCal"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="horaCal">Hora</Label>
              <Input
                id="horaCal"
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_PRAZO_ELEITORAL.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Responsavel</Label>
            <Select value={responsavelId} onValueChange={setResponsavelId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NENHUM}>— Sem responsavel —</SelectItem>
                {usuarios.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="obsCal">Observacoes</Label>
            <Textarea
              id="obsCal"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {modo === "edit" ? (
              <Button
                type="button"
                variant="outline"
                onClick={excluir}
                disabled={saving}
                className="text-red-600 hover:text-red-700"
              >
                Excluir
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || !processoId}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
