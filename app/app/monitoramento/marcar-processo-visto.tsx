"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Marca como lido tudo o que nao foi lido de um processo (movimentos e publicacoes).
export function MarcarProcessoVisto({ processoId }: { processoId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);

  async function marcar() {
    setBusy(true);
    const res = await fetch("/api/monitoramento/marcar-lida", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ processoId }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string; atualizadas?: number };
    setBusy(false);
    if (!res.ok) {
      toast({ variant: "destructive", title: "Erro", description: json.error ?? "Tente novamente." });
      return;
    }
    toast({ title: `${json.atualizadas ?? 0} movimentos marcados como vistos` });
    router.refresh();
  }

  return (
    <Button size="sm" variant="outline" className="h-8" onClick={marcar} disabled={busy}>
      {busy ? "Marcando..." : "Marcar como visto"}
    </Button>
  );
}
