"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, RotateCcw, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type Props = {
  deteccaoId: string;
  numero: string;
};

export function DispensarDeteccaoDialog({ deteccaoId, numero }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [motivo, setMotivo] = React.useState("");

  async function dispensar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/eleitoral/deteccoes/${deteccaoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "dispensar", motivo: motivo || null }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Falha ao dispensar");
      toast({ title: "Deteccao dispensada" });
      setOpen(false);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <XCircle className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          Dispensar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dispensar deteccao</DialogTitle>
        </DialogHeader>
        <form onSubmit={dispensar} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            O processo {numero} nao sera cadastrado e sai da fila. Ele nao
            volta a ser detectado pela rotina.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="motivoDispensa">Motivo (opcional)</Label>
            <Textarea
              id="motivoDispensa"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: nao envolve nossos representados"
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Dispensando..." : "Confirmar dispensa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function OutroEscritorioDialog({ deteccaoId, numero }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [escritorio, setEscritorio] = React.useState("");

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/eleitoral/deteccoes/${deteccaoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "outro_escritorio",
          escritorioResponsavel: escritorio,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Falha ao registrar");
      toast({ title: `Marcado como responsabilidade de ${escritorio}` });
      setOpen(false);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Building2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          Outro escritorio
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Responsabilidade de outro escritorio</DialogTitle>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            O processo {numero} fica registrado no historico como conduzido por
            outro escritorio do grupo, sem entrar no nosso acervo.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="nomeEscritorio">Qual escritorio?</Label>
            <Input
              id="nomeEscritorio"
              value={escritorio}
              onChange={(e) => setEscritorio(e.target.value)}
              placeholder="Nome do escritorio responsavel"
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ReabrirDeteccaoButton({ deteccaoId, numero }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);

  async function reabrir() {
    if (!window.confirm(`Reabrir a deteccao ${numero} na fila de triagem?`)) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/eleitoral/deteccoes/${deteccaoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "reabrir" }),
      });
      if (!res.ok) throw new Error("Falha ao reabrir");
      toast({ title: "Deteccao reaberta" });
      router.refresh();
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={reabrir}
      disabled={busy}
      title="Reabrir na triagem"
    >
      <RotateCcw className="h-3.5 w-3.5" />
    </Button>
  );
}
