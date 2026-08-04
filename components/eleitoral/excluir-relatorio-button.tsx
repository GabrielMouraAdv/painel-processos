"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Props = {
  relatorioId: string;
  titulo: string;
};

export function ExcluirRelatorioButton({ relatorioId, titulo }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);

  async function excluir() {
    if (!window.confirm(`Excluir o relatorio "${titulo}"?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/eleitoral/relatorios/${relatorioId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Falha ao excluir o relatorio");
      toast({ title: "Relatorio excluido" });
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
      onClick={excluir}
      disabled={busy}
      title="Excluir relatorio"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
