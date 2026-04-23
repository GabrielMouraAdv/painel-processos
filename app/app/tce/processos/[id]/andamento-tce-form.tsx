"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { TipoProcessoTce } from "@prisma/client";

import { Button } from "@/components/ui/button";
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
import { fasesDoTipo } from "@/lib/tce-config";

type Props = {
  processoId: string;
  tipo: TipoProcessoTce;
  faseAtual: string;
};

export function AndamentoTceForm({ processoId, tipo, faseAtual }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const fases = React.useMemo(() => fasesDoTipo(tipo), [tipo]);

  const [data, setData] = React.useState(
    new Date().toISOString().slice(0, 10),
  );
  const [fase, setFase] = React.useState(faseAtual);
  const [descricao, setDescricao] = React.useState("");
  const [atualizarFase, setAtualizarFase] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!descricao.trim() || !fase) {
      toast({
        variant: "destructive",
        title: "Preencha os campos",
        description: "Fase e descricao sao obrigatorios.",
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/tce/andamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          processoId,
          data,
          fase,
          descricao: descricao.trim(),
          atualizarFaseProcesso: atualizarFase,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro ao registrar andamento",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toast({ title: "Andamento registrado" });
      setDescricao("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Data</Label>
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Fase</Label>
          <Select value={fase} onValueChange={setFase}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fases.map((f) => (
                <SelectItem key={f.key} value={f.key}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Descricao</Label>
        <Textarea
          rows={3}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Descreva a movimentacao do processo"
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={atualizarFase}
          onChange={(e) => setAtualizarFase(e.target.checked)}
        />
        Atualizar fase atual do processo para a fase escolhida
      </label>
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={submitting}
          className="bg-brand-navy hover:bg-brand-navy/90"
        >
          {submitting ? "Registrando..." : "Registrar andamento"}
        </Button>
      </div>
    </form>
  );
}
