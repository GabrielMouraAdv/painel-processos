"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  dataInputUTC,
  STATUS_PRAZO_ELEITORAL,
} from "@/lib/eleitoral-labels";

export type UsuarioOption = { id: string; nome: string };

export type PrazoEleitoralInitial = {
  id: string;
  tarefa: string;
  data: string;
  hora: string | null;
  observacoes: string | null;
  responsavelId: string | null;
  status: string;
};

type Props = {
  mode: "create" | "edit";
  processoId?: string;
  prazo?: PrazoEleitoralInitial;
  usuarios: UsuarioOption[];
  trigger: React.ReactNode;
};

const NENHUM = "__nenhum__";

export function PrazoFormDialog({
  mode,
  processoId,
  prazo,
  usuarios,
  trigger,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [tarefa, setTarefa] = React.useState(prazo?.tarefa ?? "");
  const [data, setData] = React.useState(
    prazo ? dataInputUTC(prazo.data) : new Date().toISOString().slice(0, 10),
  );
  const [hora, setHora] = React.useState(prazo?.hora ?? "");
  const [responsavelId, setResponsavelId] = React.useState(
    prazo?.responsavelId ?? NENHUM,
  );
  const [status, setStatus] = React.useState(prazo?.status ?? "PENDENTE");
  const [observacoes, setObservacoes] = React.useState(prazo?.observacoes ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...(mode === "create" ? { processoId } : {}),
        tarefa,
        data,
        hora: hora || null,
        status,
        responsavelId: responsavelId === NENHUM ? null : responsavelId,
        observacoes: observacoes || null,
      };
      const res = await fetch(
        mode === "create"
          ? "/api/eleitoral/prazos"
          : `/api/eleitoral/prazos/${prazo!.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error ?? "Falha ao salvar o prazo");
      }
      toast({
        title: mode === "create" ? "Prazo cadastrado" : "Prazo atualizado",
      });
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
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Novo prazo" : "Editar prazo"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tarefa">Tarefa</Label>
            <Input
              id="tarefa"
              value={tarefa}
              onChange={(e) => setTarefa(e.target.value)}
              placeholder="Ex.: Defesa"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hora">Hora (opcional)</Label>
              <Input
                id="hora"
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_PRAZO_ELEITORAL.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Responsavel</Label>
            <Select value={responsavelId} onValueChange={setResponsavelId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NENHUM}>— Sem responsavel —</SelectItem>
                {usuarios.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="obs">Observacoes</Label>
            <Textarea
              id="obs"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
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
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
