"use client";

import Link from "next/link";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Detalhe de um item da faixa "Semana" do Inicio: o chip (mesmo visual de antes)
// abre um painel com o nome completo, data, tipo, situacao, advogado e processo.

export type DetalheFaixa = {
  titulo: string;
  tipo: string;
  data: string;
  hora?: string | null;
  status: string;
  statusClasse: string;
  advogado?: string | null;
  processo?: { numero: string; contexto?: string | null; href: string } | null;
  linhas?: { rotulo: string; valor: string }[];
  outroLink?: { texto: string; href: string } | null;
};

function Corpo({ d }: { d: DetalheFaixa }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-accent px-2.5 py-0.5 text-[12px] font-medium text-brand-navy">{d.tipo}</span>
        <span className={cn("rounded-full px-2.5 py-0.5 text-[12px] font-medium", d.statusClasse)}>{d.status}</span>
      </div>
      <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-1.5">
        <dt className="text-muted-foreground">Data</dt>
        <dd className="font-medium">{d.data}{d.hora ? ` · ${d.hora}` : ""}</dd>
        {d.advogado && (
          <>
            <dt className="text-muted-foreground">Responsável</dt>
            <dd>{d.advogado}</dd>
          </>
        )}
        <dt className="text-muted-foreground">Processo</dt>
        <dd className="min-w-0 break-words">
          {d.processo ? (
            <>
              <span className="font-mono text-[13px]">{d.processo.numero}</span>
              {d.processo.contexto && <span className="block text-[12.5px] text-muted-foreground">{d.processo.contexto}</span>}
            </>
          ) : (
            <span className="text-muted-foreground">sem processo vinculado</span>
          )}
        </dd>
        {d.linhas?.map((l) => (
          <Fragmento key={l.rotulo} rotulo={l.rotulo} valor={l.valor} />
        ))}
      </dl>
      <div className="flex flex-wrap gap-2 pt-1">
        {d.processo && (
          <Link href={d.processo.href} className="rounded-md bg-brand-navy px-3 py-2 text-[13px] font-medium text-white hover:opacity-90">
            Abrir processo →
          </Link>
        )}
        {d.outroLink && (
          <Link href={d.outroLink.href} className="rounded-md border px-3 py-2 text-[13px] font-medium text-brand-navy hover:bg-accent">
            {d.outroLink.texto}
          </Link>
        )}
      </div>
    </div>
  );
}

function Fragmento({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="min-w-0 whitespace-pre-line break-words">{valor}</dd>
    </>
  );
}

const conteudo = "w-[calc(100vw-1.5rem)] max-w-md gap-3 rounded-xl p-5 sm:rounded-xl";

export function SemanaItem({ texto, classe, detalhe }: { texto: string; classe: string; detalhe: DetalheFaixa }) {
  return (
    <Dialog>
      <DialogTrigger
        className={cn("block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] leading-tight", classe)}
        title={`${detalhe.tipo} · ${detalhe.titulo}`}
      >
        {texto}
      </DialogTrigger>
      <DialogContent className={conteudo}>
        <DialogHeader className="pr-6 text-left">
          <DialogTitle className="text-base leading-snug">{detalhe.titulo}</DialogTitle>
          <DialogDescription className="sr-only">Detalhe do item da semana</DialogDescription>
        </DialogHeader>
        <Corpo d={detalhe} />
      </DialogContent>
    </Dialog>
  );
}

// "+N" de um dia com mais de tres itens: abre a lista completa do dia.
export function SemanaMais({ itens, dia }: { itens: { texto: string; classe: string; detalhe: DetalheFaixa }[]; dia: string }) {
  return (
    <Dialog>
      <DialogTrigger className="block w-full text-center text-[10.5px] text-muted-foreground hover:text-brand-navy hover:underline">
        +{itens.length}
      </DialogTrigger>
      <DialogContent className={conteudo}>
        <DialogHeader className="pr-6 text-left">
          <DialogTitle className="text-base">Mais itens · {dia}</DialogTitle>
          <DialogDescription className="sr-only">Demais prazos e compromissos do dia</DialogDescription>
        </DialogHeader>
        <div className="divide-y">
          {itens.map((it, k) => (
            <div key={k} className="space-y-2 py-3 first:pt-0">
              <p className="font-semibold leading-snug">{it.detalhe.titulo}</p>
              <Corpo d={it.detalhe} />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
