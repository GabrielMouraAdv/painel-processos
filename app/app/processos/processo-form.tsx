"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { Grau, Risco, TipoProcesso, Tribunal } from "@prisma/client";
import { z } from "zod";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { fasesPorGrau } from "@/lib/fases";
import {
  grauLabels,
  riscoLabels,
  tipoLabels,
  tribunalLabels,
} from "@/lib/processo-labels";

const formSchema = z
  .object({
    numero: z.string().min(1, "Informe o numero do processo"),
    tipo: z.nativeEnum(TipoProcesso),
    tipoLivre: z.string().optional(),
    tribunal: z.nativeEnum(Tribunal),
    juizo: z.string().min(1, "Informe o juizo"),
    grau: z.nativeEnum(Grau),
    fase: z.string().min(1, "Selecione a fase"),
    resultado: z.string().optional(),
    risco: z.nativeEnum(Risco),
    valor: z.string().optional(),
    dataDistribuicao: z.string().min(1, "Informe a data de distribuicao"),
    objeto: z.string().min(1, "Informe o objeto"),
    gestorId: z.string().min(1, "Selecione o gestor"),
    advogadoId: z.string().min(1, "Selecione o advogado"),
  })
  .refine(
    (data) =>
      data.tipo !== TipoProcesso.OUTRO ||
      (!!data.tipoLivre && data.tipoLivre.trim().length > 0),
    {
      message: "Descreva o tipo da acao",
      path: ["tipoLivre"],
    },
  );

type FormValues = z.infer<typeof formSchema>;

const gestorFormSchema = z.object({
  nome: z.string().min(1, "Informe o nome"),
  cpf: z.string().min(11, "CPF invalido"),
  municipio: z.string().min(1, "Informe o municipio"),
  cargo: z.string().min(1, "Informe o cargo"),
  observacoes: z.string().optional(),
});

type GestorFormValues = z.infer<typeof gestorFormSchema>;

export type GestorOption = {
  id: string;
  nome: string;
  cargo: string;
  municipio: string;
};

export type AdvogadoOption = {
  id: string;
  nome: string;
  email: string;
};

export type ProcessoFormInitial = Partial<
  Omit<FormValues, "dataDistribuicao" | "valor">
> & {
  dataDistribuicao?: string | Date;
  valor?: number | string | null;
};

type Props = {
  gestores: GestorOption[];
  advogados: AdvogadoOption[];
  initial?: ProcessoFormInitial;
  processoId?: string;
  mode: "create" | "edit";
  onCancel?: () => void;
};

