"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useToast } from "@/hooks/use-toast";

export type InteressadoItem = {
  id: string;
  cargo: string;
  gestor: { id: string; nome: string };
};

export type GestorOption = {
  id: string;
  nome: string;
  tipoInteressado: "PESSOA_FISICA" | "PESSOA_JURIDICA";
  nomeFantasia?: string | null;
};

type Props = {
  processoId: string;
  interessados: InteressadoItem[];
  gestores: GestorOption[];
};

export function InteressadosTceManager({
  processoId,
  interessados,
  gestores,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [novoGestorId, setNovoGestorId] = React.useState("");
  const [novoCargo, setNovoCargo] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function adicionar() {
    if (!novoGestorId || !novoCargo.trim()) {
      toast({
        variant: "destructive",
        title: "Preencha os campos",
      });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/tce/interessados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          processoId,
          gestorId: novoGestorId,
          cargo: novoCargo.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro ao adicionar interessado",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      setNovoGestorId("");
      setNovoCargo("");
      toast({ title: "Interessado adicionado" });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remover(id: string) {
    if (!window.confirm("Remover este interessado?")) return;
    const res = await fetch(`/api/tce/interessados/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast({ variant: "destructive", title: "Erro ao remover" });
      return;
    }
    toast({ title: "Interessado removido" });
    router.refresh();
  }

  return (
    <>
      <div className="space-y-2">
        {interessados.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum interessado vinculado.
          </p>
        ) : (
          <ul className="space-y-2">
            {interessados.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white p-2 text-sm"
              >
                <div>
                  <Link
                    href={`/app/tce/interessados/${i.gestor.id}`}
                    className="font-medium text-brand-navy hover:underline"
                  >
                    {i.gestor.nome}
                  </Link>
                  <p className="text-xs text-muted-foreground">{i.cargo}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:bg-red-50 hover:text-red-700"
                  onClick={() => remover(i.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Adicionar interessado
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar interessado</DialogTitle>
            <DialogDescription>
              Vincule um gestor como interessado neste processo com o cargo
              relevante.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Gestor</Label>
              <Select value={novoGestorId} onValueChange={setNovoGestorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o gestor" />
                </SelectTrigger>
                <SelectContent>
                  {gestores.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      [{g.tipoInteressado === "PESSOA_JURIDICA" ? "PJ" : "PF"}]{" "}
                      {g.nome}
                      {g.nomeFantasia ? ` (${g.nomeFantasia})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Cargo no processo</Label>
              <Input
                value={novoCargo}
                onChange={(e) => setNovoCargo(e.target.value)}
                placeholder="Ex.: Prefeito, Ordenador de despesas..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={adicionar}
              disabled={saving}
              className="bg-brand-navy hover:bg-brand-navy/90"
            >
              {saving ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
