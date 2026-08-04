"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Props = {
  processoId: string;
};

export function AtualizarMovimentosButton({ processoId }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);

  async function atualizar() {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/eleitoral/processos/${processoId}/movimentos`,
        { method: "POST" },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error ?? "Falha ao consultar o Datajud");
      }
      toast({
        title:
          json.novos > 0
            ? `${json.novos} movimento(s) novo(s)`
            : "Nenhum movimento novo",
        description: `Total de movimentos no TRE-PE: ${json.total}`,
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

  return (
    <Button type="button" variant="outline" onClick={atualizar} disabled={busy}>
      <RefreshCw
        className={`mr-2 h-4 w-4 ${busy ? "animate-spin" : ""}`}
        aria-hidden="true"
      />
      {busy ? "Consultando..." : "Atualizar movimentos"}
    </Button>
  );
}
