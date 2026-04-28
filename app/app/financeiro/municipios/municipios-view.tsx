"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StatusNota } from "@prisma/client";
import { Plus, Receipt } from "lucide-react";

import { BancaBadgeList } from "@/components/bancas/banca-badge";
import { BancaFilter } from "@/components/bancas/banca-filter";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ANOS_DISPONIVEIS,
  computeStatusNota,
  diasEmAtraso,
  formatBRL,
  NOMES_MESES,
  statusBgClass,
} from "@/lib/financeiro";
import { cn } from "@/lib/utils";

import { CadastrarContratoDialog } from "./cadastrar-contrato-dialog";
import { EditarNotaDialog, type NotaParaEditar } from "./editar-nota-dialog";

export type NotaCard = {
  id: string;
  mesReferencia: number;
  anoReferencia: number;
  valorNota: number;
  valorPago: number | null;
  dataVencimento: string;
  dataEmissao: string | null;
  dataPagamento: string | null;
  numeroNota: string | null;
  pago: boolean;
  observacoes: string | null;
};

export type ContratoCard = {
  id: string;
  municipio: { id: string; nome: string; uf: string } | null;
  bancasSlug: string[];
  valorMensal: number;
  dataInicio: string;
  dataFim: string | null;
  ativo: boolean;
  notas: NotaCard[];
};

type MunicipioOpt = { id: string; nome: string; uf: string };

type Props = {
  ano: number;
  cards: ContratoCard[];
  municipios: MunicipioOpt[];
};

export function MunicipiosFinanceiroView({ ano, cards, municipios }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [novoContratoOpen, setNovoContratoOpen] = React.useState(false);
  const [editingNota, setEditingNota] = React.useState<{
    nota: NotaParaEditar | null;
    contratoId: string;
    mes: number;
    ano: number;
    valorMensal: number;
  } | null>(null);

  function setAno(v: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("ano", v);
    router.push(`?${params.toString()}`, { scroll: false });
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Financeiro
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-brand-navy">
            Honorarios Municipais
          </h1>
          <p className="text-sm text-muted-foreground">
            Calendario anual de notas fiscais por contrato municipal.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setNovoContratoOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Cadastrar Contrato
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[140px] flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Ano</label>
            <Select value={String(ano)} onValueChange={setAno}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANOS_DISPONIVEIS.map((a) => (
                  <SelectItem key={a} value={String(a)}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <BancaFilter />
      </div>

      {cards.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center text-sm text-muted-foreground shadow-sm">
          <Receipt className="mx-auto mb-2 h-8 w-8 text-slate-400" />
          Nenhum contrato ativo para {ano} no recorte selecionado.
          <br />
          Use &quot;Cadastrar Contrato&quot; para criar.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <ContratoCardView
              key={c.id}
              ano={ano}
              card={c}
              hoje={hoje}
              onClickMes={(mes, nota) =>
                setEditingNota({
                  nota: nota
                    ? {
                        id: nota.id,
                        numeroNota: nota.numeroNota,
                        dataEmissao: nota.dataEmissao,
                        valorNota: nota.valorNota,
                        dataVencimento: nota.dataVencimento,
                        pago: nota.pago,
                        dataPagamento: nota.dataPagamento,
                        valorPago: nota.valorPago,
                        observacoes: nota.observacoes,
                      }
                    : null,
                  contratoId: c.id,
                  mes,
                  ano,
                  valorMensal: c.valorMensal,
                })
              }
            />
          ))}
        </div>
      )}

      <CadastrarContratoDialog
        open={novoContratoOpen}
        onOpenChange={setNovoContratoOpen}
        municipios={municipios}
        onSuccess={() => router.refresh()}
      />

      <EditarNotaDialog
        open={!!editingNota}
        onOpenChange={(o) => {
          if (!o) setEditingNota(null);
        }}
        contratoId={editingNota?.contratoId ?? ""}
        mes={editingNota?.mes ?? 1}
        ano={editingNota?.ano ?? ano}
        valorPadrao={editingNota?.valorMensal ?? 0}
        nota={editingNota?.nota ?? null}
        onSuccess={() => {
          setEditingNota(null);
          router.refresh();
        }}
      />
    </>
  );
}

type ContratoCardProps = {
  ano: number;
  card: ContratoCard;
  hoje: Date;
  onClickMes: (mes: number, nota: NotaCard | null) => void;
};

function ContratoCardView({ ano, card, hoje, onClickMes }: ContratoCardProps) {
  const notaPorMes = new Map<number, NotaCard>();
  for (const n of card.notas) notaPorMes.set(n.mesReferencia, n);

  let recebido = 0;
  let aberto = 0;
  let atraso = 0;
  for (let m = 1; m <= 12; m++) {
    const n = notaPorMes.get(m);
    if (!n) continue;
    const status = computeStatusNota(
      { pago: n.pago, dataVencimento: new Date(n.dataVencimento) },
      hoje,
    );
    if (status === StatusNota.PAGA) {
      recebido += n.valorPago ?? n.valorNota;
    } else if (status === StatusNota.A_VENCER) {
      aberto += n.valorNota;
    } else {
      atraso += n.valorNota;
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-brand-navy">
            {card.municipio?.nome ?? "—"}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            {card.municipio ? `${card.municipio.uf} • ` : ""}
            {formatBRL(card.valorMensal)}/mes
          </p>
        </div>
        <BancaBadgeList slugs={card.bancasSlug} size="sm" />
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {NOMES_MESES.map((label, idx) => {
          const mes = idx + 1;
          const nota = notaPorMes.get(mes) ?? null;
          let status: StatusNota | "SEM_NOTA" = "SEM_NOTA";
          if (nota) {
            status = computeStatusNota(
              { pago: nota.pago, dataVencimento: new Date(nota.dataVencimento) },
              hoje,
            );
          }
          const dias = nota
            ? diasEmAtraso(new Date(nota.dataVencimento), hoje)
            : 0;
          const title = nota
            ? `${label}/${ano} — ${formatBRL(nota.valorNota)}${
                status === StatusNota.PAGA
                  ? " (PAGA)"
                  : status === StatusNota.A_VENCER
                    ? " (a vencer)"
                    : ` (vencida ${dias}d)`
              }`
            : `${label}/${ano} — sem nota`;
          return (
            <button
              key={mes}
              type="button"
              onClick={() => onClickMes(mes, nota)}
              title={title}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded-md py-2 text-[10px] font-semibold transition-colors",
                statusBgClass(status),
              )}
            >
              <span>{label}</span>
              {nota && status !== StatusNota.PAGA && (
                <span className="text-[8px] opacity-90">
                  {nota.dataVencimento.slice(8, 10)}/{nota.dataVencimento.slice(5, 7)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2 border-t pt-2 text-[11px]">
        <div>
          <p className="text-muted-foreground">Recebido</p>
          <p className="font-semibold text-emerald-700">
            {formatBRL(recebido)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Em aberto</p>
          <p className="font-semibold text-amber-700">{formatBRL(aberto)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Em atraso</p>
          <p className="font-semibold text-red-700">{formatBRL(atraso)}</p>
        </div>
      </div>
    </div>
  );
}
