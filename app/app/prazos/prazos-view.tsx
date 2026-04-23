"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Tribunal } from "@prisma/client";
import { z } from "zod";
import { Plus } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { tribunalLabels } from "@/lib/processo-labels";
import { diasAte, urgenciaDe } from "@/lib/prazos";
import { cn } from "@/lib/utils";

export type PrazoItem = {
  id: string;
  tipo: string;
  data: string;
  hora: string | null;
  observacoes: string | null;
  cumprido: boolean;
  geradoAuto: boolean;
  origemFase: string | null;
  processo: {
    id: string;
    numero: string;
    tribunal: Tribunal;
    advogadoId: string;
    gestor: { nome: string };
  };
};

export type ProcessoOption = {
  id: string;
  numero: string;
  gestor: string;
};

export type AdvogadoOption = {
  id: string;
  nome: string;
};

type Filters = {
  tribunal: string;
  advogadoId: string;
  status: string;
  de: string;
  ate: string;
};

type Props = {
  prazos: PrazoItem[];
  processos: ProcessoOption[];
  advogados: AdvogadoOption[];
  initialFilters: Filters;
};

const createSchema = z.object({
  processoId: z.string().min(1, "Selecione o processo"),
  tipo: z.string().min(1, "Informe o tipo"),
  data: z.string().min(1, "Informe a data"),
  hora: z.string().optional(),
  observacoes: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;

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

function countdownLabel(dias: number, cumprido: boolean): string {
  if (cumprido) return "cumprido";
  if (dias < 0) return `atrasado ${-dias}d`;
  if (dias === 0) return "vence hoje";
  if (dias === 1) return "1 dia";
  return `${dias} dias`;
}

export function PrazosView({
  prazos,
  processos,
  advogados,
  initialFilters,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [filters, setFilters] = React.useState(initialFilters);
  const [toggling, setToggling] = React.useState<Record<string, boolean>>({});
  const [createOpen, setCreateOpen] = React.useState(false);

  function applyFilters(next: Filters) {
    setFilters(next);
    const params = new URLSearchParams();
    if (next.tribunal) params.set("tribunal", next.tribunal);
    if (next.advogadoId) params.set("advogadoId", next.advogadoId);
    if (next.status) params.set("status", next.status);
    if (next.de) params.set("de", next.de);
    if (next.ate) params.set("ate", next.ate);
    const qs = params.toString();
    router.push(qs ? `/app/prazos?${qs}` : "/app/prazos");
  }

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    applyFilters({ ...filters, [key]: value });
  }

  function clearFilters() {
    applyFilters({ tribunal: "", advogadoId: "", status: "", de: "", ate: "" });
  }

  async function toggleCumprido(p: PrazoItem) {
    setToggling((t) => ({ ...t, [p.id]: true }));
    try {
      const res = await fetch(`/api/prazos/${p.id}`, {
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

  const { diasUrgentes, diasProximos } = React.useMemo(() => {
    const u: Date[] = [];
    const p: Date[] = [];
    for (const prazo of prazos) {
      if (prazo.cumprido) continue;
      const urg = urgenciaDe(new Date(prazo.data), prazo.cumprido);
      const data = new Date(prazo.data);
      if (urg === "urgente") u.push(data);
      else if (urg === "proximo") p.push(data);
    }
    return { diasUrgentes: u, diasProximos: p };
  }, [prazos]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-navy">
            Prazos
          </h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe os prazos processuais e gere-os manualmente quando necessario.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-brand-navy hover:bg-brand-navy/90">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Prazo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo prazo</DialogTitle>
              <DialogDescription>
                Vincule o prazo a um processo existente.
              </DialogDescription>
            </DialogHeader>
            <CreatePrazoForm
              processos={processos}
              onSuccess={() => {
                setCreateOpen(false);
                router.refresh();
              }}
            />
          </DialogContent>
        </Dialog>
      </header>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="flex min-w-[160px] flex-col gap-1">
            <Label className="text-xs">Tribunal</Label>
            <Select
              value={filters.tribunal || "__all__"}
              onValueChange={(v) =>
                updateFilter("tribunal", v === "__all__" ? "" : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {Object.values(Tribunal).map((t) => (
                  <SelectItem key={t} value={t}>
                    {tribunalLabels[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-[180px] flex-col gap-1">
            <Label className="text-xs">Advogado</Label>
            <Select
              value={filters.advogadoId || "__all__"}
              onValueChange={(v) =>
                updateFilter("advogadoId", v === "__all__" ? "" : v)
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
          <div className="flex min-w-[140px] flex-col gap-1">
            <Label className="text-xs">De</Label>
            <Input
              type="date"
              value={filters.de}
              onChange={(e) => updateFilter("de", e.target.value)}
            />
          </div>
          <div className="flex min-w-[140px] flex-col gap-1">
            <Label className="text-xs">Ate</Label>
            <Input
              type="date"
              value={filters.ate}
              onChange={(e) => updateFilter("ate", e.target.value)}
            />
          </div>
          <div className="flex min-w-[150px] flex-col gap-1">
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
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="cumprido">Cumpridos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Limpar filtros
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          {prazos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Nenhum prazo encontrado com os filtros atuais.
              </CardContent>
            </Card>
          ) : (
            prazos.map((p) => (
              <PrazoCard
                key={p.id}
                prazo={p}
                loading={!!toggling[p.id]}
                onToggle={() => toggleCumprido(p)}
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
                  <span className="text-muted-foreground">Vence em ate 7 dias</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />
                  <span className="text-muted-foreground">Vence em ate 14 dias</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PrazoCard({
  prazo,
  loading,
  onToggle,
}: {
  prazo: PrazoItem;
  loading: boolean;
  onToggle: () => void;
}) {
  const data = new Date(prazo.data);
  const dias = diasAte(data);
  const urg = urgenciaDe(data, prazo.cumprido);
  const { dia, mes } = formatDateDay(data);

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
          disabled={loading}
          onChange={onToggle}
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
          {prazo.hora && (
            <span className="text-xs text-muted-foreground">
              as {prazo.hora}
            </span>
          )}
          {prazo.geradoAuto && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
              auto
            </span>
          )}
        </div>
        <p
          className={cn(
            "text-xs text-muted-foreground",
            prazo.cumprido && "line-through",
          )}
        >
          <span className="font-medium text-slate-700">
            {prazo.processo.gestor.nome}
          </span>{" "}
          —{" "}
          <Link
            href={`/app/processos/${prazo.processo.id}`}
            className="font-mono text-brand-navy hover:underline"
          >
            {prazo.processo.numero}
          </Link>
        </p>
        <p className="text-xs text-muted-foreground capitalize">
          {formatDateFull(data)}
        </p>
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

      <div className="flex flex-col items-end justify-center">
        <span className={cn("text-lg font-semibold", countdownClass)}>
          {countdownLabel(dias, prazo.cumprido)}
        </span>
        {!prazo.cumprido && (
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            restantes
          </span>
        )}
      </div>
    </div>
  );
}

function CreatePrazoForm({
  processos,
  onSuccess,
}: {
  processos: ProcessoOption[];
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      processoId: "",
      tipo: "",
      data: "",
      hora: "",
      observacoes: "",
    },
  });

  async function onSubmit(values: CreateForm) {
    const res = await fetch("/api/prazos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        hora: values.hora || null,
        observacoes: values.observacoes || null,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({
        variant: "destructive",
        title: "Erro ao criar prazo",
        description: json.error ?? "Tente novamente.",
      });
      return;
    }
    toast({ title: "Prazo cadastrado" });
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Processo</Label>
        <Controller
          control={control}
          name="processoId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o processo" />
              </SelectTrigger>
              <SelectContent>
                {processos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.numero} — {p.gestor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.processoId && (
          <p className="text-xs text-red-600">{errors.processoId.message}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label>Tipo</Label>
        <Input placeholder="Ex.: Contestacao, Audiencia..." {...register("tipo")} />
        {errors.tipo && <p className="text-xs text-red-600">{errors.tipo.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Data</Label>
          <Input type="date" {...register("data")} />
          {errors.data && <p className="text-xs text-red-600">{errors.data.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Hora</Label>
          <Input type="time" {...register("hora")} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Observacoes</Label>
        <Textarea rows={2} {...register("observacoes")} />
      </div>
      <DialogFooter>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-brand-navy hover:bg-brand-navy/90"
        >
          {isSubmitting ? "Salvando..." : "Cadastrar prazo"}
        </Button>
      </DialogFooter>
    </form>
  );
}
