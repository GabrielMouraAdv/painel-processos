"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Props = {
  processoId: string;
  numero: string;
};

export function ExcluirProcessoButton({ processoId, numero }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);

  async function excluir() {
    if (
      !window.confirm(
        `Excluir o processo ${numero}? Prazos e movimentos serao removidos juntos.`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/eleitoral/processos/${processoId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Falha ao excluir o processo");
      toast({ title: "Processo excluido" });
      router.push("/app/eleitoral/processos");
      router.refresh();
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={excluir} disabled={busy}>
      <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
      Excluir
    </Button>
  );
}
