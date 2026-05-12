"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

import type { CalendarEvento } from "./types";
import type {
  AdvogadoOption,
  ProcessoTceOption,
  ProcessoJudOption,
} from "./compromissos-view";

const TIPOS: { value: string; label: string }[] = [
  { value: "REUNIAO", label: "Reuniao" },
  { value: "AUDIENCIA", label: "Audiencia" },
  { value: "SUSTENTACAO", label: "Sustentacao Oral" },
  { value: "DESPACHO_PRESENCIAL", label: "Despacho Presencial" },
  { value: "VIAGEM", label: "Viagem" },
  { value: "PESSOAL", label: "Pessoal" },
  { value: "OUTRO", label: "Outro" },
];

type Props = {
  mode: "create" | "edit";
  evento?: CalendarEvento | null;
  dataInicialIso?: string | null;
  usuario: { id: string; nome: string };
  isAdmin: boolean;
  advogados: AdvogadoOption[];
  processosTce: ProcessoTceOption[];
  processosJud: ProcessoJudOption[];
  onSuccess: () => void;
  onCancel?: () => void;
};

function splitIso(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return { date: `${y}-${m}-${dd}`, time: `${hh}:${mi}` };
}

function combineDateTime(date: string, time: string): string | null {
  if (!date) return null;
  const t = time || "09:00";
  return new Date(`${date}T${t}:00`).toISOString();
}

