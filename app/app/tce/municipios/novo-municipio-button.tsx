"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  nome: z.string().min(1, "Informe o nome"),
  uf: z.string().min(2, "UF invalida").max(2),
  cnpjPrefeitura: z.string().optional(),
  observacoes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function NovoMunicipioButton({ label = "Novo Municipio" }: { label?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nome: "", uf: "PE", cnpjPrefeitura: "", observacoes: "" },
  });

  async function onSubmit(values: FormValues) {
    const res = await fetch("/api/tce/municipios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        cnpjPrefeitura: values.cnpjPrefeitura || null,
        observacoes: values.observacoes || null,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({
        variant: "destructive",
        title: "Erro ao criar municipio",
        description: json.error ?? "Tente novamente.",
      });
      return;
    }
    toast({ title: "Municipio cadastrado" });
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-brand-navy hover:bg-brand-navy/90">
          <Plus className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo municipio</DialogTitle>
          <DialogDescription>
            Cadastre um municipio para vincular a processos do TCE.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-[1fr_80px] gap-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input {...register("nome")} />
              {errors.nome && (
                <p className="text-xs text-red-600">{errors.nome.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>UF</Label>
              <Input maxLength={2} {...register("uf")} />
              {errors.uf && (
                <p className="text-xs text-red-600">{errors.uf.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>CNPJ da Prefeitura (opcional)</Label>
            <Input placeholder="00.000.000/0000-00" {...register("cnpjPrefeitura")} />
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
              {isSubmitting ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
