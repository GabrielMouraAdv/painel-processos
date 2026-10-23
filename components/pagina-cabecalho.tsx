import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// Cabecalho padrao das telas (Direcao A, revisto em 22/10/2026 no Inicio):
// faixa azul-marinho com a secao em caixa alta, o titulo em serifa, uma linha
// de descricao e, opcionalmente, numeros clicaveis e acoes a direita.
//
//   <PaginaCabecalho
//     secao="Tribunal de Contas"
//     titulo="Processos"
//     descricao="876 processos cadastrados."
//     indicadores={[{ n: 12, t: "prazos abertos", href: "/app/tce/prazos" }]}
//     acoes={<NovoProcessoTceButton ... />}
//   />

export type IndicadorCabecalho = {
  n: number | string;
  t: string;
  href?: string;
  // Numero em vermelho claro (ex.: vencidos sem baixa > 0).
  alerta?: boolean;
};

export function PaginaCabecalho({
  secao,
  titulo,
  descricao,
  indicadores,
  acoes,
  compacto = false,
  className,
}: {
  secao?: string;
  titulo: ReactNode;
  descricao?: ReactNode;
  indicadores?: IndicadorCabecalho[];
  // Botoes e filtros a direita; ficam brancos sobre a faixa.
  acoes?: ReactNode;
  // Faixa mais baixa, para telas de lista e cadastro.
  compacto?: boolean;
  className?: string;
}) {
  const tiles = indicadores?.filter((i) => i != null) ?? [];
  return (
    <header
      className={cn(
        "relative overflow-hidden rounded-2xl bg-brand-navy text-white shadow-sm",
        compacto ? "px-5 py-4 md:px-7" : "px-6 py-6 md:px-8",
        className,
      )}
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/[0.06]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-36 right-40 h-72 w-72 rounded-full bg-white/[0.05]" />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {secao && <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/60">{secao}</p>}
          <h1 className={cn("mt-1 font-semibold leading-tight text-white", compacto ? "text-2xl md:text-3xl" : "text-3xl md:text-4xl")}>
            {titulo}
          </h1>
          {descricao && <p className={cn("mt-2 text-white/75", compacto ? "text-sm" : "text-[15px]")}>{descricao}</p>}
        </div>
        {acoes && (
          <div
            className={cn(
              "flex shrink-0 flex-wrap items-center gap-2",
              // Botoes e links-botao brancos sobre o marinho (os de dentro de dialogos nao sao afetados).
              "[&_button]:bg-white [&_button]:text-brand-navy [&_button:hover]:bg-white/90",
              "[&_a.inline-flex]:bg-white [&_a.inline-flex]:text-brand-navy [&_a.inline-flex:hover]:bg-white/90",
              "[&_button]:border-transparent [&_a.inline-flex]:border-transparent",
            )}
          >
            {acoes}
          </div>
        )}
      </div>
      {tiles.length > 0 && (
        <div className={cn("relative mt-5 grid grid-cols-2 gap-3", tiles.length >= 4 ? "sm:grid-cols-4" : tiles.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 md:max-w-lg")}>
          {tiles.map((i) => {
            const conteudo = (
              <>
                <span className={cn("block font-mono text-2xl font-medium leading-none", i.alerta && "text-red-200")}>{i.n}</span>
                <span className="mt-1.5 block text-[12px] leading-snug text-white/75">{i.t}</span>
              </>
            );
            const classe = "rounded-xl bg-white/10 px-4 py-3 transition-colors hover:bg-white/[0.16]";
            return i.href ? (
              i.href.startsWith("#") ? (
                <a key={i.t} href={i.href} className={classe}>{conteudo}</a>
              ) : (
                <Link key={i.t} href={i.href} className={classe}>{conteudo}</Link>
              )
            ) : (
              <div key={i.t} className="rounded-xl bg-white/10 px-4 py-3">{conteudo}</div>
            );
          })}
        </div>
      )}
    </header>
  );
}
