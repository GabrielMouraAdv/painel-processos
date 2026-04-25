"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type DispensaInfo = {
  por: string;
  em: string; // ISO
  motivo: string | null;
};

export function DispensaBadgesTce({
  processoId,
  memorial,
  despacho,
  apiPath = "/api/tce/pendencias",
}: {
  processoId: string;
  memorial: DispensaInfo | null;
  despacho: DispensaInfo | null;
  apiPath?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState<"memorial" | "despacho" | null>(null);

  if (!memorial && !despacho) return null;

  async function reverter(modo: "memorial" | "despacho") {
    setBusy(modo);
    try {
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao:
            modo === "memorial"
              ? "reverter_dispensa_memorial"
              : "reverter_dispensa_despacho",
          processoId,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toast({ title: "Dispensa revertida" });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  function fmt(iso: string): string {
    return new Date(iso).toLocaleDateString("pt-BR");
  }

  return (
    <div className="flex flex-col gap-2">
      {memorial && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-300 bg-slate-100 px-3 py-2">
          <div className="flex items-start gap-2">
            <Ban className="mt-0.5 h-4 w-4 text-slate-600" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
                Memorial dispensado por {memorial.por} em {fmt(memorial.em)}
              </p>
              {memorial.motivo && (
                <p className="text-xs text-slate-600">
                  Motivo: {memorial.motivo}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => reverter("memorial")}
            disabled={busy !== null}
          >
            {busy === "memorial" ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
            )}
            Reverter Dispensa
          </Button>
        </div>
      )}
      {despacho && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-300 bg-slate-100 px-3 py-2">
          <div className="flex items-start gap-2">
            <Ban className="mt-0.5 h-4 w-4 text-slate-600" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
                Despacho dispensado por {despacho.por} em {fmt(despacho.em)}
              </p>
              {despacho.motivo && (
                <p className="text-xs text-slate-600">
                  Motivo: {despacho.motivo}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => reverter("despacho")}
            disabled={busy !== null}
          >
            {busy === "despacho" ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
            )}
            Reverter Dispensa
          </Button>
        </div>
      )}
    </div>
  );
}