function toDateInput(v: string | Date | undefined): string {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function ProcessoForm({
  gestores: initialGestores,
  advogados,
  initial,
  processoId,
  mode,
  onCancel,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [gestores, setGestores] = React.useState(initialGestores);
  const [gestorDialogOpen, setGestorDialogOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numero: initial?.numero ?? "",
      tipo: initial?.tipo ?? TipoProcesso.IMPROBIDADE,
      tipoLivre: initial?.tipoLivre ?? "",
      tribunal: initial?.tribunal ?? Tribunal.TJPE,
      juizo: initial?.juizo ?? "",
      grau: initial?.grau ?? Grau.PRIMEIRO,
      fase: initial?.fase ?? "",
      resultado: initial?.resultado ?? "",
      risco: initial?.risco ?? Risco.MEDIO,
      valor:
        initial?.valor !== null && initial?.valor !== undefined
          ? String(initial.valor).replace(".", ",")
          : "",
      dataDistribuicao: toDateInput(initial?.dataDistribuicao),
      objeto: initial?.objeto ?? "",
      gestorId: initial?.gestorId ?? "",
      advogadoId: initial?.advogadoId ?? "",
    },
  });

  const grau = watch("grau");
  const fasesDisponiveis = React.useMemo(() => fasesPorGrau[grau] ?? [], [grau]);
  const faseValue = watch("fase");
  const faseConfig = fasesDisponiveis.find((f) => f.value === faseValue);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        resultado: values.resultado || null,
        valor: values.valor ? values.valor : null,
      };
      const url =
        mode === "edit" ? `/api/processos/${processoId}` : "/api/processos";
      const res = await fetch(url, {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro ao salvar",
          description: json.error ?? "Nao foi possivel salvar o processo.",
        });
        return;
      }
      toast({
        title: mode === "edit" ? "Processo atualizado" : "Processo criado",
        description:
          mode === "edit"
            ? "As alteracoes foram salvas."
            : "Novo processo registrado com sucesso.",
      });
      const targetId = mode === "edit" ? processoId : (json.id as string);
      router.push(`/app/processos/${targetId}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateGestor(values: GestorFormValues) {
    const res = await fetch("/api/gestores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({
        variant: "destructive",
        title: "Erro ao criar gestor",
        description: json.error ?? "Nao foi possivel criar o gestor.",
      });
      return;
    }
    const novo: GestorOption = {
      id: json.id,
      nome: json.nome,
      cargo: json.cargo,
      municipio: json.municipio,
    };
    setGestores((prev) => [...prev, novo]);
    setValue("gestorId", novo.id, { shouldValidate: true });
    setGestorDialogOpen(false);
    toast({ title: "Gestor cadastrado" });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Numero do processo" error={errors.numero?.message}>
          <Input placeholder="0000000-00.0000.0.00.0000" {...register("numero")} />
        </Field>
        <Field label="Data de distribuicao" error={errors.dataDistribuicao?.message}>
          <Input type="date" {...register("dataDistribuicao")} />
        </Field>

        <Field label="Tipo de processo" error={errors.tipo?.message}>
          <Controller
            control={control}
            name="tipo"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(TipoProcesso).map((t) => (
                    <SelectItem key={t} value={t}>
                      {tipoLabels[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        {watch("tipo") === TipoProcesso.OUTRO && (
          <Field
            label="Descreva o tipo da acao"
            error={errors.tipoLivre?.message}
          >
            <Input
              placeholder="Ex.: Acao Civil de Improbidade Administrativa"
              {...register("tipoLivre")}
            />
          </Field>
        )}
        <Field label="Tribunal" error={errors.tribunal?.message}>
          <Controller
            control={control}
            name="tribunal"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(Tribunal).map((t) => (
                    <SelectItem key={t} value={t}>
                      {tribunalLabels[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field label="Juizo / Vara" error={errors.juizo?.message}>
          <Input placeholder="Ex.: 2a Vara da Fazenda Publica" {...register("juizo")} />
        </Field>
        <Field label="Risco" error={errors.risco?.message}>
          <Controller
            control={control}
            name="risco"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(Risco).map((r) => (
                    <SelectItem key={r} value={r}>
                      {riscoLabels[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field label="Grau" error={errors.grau?.message}>
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
                    <SelectItem key={g} value={g}>
                      {grauLabels[g]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label="Fase atual" error={errors.fase?.message}>
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
                  <SelectValue placeholder="Selecione a fase" />
                </SelectTrigger>
                <SelectContent>
                  {fasesDisponiveis.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        {faseConfig?.resultados && faseConfig.resultados.length > 0 && (
          <Field label="Resultado">
            <Controller
              control={control}
              name="resultado"
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    {faseConfig.resultados!.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        )}

        <Field label="Valor envolvido (R$)">
          <Input placeholder="Ex.: 125000,00" {...register("valor")} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Gestor" error={errors.gestorId?.message}>
          <div className="flex gap-2">
            <div className="flex-1">
              <Controller
                control={control}
                name="gestorId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o gestor" />
                    </SelectTrigger>
                    <SelectContent>
                      {gestores.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.nome} — {g.cargo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <Dialog open={gestorDialogOpen} onOpenChange={setGestorDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="icon" title="Criar gestor">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo gestor</DialogTitle>
                  <DialogDescription>
                    Cadastre um gestor para vincular a este processo.
                  </DialogDescription>
                </DialogHeader>
                <InlineGestorForm onSubmit={handleCreateGestor} />
              </DialogContent>
            </Dialog>
          </div>
        </Field>

        <Field label="Advogado responsavel" error={errors.advogadoId?.message}>
          <Controller
            control={control}
            name="advogadoId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o advogado" />
                </SelectTrigger>
                <SelectContent>
                  {advogados.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nome} ({a.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>

      <Field label="Objeto da acao" error={errors.objeto?.message}>
        <Textarea rows={4} placeholder="Descreva o objeto da acao" {...register("objeto")} />
      </Field>

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          disabled={submitting}
          className="bg-brand-navy hover:bg-brand-navy/90"
        >
          {submitting ? "Salvando..." : mode === "edit" ? "Salvar alteracoes" : "Criar processo"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function InlineGestorForm({
  onSubmit,
}: {
  onSubmit: (values: GestorFormValues) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GestorFormValues>({
    resolver: zodResolver(gestorFormSchema),
    defaultValues: { nome: "", cpf: "", municipio: "", cargo: "", observacoes: "" },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-3"
    >
      <Field label="Nome" error={errors.nome?.message}>
        <Input {...register("nome")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="CPF" error={errors.cpf?.message}>
          <Input placeholder="000.000.000-00" {...register("cpf")} />
        </Field>
        <Field label="Cargo" error={errors.cargo?.message}>
          <Input {...register("cargo")} />
        </Field>
      </div>
      <Field label="Municipio" error={errors.municipio?.message}>
        <Input {...register("municipio")} />
      </Field>
      <Field label="Observacoes">
        <Textarea rows={2} {...register("observacoes")} />
      </Field>
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting} className="bg-brand-navy hover:bg-brand-navy/90">
          {isSubmitting ? "Salvando..." : "Cadastrar gestor"}
        </Button>
      </DialogFooter>
    </form>
  );
}
