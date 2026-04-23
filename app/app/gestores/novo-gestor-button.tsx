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
  cpf: z.string().min(11, "CPF invalido"),
  municipio: z.string().min(1, "Informe o municipio"),
  cargo: z.string().min(1, "Informe o cargo"),
  observacoes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function NovoGestorButton() {
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
    defaultValues: { nome: "", cpf: "", municipio: "", cargo: "", observacoes: "" },
  });

  async function onSubmit(values: FormValues) {
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
        description: json.error ?? "Tente novamente.",
      });
      return;
    }
    toast({ title: "Gestor cadastrado" });
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-brand-navy hover:bg-brand-navy/90">
          <Plus className="mr-2 h-4 w-4" />
          Novo Gestor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo gestor</DialogTitle>
          <DialogDescription>
            Cadastre um gestor para vincular a processos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input {...register("nome")} />
            {errors.nome && <p className="text-xs text-red-600">{errors.nome.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>CPF</Label>
              <Input placeholder="000.000.000-00" {...register("cpf")} />
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
