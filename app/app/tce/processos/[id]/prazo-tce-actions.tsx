"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { PrazoTceFormDialog } from "./prazo-tce-form";

export type PrazoTceItem = {
  id: string;
  tipo: string;
  dataIntimacao: string;
  dataVencimento: string;
  diasUteis: number;
  prorrogavel: boolean;
  cumprido: boolean;
  observacoes: string | null;
  advogadoResp: { id: string; nome: string } | null;
};

export type AdvogadoOption = { id: string; nome: string };

function formatDate(d: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(d));
}

function diasUteisRestantes(ate: string): number {
  const a = new Date();
  a.setHours(0, 0, 0, 0);
  const b = new Date(ate);
  b.setHours(0, 0, 0, 0);
  const sinal = b.getTime() < a.getTime() ? -1 : 1;
  const inicio = sinal === 1 ? a : b;
  const fim = sinal === 1 ? b : a;
  let dias = 0;
  const cursor = new Date(inicio);
  while (cursor.getTime() < fim.getTime()) {
    cursor.setDate(cursor.getDate() + 1);
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) dias++;
  }
  return dias * sinal;
}

export function PrazosTceCardActions({
  processoId,
  prazos,
  advogados,
}: {
  processoId: string;
  prazos: PrazoTceItem[];
  advogados: AdvogadoOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);

  async function toggleCumprido(p: PrazoTceItem) {
    setBusy(p.id);
    try {
      const res = await fetch(`/api/tce/prazos/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cumprido: !p.cumprido }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast({
          variant: "destructive",
          title: "Erro",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toast({ title: p.cumprido ? "Prazo reaberto" : "Prazo cumprido" });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function excluir(p: PrazoTceItem) {
    if (!window.confirm(`Excluir prazo ${p.tipo}?`)) return;
    setBusy(p.id);
    try {
      const res = await fetch(`/api/tce/prazos/${p.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast({ variant: "destructive", title: "Erro ao excluir" });
        return;
      }
      toast({ title: "Prazo excluido" });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {prazos.length} prazo{prazos.length === 1 ? "" : "s"} registrado
          {prazos.length === 1 ? "" : "s"}.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
        >
          <CalendarClock className="mr-1.5 h-3.5 w-3.5" />
          Adicionar prazo
        </Button>
      </div>

      {prazos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sem prazos registrados.
        </p>
      ) : (
        <ul className="space-y-2">
          {prazos.map((p) => {
            const dias = p.cumprido ? 0 : diasUteisRestantes(p.dataVencimento);
            const cor = p.cumprido
              ? "bg-emerald-100 text-emerald-800"
              : dias < 0
                ? "bg-red-200 text-red-900"
                : dias <= 7
                  ? "bg-red-100 text-red-800"
                  : dias <= 15
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-slate-100 text-slate-700";
            const badgeLabel = p.cumprido
              ? "cumprido"
              : dias < 0
                ? `vencido ${-dias}d`
                : dias === 0
                  ? "hoje"
                  : `${dias}d uteis`;
            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm"
              >
                <div className="flex flex-1 flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-brand-navy">{p.tipo}</span>
                    {p.advogadoResp ? (
                      <span className="inline-flex items-center rounded-full bg-brand-navy/10 px-2 py-0.5 text-[11px] font-semibold text-brand-navy">
                        {p.advogadoResp.nome}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        sem responsavel
                      </span>
                    )}
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        cor,
                      )}
                    >
                      {badgeLabel}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {p.prorrogavel ? "prorrogavel" : "improrrogavel"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Intimacao {formatDate(p.dataIntimacao)} • vencimento{" "}
                    {formatDate(p.dataVencimento)} • {p.diasUteis} dias uteis
                  </span>
                  {p.observacoes && (
                    <span className="text-xs text-slate-600">{p.observacoes}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={busy === p.id}
                    onClick={() => toggleCumprido(p)}
                    title={p.cumprido ? "Reabrir" : "Marcar como cumprido"}
                  >
                    <Check
                      className={cn(
                        "h-3.5 w-3.5",
                        p.cumprido ? "text-emerald-600" : "text-muted-foreground",
                      )}
                    />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:bg-red-50 hover:text-red-700"
                    disabled={busy === p.id}
                    onClick={() => excluir(p)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <PrazoTceFormDialog
        processoId={processoId}
        advogados={advogados}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}
