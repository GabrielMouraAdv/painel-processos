"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { TipoProcessoTce } from "@prisma/client";
import { CalendarClock, Check, ListChecks, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { diasUteisEntre } from "@/lib/dias-uteis";
import { cn } from "@/lib/utils";
import { EditPrazosTceDialog } from "@/components/tce/edit-prazos-tce-dialog";
import {
  PrazoTceForm,
  type AdvogadoOption,
  type PrazoTceInitial,
} from "@/components/tce/prazo-tce-form";

export type PrazoTceItem = {
  id: string;
  tipo: string;
  dataIntimacao: string;
  dataVencimento: string;
  diasUteis: number;
  prorrogavel: boolean;
  prorrogacaoPedida: boolean;
  dataProrrogacao: string | null;
  cumprido: boolean;
  observacoes: string | null;
  advogadoResp: { id: string; nome: string } | null;
};

function formatDate(d: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
    new Date(d),
  );
}

export function PrazosTceCardActions({
  processoId,
  processoTipo,
  prazos,
  advogados,
}: {
  processoId: string;
  processoTipo: TipoProcessoTce;
  prazos: PrazoTceItem[];
  advogados: AdvogadoOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editAllOpen, setEditAllOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [prorrogarConfirm, setProrrogarConfirm] =
    React.useState<PrazoTceItem | null>(null);
  const isCautelar = processoTipo === "MEDIDA_CAUTELAR";

  const prazosParaEdicao: PrazoTceInitial[] = React.useMemo(
    () =>
      prazos.map((p) => ({
        id: p.id,
        tipo: p.tipo,
        dataIntimacao: p.dataIntimacao,
        dataVencimento: p.dataVencimento,
        diasUteis: p.diasUteis,
        prorrogavel: p.prorrogavel,
        prorrogacaoPedida: p.prorrogacaoPedida,
        dataProrrogacao: p.dataProrrogacao,
        cumprido: p.cumprido,
        observacoes: p.observacoes,
        advogadoResp: p.advogadoResp,
      })),
    [prazos],
  );

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

  async function confirmarProrrogacao() {
    if (!prorrogarConfirm) return;
    const p = prorrogarConfirm;
    setBusy(p.id);
    try {
      const res = await fetch(`/api/tce/prazos/${p.id}/prorrogacao`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro ao pedir prorrogacao",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toast({ title: "Prorrogacao pedida — +15 dias uteis adicionados" });
      setProrrogarConfirm(null);
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
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCreateOpen(true)}
          >
            <CalendarClock className="mr-1.5 h-3.5 w-3.5" />
            Adicionar prazo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditAllOpen(true)}
            disabled={prazos.length === 0}
          >
            <ListChecks className="mr-1.5 h-3.5 w-3.5" />
            Editar prazos
          </Button>
        </div>
      </div>

      {prazos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem prazos registrados.</p>
      ) : (
        <ul className="space-y-2">
          {prazos.map((p) => {
            const dias = p.cumprido
              ? 0
              : diasUteisEntre(new Date(), new Date(p.dataVencimento));
            const cor = p.cumprido
              ? "bg-emerald-100 text-emerald-800"
              : dias < 0
                ? "bg-red-200 text-red-900"
                : dias <= 3
                  ? "bg-red-100 text-red-800"
                  : dias <= 7
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-slate-100 text-slate-700";
            const badgeLabel = p.cumprido
              ? "cumprido"
              : dias < 0
                ? `vencido ${-dias}d`
                : dias === 0
                  ? "hoje"
                  : `${dias}d uteis`;
            const podeProrrogar =
              !p.cumprido && !isCautelar && p.prorrogavel && !p.prorrogacaoPedida;
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
                    {(isCautelar || !p.prorrogavel) && (
                      <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-800">
                        improrrogavel
                      </span>
                    )}
                    {p.prorrogacaoPedida && (
                      <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-800">
                        prorrogacao pedida
                      </span>
                    )}
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
                  {podeProrrogar && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px]"
                      disabled={busy === p.id}
                      onClick={() => setProrrogarConfirm(p)}
                    >
                      Pedir prorrogacao
                    </Button>
                  )}
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo prazo TCE</DialogTitle>
            <DialogDescription>
              Informe a intimacao e o prazo em dias uteis.
            </DialogDescription>
          </DialogHeader>
          <PrazoTceForm
            mode="create"
            processoId={processoId}
            advogados={advogados}
            onSuccess={() => {
              setCreateOpen(false);
              router.refresh();
            }}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <EditPrazosTceDialog
        open={editAllOpen}
        onOpenChange={setEditAllOpen}
        prazos={prazosParaEdicao}
        advogados={advogados}
      />

      <Dialog
        open={!!prorrogarConfirm}
        onOpenChange={(o) => !o && setProrrogarConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pedir prorrogacao?</DialogTitle>
            <DialogDescription>
              {prorrogarConfirm
                ? `Serao adicionados 15 dias uteis ao vencimento do prazo "${prorrogarConfirm.tipo}". Esta acao so pode ser realizada uma vez.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setProrrogarConfirm(null)}
              disabled={prorrogarConfirm ? busy === prorrogarConfirm.id : false}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarProrrogacao}
              disabled={prorrogarConfirm ? busy === prorrogarConfirm.id : false}
              className="bg-brand-navy hover:bg-brand-navy/90"
            >
              {prorrogarConfirm && busy === prorrogarConfirm.id
                ? "Salvando..."
                : "Confirmar prorrogacao"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
