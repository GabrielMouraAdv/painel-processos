"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { PrazoForm, type AdvogadoOption, type PrazoInitial } from "./prazo-form";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prazos: PrazoInitial[];
  advogados: AdvogadoOption[];
  title?: string;
};

function formatDate(d: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(d));
}

export function EditPrazosDialog({
  open,
  onOpenChange,
  prazos,
  advogados,
  title = "Editar prazos",
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setExpandedId(null);
      setDeleteId(null);
    }
  }, [open]);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/prazos/${deleteId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast({
          variant: "destructive",
          title: "Erro ao excluir prazo",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toast({ title: "Prazo excluido" });
      setDeleteId(null);
      setExpandedId((current) => (current === deleteId ? null : current));
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Edite ou remova prazos ja cadastrados. As alteracoes sao salvas individualmente.
            </DialogDescription>
          </DialogHeader>

          {prazos.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum prazo cadastrado.
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {prazos.map((p) => {
                const isExpanded = expandedId === p.id;
                return (
                  <li key={p.id} className={cn("p-3", isExpanded && "bg-slate-50")}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-brand-navy">
                          {p.tipo}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(p.data)}
                          {p.hora ? ` as ${p.hora}` : ""}
                          {p.advogadoRedator ? ` — ${p.advogadoRedator.nome}` : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setExpandedId((id) => (id === p.id ? null : p.id!))
                          }
                        >
                          {isExpanded ? (
                            <>
                              <X className="mr-1 h-3.5 w-3.5" /> Fechar
                            </>
                          ) : (
                            <>
                              <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-700 hover:bg-red-50 hover:text-red-800"
                          onClick={() => setDeleteId(p.id!)}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" /> Excluir
                        </Button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
                        <PrazoForm
                          mode="edit"
                          prazo={p}
                          advogados={advogados}
                          onSuccess={() => {
                            setExpandedId(null);
                            router.refresh();
                          }}
                          onCancel={() => setExpandedId(null)}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir prazo?</DialogTitle>
            <DialogDescription>
              Esta acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteId(null)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Excluindo..." : "Confirmar exclusao"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