export function CompromissoForm({
  mode,
  evento,
  dataInicialIso,
  usuario,
  isAdmin,
  advogados,
  processosTce,
  processosJud,
  onSuccess,
  onCancel,
}: Props) {
  const { toast } = useToast();
  const inicial = evento
    ? splitIso(evento.dataInicio)
    : splitIso(dataInicialIso ?? null);
  const fim = evento ? splitIso(evento.dataFim) : { date: "", time: "" };

  const [titulo, setTitulo] = React.useState(evento?.titulo ?? "");
  const [tipo, setTipo] = React.useState<string>(evento?.tipo ?? "REUNIAO");
  const [dateInicio, setDateInicio] = React.useState(inicial.date);
  const [horaInicio, setHoraInicio] = React.useState(inicial.time || "09:00");
  const [dateFim, setDateFim] = React.useState(fim.date);
  const [horaFim, setHoraFim] = React.useState(fim.time);
  const [diaInteiro, setDiaInteiro] = React.useState(
    evento?.diaInteiro ?? false,
  );
  const [cor, setCor] = React.useState(evento?.cor ?? "#3b82f6");
  const [local, setLocal] = React.useState(evento?.local ?? "");
  const [descricao, setDescricao] = React.useState(evento?.descricao ?? "");
  const [advogadoId, setAdvogadoId] = React.useState(
    evento?.advogado?.id ?? usuario.id,
  );
  const [vinculo, setVinculo] = React.useState<"nenhum" | "tce" | "judicial">(
    evento?.processoRef
      ? evento.processoRef.tipo === "tce"
        ? "tce"
        : "judicial"
      : "nenhum",
  );
  const [processoTceId, setProcessoTceId] = React.useState(
    evento?.processoRef?.tipo === "tce" ? evento.processoRef.id : "",
  );
  const [processoId, setProcessoId] = React.useState(
    evento?.processoRef?.tipo === "judicial" ? evento.processoRef.id : "",
  );
  const [submitting, setSubmitting] = React.useState(false);

  async function salvar() {
    if (!titulo.trim()) {
      toast({ variant: "destructive", title: "Informe o titulo" });
      return;
    }
    if (!dateInicio) {
      toast({ variant: "destructive", title: "Informe a data de inicio" });
      return;
    }
    const dataInicio = combineDateTime(
      dateInicio,
      diaInteiro ? "00:00" : horaInicio,
    );
    const dataFim =
      dateFim && !diaInteiro
        ? combineDateTime(dateFim, horaFim || "23:59")
        : null;

    const body = {
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      dataInicio,
      dataFim,
      diaInteiro,
      cor,
      tipo,
      local: local.trim() || null,
      advogadoId,
      processoTceId: vinculo === "tce" ? processoTceId || null : null,
      processoId: vinculo === "judicial" ? processoId || null : null,
    };

    setSubmitting(true);
    try {
      const url =
        mode === "edit" && evento
          ? `/api/compromissos/${evento.id}`
          : "/api/compromissos";
      const method = mode === "edit" ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title:
            mode === "edit" ? "Erro ao salvar" : "Erro ao criar compromisso",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toast({
        title:
          mode === "edit" ? "Compromisso atualizado" : "Compromisso criado",
      });
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>
          Titulo <span className="text-red-600">*</span>
        </Label>
        <Input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex.: Reuniao com cliente"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Tipo</Label>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIPOS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>
            Data inicio <span className="text-red-600">*</span>
          </Label>
          <Input
            type="date"
            value={dateInicio}
            onChange={(e) => setDateInicio(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Hora inicio</Label>
          <Input
            type="time"
            value={horaInicio}
            disabled={diaInteiro}
            onChange={(e) => setHoraInicio(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Data fim (opcional)</Label>
          <Input
            type="date"
            value={dateFim}
            onChange={(e) => setDateFim(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Hora fim</Label>
          <Input
            type="time"
            value={horaFim}
            disabled={diaInteiro}
            onChange={(e) => setHoraFim(e.target.value)}
          />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-md border bg-slate-50 px-3 py-2">
        <Switch
          checked={diaInteiro}
          onCheckedChange={setDiaInteiro}
          ariaLabel="Dia inteiro"
        />
        <span className="text-sm">Dia inteiro</span>
      </label>

      <div className="grid grid-cols-[120px_1fr] gap-3">
        <div className="space-y-1.5">
          <Label>Cor</Label>
          <Input
            type="color"
            value={cor}
            onChange={(e) => setCor(e.target.value)}
            className="h-10 w-full cursor-pointer p-1"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Local</Label>
          <Input
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            placeholder="Ex.: Forum, sala 305"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Descricao</Label>
        <Textarea
          rows={2}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Detalhes adicionais..."
        />
      </div>

      <div className="space-y-1.5">
        <Label>Vincular a processo (opcional)</Label>
        <Select
          value={vinculo}
          onValueChange={(v) =>
            setVinculo(v as "nenhum" | "tce" | "judicial")
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nenhum">Sem vinculo</SelectItem>
            <SelectItem value="tce">Processo TCE</SelectItem>
            <SelectItem value="judicial">Processo Judicial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {vinculo === "tce" && (
        <div className="space-y-1.5">
          <Label>Processo TCE</Label>
          <Select value={processoTceId} onValueChange={setProcessoTceId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o processo" />
            </SelectTrigger>
            <SelectContent>
              {processosTce.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.numero}
                  {p.municipio ? ` — ${p.municipio}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {vinculo === "judicial" && (
        <div className="space-y-1.5">
          <Label>Processo Judicial</Label>
          <Select value={processoId} onValueChange={setProcessoId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o processo" />
            </SelectTrigger>
            <SelectContent>
              {processosJud.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.numero} — {p.gestor}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>
          Advogado responsavel <span className="text-red-600">*</span>
        </Label>
        <Select
          value={advogadoId}
          onValueChange={setAdvogadoId}
          disabled={!isAdmin}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {advogados.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DialogFooter>
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancelar
          </Button>
        )}
        <Button
          type="button"
          onClick={salvar}
          disabled={submitting}
          className="bg-brand-navy hover:bg-brand-navy/90"
        >
          {submitting
            ? "Salvando..."
            : mode === "edit"
              ? "Salvar"
              : "Cadastrar"}
        </Button>
      </DialogFooter>
    </div>
  );
}
