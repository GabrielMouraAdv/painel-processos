"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

import { BancaBadgeList } from "@/components/bancas/banca-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { BANCAS, bancaBadgeClasses } from "@/lib/bancas";
import { cn } from "@/lib/utils";

type Props = {
  processoId: string;
  initialBancas: string[];
};

export function BancasSection({ processoId, initialBancas }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [selecionados, setSelecionados] = React.useState<Set<string>>(
    new Set(initialBancas),
  );
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (open) setSelecionados(new Set(initialBancas));
  }, [open, initialBancas]);

  function toggle(slug: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  async function salvar() {
    setPending(true);
    try {
      const res = await fetch(`/api/processos/${processoId}/bancas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bancasSlug: Array.from(selecionados) }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast({
          variant: "destructive",
          title: "Erro ao atualizar bancas",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toast({ title: "Bancas atualizadas" });
      setOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="text-base">Bancas Patrocinadoras</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="h-8"
        >
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Editar Bancas
        </Button>
      </CardHeader>
      <CardContent>
        {initialBancas.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">
            Nenhuma banca vinculada. Clique em &quot;Editar Bancas&quot; para
            adicionar.
          </p>
        ) : (
          <BancaBadgeList slugs={initialBancas} size="md" />
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar bancas patrocinadoras</DialogTitle>
            <DialogDescription>
              Selecione uma ou mais bancas. Processos compartilhados podem ter
              mais de uma.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2 py-2">
            {BANCAS.map((b) => {
              const ativo = selecionados.has(b.slug);
              return (
                <button
                  key={b.slug}
                  type="button"
                  onClick={() => toggle(b.slug)}
                  aria-pressed={ativo}
                  className={cn(
                    "inline-flex flex-col items-start rounded-lg px-3 py-2 text-left text-xs ring-1 transition-colors",
                    ativo
                      ? bancaBadgeClasses(b.cor)
                      : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50",
                  )}
                >
                  <span className="font-semibold">{b.nome}</span>
                  {b.advogado && (
                    <span className="text-[10px] opacity-80">
                      {b.advogado}
                      {b.oab ? ` — ${b.oab}` : ""}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
