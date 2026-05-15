"use client";

import * as React from "react";
import { FileText, Newspaper } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type AlertaMonitoramentoDetalhe =
  | {
      tipo: "movimentacao";
      data: string;
      fonte: string;
      codigoMovimento: string | null;
      nomeMovimento: string;
      descricao: string | null;
      complementos: string | null;
      ehDecisao: boolean;
      processo?: { numero: string; tribunal: string };
    }
  | {
      tipo: "publicacao";
      data: string;
      dataDisponibilizacao: string | null;
      fonte: string;
      conteudo: string | null;
      caderno: string | null;
      pagina: string | null;
      geraIntimacao: boolean;
      processo?: { numero: string; tribunal: string };
    };

type Props = {
  detalhe: AlertaMonitoramentoDetalhe | null;
  onOpenChange: (open: boolean) => void;
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

function MetaLinha({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "" || value === "-") return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm text-slate-800">{value}</span>
    </div>
  );
}

export function AlertaMonitoramentoDialog({ detalhe, onOpenChange }: Props) {
  const open = detalhe !== null;
  const isMov = detalhe?.tipo === "movimentacao";
  const Icone = isMov ? FileText : Newspaper;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {detalhe && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full",
                    isMov
                      ? "bg-blue-100 text-blue-700"
                      : "bg-orange-100 text-orange-700",
                  )}
                  aria-hidden="true"
                >
                  <Icone className="h-4 w-4" />
                </span>
                {isMov ? "Movimentacao Datajud" : "Publicacao DJEN"}
              </DialogTitle>
              <DialogDescription>
                {formatDateTime(detalhe.data)}
                {detalhe.processo && (
                  <>
                    {" · "}
                    <span className="font-mono">{detalhe.processo.numero}</span>
                    {" · "}
                    {detalhe.processo.tribunal}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3">
              <MetaLinha label="Fonte" value={detalhe.fonte} />
              {isMov ? (
                <>
                  <MetaLinha
                    label="Codigo movimento"
                    value={detalhe.codigoMovimento}
                  />
                  {detalhe.ehDecisao && (
                    <div className="col-span-2">
                      <span className="inline-block rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                        Decisao detectada — verificar necessidade de recurso
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <MetaLinha
                    label="Disponibilizacao"
                    value={formatDateTime(detalhe.dataDisponibilizacao)}
                  />
                  <MetaLinha label="Caderno" value={detalhe.caderno} />
                  <MetaLinha label="Pagina" value={detalhe.pagina} />
                  {detalhe.geraIntimacao && (
                    <div className="col-span-2">
                      <span className="inline-block rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                        Intimacao detectada — pode gerar prazo
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="border-t pt-3">
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {isMov ? "Movimentacao" : "Extrato da publicacao"}
              </h4>
              {isMov ? (
                <div className="space-y-3 text-sm">
                  <p className="font-medium text-slate-900">
                    {detalhe.nomeMovimento}
                  </p>
                  {detalhe.descricao && (
                    <p className="whitespace-pre-wrap text-slate-700">
                      {detalhe.descricao}
                    </p>
                  )}
                  {detalhe.complementos && (
                    <div>
                      <h5 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Complementos
                      </h5>
                      <p className="whitespace-pre-wrap text-slate-700">
                        {detalhe.complementos}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm text-slate-800">
                  {detalhe.conteudo ??
                    "Sem texto disponivel — apenas o registro da publicacao foi capturado."}
                </p>
              )}
              <p className="mt-3 text-[11px] text-muted-foreground">
                Conteudo retornado pela API publica do CNJ ({detalhe.fonte}).
                Para o inteiro teor da peca, consulte os autos no sistema do
                tribunal.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
