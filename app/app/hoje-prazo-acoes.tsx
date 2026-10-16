"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Baixa rapida de prazo vencido no Inicio: "Cumprido" marca como cumprido;
// "Perdido" encerra o prazo (dispensa) registrando o motivo.
export function HojePrazoAcoes({
  prazoId,
  escopo,
  usuarioId,
}: {
  prazoId: string;
  escopo: "tce" | "judicial";
  usuarioId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const api = escopo === "tce" ? "/api/tce/pendencias" : "/api/pendencias";

  async function enviar(body: Record<string, unknown>, ok: string) {
    setBusy(true);
    const res = await fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      toast({ variant: "destructive", title: "Erro", description: json.error ?? "Tente novamente." });
      return;
    }
    toast({ title: ok });
    router.refresh();
  }

  return (
    <span className="inline-flex gap-1.5">
      <Button
        size="sm"
        variant="outline"
        className="h-8"
        disabled={busy}
        onClick={() => enviar({ acao: "prazo_cumprido", prazoId }, "Prazo marcado como cumprido")}
      >
        Cumprido
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-8"
        disabled={busy}
        onClick={() => {
          if (!window.confirm("Encerrar este prazo como perdido? Ele sai da lista de vencidos e o motivo fica registrado.")) return;
          enviar(
            { acao: "dispensar_prazo", prazoId, advogadoId: usuarioId, motivo: "Prazo encerrado como perdido (sem cumprimento)." },
            "Prazo encerrado como perdido",
          );
        }}
      >
        Perdido
      </Button>
    </span>
  );
}
