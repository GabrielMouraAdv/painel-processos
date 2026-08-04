"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Props = {
  documentoId: string;
  nome: string;
};

export function ExcluirDocumentoButton({ documentoId, nome }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);

  async function excluir() {
    if (!window.confirm(`Excluir a peca "${nome}"?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/eleitoral/documentos/${documentoId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Falha ao excluir a peca");
      toast({ title: "Peca excluida" });
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
      title="Excluir peca"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
