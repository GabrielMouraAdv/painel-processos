"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  nome: z.string().min(1, "Informe o nome"),
  cpf: z.string().min(11, "CPF invalido"),
  municipio: z.string().min(1, "Informe o municipio"),
  cargo: z.string().min(1, "Informe o cargo"),
  observacoes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

type Props = {
  gestorId: string;
  initial: {
    nome: string;
    cpf: string;
    municipio: string;
    cargo: string;
    observacoes: string | null;
  };
};

export function GestorForm({ gestorId, initial }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: initial.nome,
      cpf: initial.cpf,
      municipio: initial.municipio,
      cargo: initial.cargo,
      observacoes: initial.observacoes ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    const res = await fetch(`/api/gestores/${gestorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: json.error ?? "Tente novamente.",
      });
      return;
    }
    toast({ title: "Gestor atualizado" });
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="space-y-3">
        <Info label="Nome" value={initial.nome} />
        <div className="grid grid-cols-2 gap-3">
          <Info label="CPF" value={initial.cpf} />
          <Info label="Cargo" value={initial.cargo} />
        </div>
        <Info label="Municipio" value={initial.municipio} />
        <Info label="Observacoes" value={initial.observacoes ?? "-"} />
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="mr-1.5 h-4 w-4" />
            Editar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Nome</Label>
        <Input {...register("nome")} />
        {errors.nome && <p className="text-xs text-red-600">{errors.nome.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>CPF</Label>
          <Input {...register("cpf")} />
          {errors.cpf && <p className="text-xs text-red-600">{errors.cpf.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Cargo</Label>
          <Input {...register("cargo")} />
          {errors.cargo && <p className="text-xs text-red-600">{errors.cargo.message}</p>}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Municipio</Label>
        <Input {...register("municipio")} />
        {errors.municipio && (
          <p className="text-xs text-red-600">{errors.municipio.message}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label>Observacoes</Label>
        <Textarea rows={2} {...register("observacoes")} />
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            reset();
            setEditing(false);
          }}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-brand-navy hover:bg-brand-navy/90"
        >
          {isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-slate-800">{value}</p>
    </div>
  );
}
