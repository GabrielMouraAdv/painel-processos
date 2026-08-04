"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Props = {
  prazoId: string;
  cumprido: boolean;
};

export function PrazoAcoes({ prazoId, cumprido }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);

  async function toggleCumprido() {
    setBusy(true);
    try {
      const res = await fetch(`/api/eleitoral/prazos/${prazoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cumprido: !cumprido }),
      });
      if (!res.ok) throw new Error("Falha ao atualizar o prazo");
      toast({
        title: cumprido ? "Prazo reaberto" : "Prazo marcado como cumprido",
      });
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

  async function excluir() {
    if (!window.confirm("Excluir este prazo?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/eleitoral/prazos/${prazoId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Falha ao excluir o prazo");
      toast({ title: "Prazo excluido" });
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
    <div className="flex items-center gap-1">
      <Button
        type="button"
        size="sm"
        variant={cumprido ? "outline" : "default"}
        onClick={toggleCumprido}
        disabled={busy}
        title={cumprido ? "Reabrir prazo" : "Marcar como cumprido"}
      >
        {cumprido ? (
          <Undo2 className="h-3.5 w-3.5" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={excluir}
        disabled={busy}
        title="Excluir prazo"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
