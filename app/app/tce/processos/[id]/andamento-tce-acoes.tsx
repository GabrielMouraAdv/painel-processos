"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { TipoProcessoTce } from "@prisma/client";
import { Pencil, Trash2 } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { diaDe } from "@/lib/datas";
import { faseTceLabel, fasesDoTipo } from "@/lib/tce-config";

type Props = {
  andamento: { id: string; data: string; fase: string; descricao: string };
  tipo: TipoProcessoTce;
};

// Botoes de editar e excluir de um andamento TCE (ficha do processo).
export function AndamentoTceAcoes({ andamento, tipo }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [aberto, setAberto] = React.useState(false);
  const [salvando, setSalvando] = React.useState(false);
  const [data, setData] = React.useState(diaDe(andamento.data));
  const [fase, setFase] = React.useState(andamento.fase);
  const [descricao, setDescricao] = React.useState(andamento.descricao);

  // Fases do fluxo + a fase atual do registro, se for uma fase especial
  // (julgamento, nota_tecnica, contrarrazoes_..._dispensadas etc.).
  const fases = React.useMemo(() => {
    const lista = fasesDoTipo(tipo).map((f) => ({ key: f.key, label: f.label }));
    if (!lista.some((f) => f.key === andamento.fase)) {
      lista.unshift({ key: andamento.fase, label: faseTceLabel(tipo, andamento.fase) });
    }
    return lista;
  }, [tipo, andamento.fase]);

  function abrir() {
    setData(diaDe(andamento.data));
    setFase(andamento.fase);
    setDescricao(andamento.descricao);
    setAberto(true);
  }

  async function salvar() {
    if (!data || !descricao.trim()) {
      toast({ variant: "destructive", title: "Data e descrição são obrigatórias" });
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch(`/api/tce/andamentos/${andamento.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, fase, descricao: descricao.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: "destructive", title: "Erro ao salvar", description: json.error ?? "Tente novamente." });
        return;
      }
      toast({ title: "Andamento atualizado" });
      setAberto(false);
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!window.confirm("Excluir este andamento? A exclusao fica registrada no Log de Auditoria.")) return;
    const res = await fetch(`/api/tce/andamentos/${andamento.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({ variant: "destructive", title: "Erro ao excluir", description: json.error ?? "Tente novamente." });
      return;
    }
    toast({ title: "Andamento excluído" });
    router.refresh();
  }

  return (
    <>
      <span className="ml-auto inline-flex gap-1">
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={abrir}>
          <Pencil className="mr-1 h-3 w-3" />
          Editar
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-slate-500 hover:text-red-700"
          onClick={excluir}
          aria-label="Excluir andamento"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </span>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar andamento</DialogTitle>
            <DialogDescription>A fase atual do processo não muda ao editar um andamento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
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
              <Label>Descrição</Label>
              <Textarea rows={4} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={salvar} disabled={salvando} className="bg-brand-navy hover:bg-brand-navy/90">
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
