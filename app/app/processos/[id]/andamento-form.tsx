"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { Grau } from "@prisma/client";
import { z } from "zod";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { addDias, fasesPorGrau, getFase, getResultado } from "@/lib/fases";
import { grauLabels } from "@/lib/processo-labels";

const schema = z.object({
  data: z.string().min(1, "Informe a data"),
  grau: z.nativeEnum(Grau),
  fase: z.string().min(1, "Selecione a fase"),
  resultado: z.string().optional(),
  texto: z.string().min(1, "Descreva o andamento"),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  processoId: string;
  currentGrau: Grau;
  currentFase: string;
  prefill?: { data?: string; texto?: string } | null;
  prefillTrigger?: number;
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AndamentoForm({
  processoId,
  currentGrau,
  currentFase,
  prefill,
  prefillTrigger,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [acoesSelecionadas, setAcoesSelecionadas] = React.useState<Record<string, boolean>>({});
  const formRef = React.useRef<HTMLFormElement | null>(null);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      data: todayStr(),
      grau: currentGrau,
      fase: currentFase,
      resultado: "",
      texto: "",
    },
  });

  const grau = watch("grau");
  const fase = watch("fase");
  const resultado = watch("resultado");
  const data = watch("data");

  const fases = React.useMemo(() => fasesPorGrau[grau] ?? [], [grau]);
  const faseConfig = getFase(grau, fase);
  const resultadoConfig =
    resultado && fase ? getResultado(grau, fase, resultado) : undefined;
  const acoes = resultadoConfig?.acoes ?? [];

  React.useEffect(() => {
    setAcoesSelecionadas({});
  }, [grau, fase, resultado]);

  React.useEffect(() => {
    if (prefillTrigger === undefined || !prefill) return;
    if (prefill.data) setValue("data", prefill.data);
    if (prefill.texto) setValue("texto", prefill.texto);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillTrigger]);

  function toggleAcao(id: string) {
    setAcoesSelecionadas((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const baseDate = new Date(values.data);
      const acoesSelList = acoes
        .filter((a) => acoesSelecionadas[a.id])
        .map((a) => ({
          tipoPrazo: a.tipoPrazo,
          data: addDias(baseDate, a.dias).toISOString(),
          origemFase: values.fase,
        }));

      const payload = {
        data: values.data,
        grau: values.grau,
        fase: values.fase,
        resultado: values.resultado || null,
        texto: values.texto,
        acoes: acoesSelList,
      };

      const res = await fetch(`/api/processos/${processoId}/andamentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro ao salvar andamento",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toast({
        title: "Andamento registrado",
        description:
          acoesSelList.length > 0
            ? `${acoesSelList.length} prazo(s) gerado(s) automaticamente.`
            : "Processo atualizado com o novo andamento.",
      });
      reset({
        data: todayStr(),
        grau: values.grau,
        fase: values.fase,
        resultado: values.resultado,
        texto: "",
      });
      setAcoesSelecionadas({});
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Data</Label>
          <Input type="date" {...register("data")} />
          {errors.data && <p className="text-xs text-red-600">{errors.data.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Grau</Label>
          <Controller
            control={control}
            name="grau"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(v) => {
                  field.onChange(v);
                  setValue("fase", "");
                  setValue("resultado", "");
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(Grau).map((g) => (
                    <SelectItem key={g} value={g}>{grauLabels[g]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Fase</Label>
          <Controller
            control={control}
            name="fase"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(v) => {
                  field.onChange(v);
                  setValue("resultado", "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {fases.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.fase && <p className="text-xs text-red-600">{errors.fase.message}</p>}
        </div>
      </div>

      {faseConfig?.alertas && faseConfig.alertas.length > 0 && (
        <div className="flex gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Atencao — lembretes para esta fase:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {faseConfig.alertas.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {faseConfig?.resultados && faseConfig.resultados.length > 0 && (
        <div className="space-y-1.5">
          <Label>Resultado</Label>
          <Controller
            control={control}
            name="resultado"
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o resultado" />
                </SelectTrigger>
                <SelectContent>
                  {faseConfig.resultados!.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      )}

      {acoes.length > 0 && (
        <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-medium text-brand-navy">
            Acoes sugeridas — prazos gerados automaticamente
          </p>
          <ul className="space-y-1.5">
            {acoes.map((a) => {
              const dataCalc = addDias(new Date(data || todayStr()), a.dias);
              return (
                <li key={a.id}>
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <Checkbox
                      checked={!!acoesSelecionadas[a.id]}
                      onChange={() => toggleAcao(a.id)}
                      className="mt-0.5"
                    />
                    <span>
                      {a.label}
                      <span className="ml-2 text-xs text-muted-foreground">
                        (vence em{" "}
                        {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(dataCalc)}
                        )
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Descricao do andamento</Label>
        <Textarea rows={3} placeholder="O que aconteceu nesse andamento?" {...register("texto")} />
        {errors.texto && <p className="text-xs text-red-600">{errors.texto.message}</p>}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting} className="bg-brand-navy hover:bg-brand-navy/90">
          {submitting ? "Salvando..." : "Registrar andamento"}
        </Button>
      </div>
    </form>
  );
}
