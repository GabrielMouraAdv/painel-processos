"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { TipoProcesso } from "@prisma/client";
import { Gavel, Loader2, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JulgamentoDialog } from "@/components/julgamento-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  classeBadgeResultado,
  classificarResultadoJud,
} from "@/lib/julgamento-config";
import { cn } from "@/lib/utils";

function fmtBRL(v: number | null | undefined): string {
  if (v === null || v === undefined) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(v);
}

export function JulgamentoCardJud({
  processoId,
  tipo,
  julgamento,
}: {
  processoId: string;
  tipo: TipoProcesso;
  julgamento: {
    julgado: boolean;
    dataJulgamento: string | null;
    resultadoJulgamento: string | null;
    penalidade: string | null;
    valorCondenacao: number | null;
    observacoesJulgamento: string | null;
  };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const j = julgamento;
  const classificacao = classificarResultadoJud(tipo, j.resultadoJulgamento);

  const corCard = !j.julgado
    ? "border-slate-200 bg-slate-50"
    : classificacao === "favoravel"
      ? "border-emerald-300 bg-emerald-50"
      : classificacao === "desfavoravel"
        ? "border-red-300 bg-red-50"
        : classificacao === "parcial"
          ? "border-yellow-300 bg-yellow-50"
          : "border-slate-300 bg-slate-100";

  async function desfazer() {
    setBusy(true);
    try {
      const res = await fetch("/api/pendencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "desfazer_julgamento", processoId }),
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
      toast({ title: "Julgamento desfeito" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card id="card-julgamento" className={cn("scroll-mt-24 border", corCard)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gavel className="h-4 w-4" />
          Resultado do Julgamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!j.julgado && (
          <>
            <p className="text-sm text-slate-600">Processo ainda nao julgado</p>
            <Button
              size="sm"
              className="bg-brand-navy hover:bg-brand-navy/90"
              onClick={() => setOpen(true)}
              disabled={busy}
            >
              <Gavel className="mr-1 h-3.5 w-3.5" />
              Registrar Julgamento
            </Button>
          </>
        )}

        {j.julgado && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold uppercase tracking-wide",
                    classeBadgeResultado(classificacao),
                  )}
                >
                  {j.resultadoJulgamento}
                </span>
                {j.dataJulgamento && (
                  <p className="text-xs text-muted-foreground">
                    Julgado em{" "}
                    {new Date(j.dataJulgamento).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(true)}
                  disabled={busy}
                >
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  onClick={desfazer}
                  disabled={busy}
                >
                  {busy ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Desfazer
                </Button>
              </div>
            </div>

            {(j.penalidade || j.valorCondenacao) && (
              <div className="rounded-md border bg-white px-3 py-2 text-xs">
                {j.penalidade && (
                  <p>
                    <span className="font-semibold text-slate-700">
                      Penalidade:
                    </span>{" "}
                    {j.penalidade}
                  </p>
                )}
                {j.valorCondenacao != null && (
                  <p>
                    <span className="font-semibold text-slate-700">
                      Valor da condenacao:
                    </span>{" "}
                    {fmtBRL(j.valorCondenacao)}
                  </p>
                )}
              </div>
            )}

            {j.observacoesJulgamento && (
              <div className="rounded-md border bg-white px-3 py-2 text-xs">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Observacoes
                </p>
                <p className="mt-1 whitespace-pre-wrap text-slate-700">
                  {j.observacoesJulgamento}
                </p>
              </div>
            )}
          </>
        )}

        <JulgamentoDialog
          open={open}
          onOpenChange={setOpen}
          escopo="judicial"
          processoId={processoId}
          tipo={tipo}
          initial={
            j.julgado
              ? {
                  dataJulgamento: j.dataJulgamento,
                  resultadoJulgamento: j.resultadoJulgamento,
                  penalidade: j.penalidade,
                  valorMulta: null,
                  valorDevolucao: null,
                  valorCondenacao: j.valorCondenacao,
                  observacoesJulgamento: j.observacoesJulgamento,
                }
              : null
          }
        />
      </CardContent>
    </Card>
  );
}
