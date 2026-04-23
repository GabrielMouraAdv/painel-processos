"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { PRAZO_TIPOS, PRAZO_TIPO_OUTRO, isTipoPreset } from "@/lib/prazo-tipos";

export type AdvogadoOption = { id: string; nome: string };

export type ProcessoOption = { id: string; numero: string; gestor: string };

export type PrazoInitial = {
  id?: string;
  tipo: string;
  data: string;
  hora: string | null;
  observacoes: string | null;
  advogadoResp: { id: string; nome: string } | null;
  processo?: { id: string; numero: string };
};

const schema = z.object({
  tipoSelect: z.string().min(1, "Selecione o tipo"),
  tipoCustom: z.string().optional(),
  processoId: z.string().optional(),
  data: z.string().min(1, "Informe a data"),
  hora: z.string().optional(),
  advogadoRespId: z.string().min(1, "Selecione o advogado responsavel"),
  observacoes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  mode: "create" | "edit";
  prazo?: PrazoInitial;
  processoId?: string;
  processos?: ProcessoOption[];
  advogados: AdvogadoOption[];
  onSuccess: () => void;
  onCancel?: () => void;
  submitLabel?: string;
};

export function PrazoForm({
  mode,
  prazo,
  processoId,
  processos,
  advogados,
  onSuccess,
  onCancel,
  submitLabel,
}: Props) {
  const { toast } = useToast();

  const initialTipo = prazo?.tipo ?? "";
  const initialTipoSelect =
    initialTipo === "" ? "" : isTipoPreset(initialTipo) ? initialTipo : PRAZO_TIPO_OUTRO;
  const initialTipoCustom = isTipoPreset(initialTipo) ? "" : initialTipo;

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipoSelect: initialTipoSelect,
      tipoCustom: initialTipoCustom,
      processoId: prazo?.processo?.id ?? processoId ?? "",
      data: prazo ? prazo.data.slice(0, 10) : "",
      hora: prazo?.hora ?? "",
      advogadoRespId: prazo?.advogadoResp?.id ?? "",
      observacoes: prazo?.observacoes ?? "",
    },
  });

  const tipoSelect = watch("tipoSelect");

  async function onSubmit(values: FormValues) {
    const tipo =
      values.tipoSelect === PRAZO_TIPO_OUTRO
        ? (values.tipoCustom ?? "").trim()
        : values.tipoSelect;
    if (!tipo) {
      toast({
        variant: "destructive",
        title: "Informe o tipo",
        description: "Selecione um tipo ou descreva um personalizado.",
      });
      return;
    }

    const isEdit = mode === "edit" && prazo?.id;
    const url = isEdit ? `/api/prazos/${prazo!.id}` : "/api/prazos";
    const method = isEdit ? "PATCH" : "POST";

    const basePayload: Record<string, unknown> = {
      tipo,
      data: values.data,
      hora: values.hora || null,
      observacoes: values.observacoes || null,
      advogadoRespId: values.advogadoRespId,
    };
    if (!isEdit) {
      basePayload.processoId = processoId ?? values.processoId ?? prazo?.processo?.id;
    }

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(basePayload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({
        variant: "destructive",
        title: isEdit ? "Erro ao atualizar prazo" : "Erro ao criar prazo",
        description: json.error ?? "Tente novamente.",
      });
      return;
    }
    toast({ title: isEdit ? "Prazo atualizado" : "Prazo cadastrado" });
    onSuccess();
  }

  const showProcessoSelect = mode === "create" && !processoId && processos;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      {showProcessoSelect && (
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
                  {processos!.map((p) => (
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
      )}

      <div className="space-y-1.5">
        <Label>Tipo</Label>
        <Controller
          control={control}
          name="tipoSelect"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {PRAZO_TIPOS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
                <SelectItem value={PRAZO_TIPO_OUTRO}>{PRAZO_TIPO_OUTRO}</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.tipoSelect && (
          <p className="text-xs text-red-600">{errors.tipoSelect.message}</p>
        )}
      </div>

      {tipoSelect === PRAZO_TIPO_OUTRO && (
        <div className="space-y-1.5">
          <Label>Descreva o tipo</Label>
          <Input
            placeholder="Ex.: Sustentacao oral"
            {...register("tipoCustom")}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Data de vencimento</Label>
          <Input type="date" {...register("data")} />
          {errors.data && <p className="text-xs text-red-600">{errors.data.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Horario (opcional)</Label>
          <Input type="time" {...register("hora")} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>
          Advogado responsavel <span className="text-red-600">*</span>
        </Label>
        <Controller
          control={control}
          name="advogadoRespId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o advogado" />
              </SelectTrigger>
              <SelectContent>
                {advogados.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.advogadoRespId && (
          <p className="text-xs text-red-600">{errors.advogadoRespId.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Observacoes</Label>
        <Textarea rows={2} {...register("observacoes")} />
      </div>

      <DialogFooter>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-brand-navy hover:bg-brand-navy/90"
        >
          {isSubmitting
            ? "Salvando..."
            : submitLabel ?? (mode === "edit" ? "Salvar alteracoes" : "Cadastrar prazo")}
        </Button>
      </DialogFooter>
    </form>
  );
}
