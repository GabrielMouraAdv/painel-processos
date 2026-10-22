import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { NumeroProcesso } from "@/components/numero-processo";
import { authOptions } from "@/lib/auth";
import { diaDe } from "@/lib/datas";
import { FONTE_DJEN_OAB, resumoDe } from "@/lib/djen-oab";
import { datajudParadoHa, datajudUltimaAtualizacao } from "@/lib/monitoramento-verificar";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

import { MarcarProcessoVisto } from "./marcar-processo-visto";

// Novidades (Direcao A): um cartao por processo com algo nao lido, em vez de
// milhares de alertas soltos. Decisoes, audiencias e prazos vem primeiro; o
// resto (peticoes, juntadas, expedicoes) so aparece em "Tudo".
// A lista completa e as configuracoes ficam em /app/monitoramento/completo.

const IMPORTANTE: [RegExp, string][] = [
  [/senten|ac[oó]rd[aã]o|decis|provimento|m[eé]rito|julgament|liminar|tutela|homolog/i, "Decisão"],
  [/audi[eê]ncia|sess[aã]o|pauta|adiad/i, "Audiência"],
  [/intima|cita[cç]|tr[aâ]nsito/i, "Prazo"],
];
// "Decurso de prazo" e rotina (so informa que um prazo correu): fica em "Tudo".
const etiqueta = (t: string) => (/decurso/i.test(t) ? null : IMPORTANTE.find(([re]) => re.test(t))?.[1] ?? null);
// dd/mm no ano corrente; dd/mm/aa nos anteriores.
const ANO = new Date().getFullYear().toString();
const br = (d: Date) => {
  const [a, m, dd] = diaDe(d).split("-");
  return a === ANO ? `${dd}/${m}` : `${dd}/${m}/${a.slice(2)}`;
};

export default async function NovidadesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const escritorioId = session.user.escritorioId;
  const tudo = searchParams.filtro === "tudo";

  // Intimacoes trazidas pela varredura do DJEN por OAB (fonte primaria):
  // ultimos 14 dias, em destaque acima dos movimentos do Datajud.
  const desde14 = new Date(Date.now() - 14 * 86_400_000);
  const [gruposMov, gruposPub, intimacoes, datajudUltima] = await Promise.all([
    prisma.movimentacaoAutomatica.groupBy({
      by: ["processoId"],
      where: { lida: false, processo: { escritorioId } },
      _count: { _all: true },
      _max: { dataMovimento: true },
    }),
    prisma.publicacaoDJEN.groupBy({
      by: ["processoId"],
      where: { lida: false, processo: { escritorioId } },
      _count: { _all: true },
      _max: { dataPublicacao: true },
    }),
    prisma.publicacaoDJEN.findMany({
      where: { fonte: FONTE_DJEN_OAB, dataPublicacao: { gte: desde14 }, processo: { escritorioId } },
      orderBy: [{ dataPublicacao: "desc" }, { createdAt: "desc" }],
      take: 60,
      select: {
        id: true, dataPublicacao: true, conteudo: true, lida: true, tipoComunicacao: true, linkOficial: true, caderno: true,
        processo: { select: { id: true, numero: true, tribunal: true, gestor: { select: { nome: true } } } },
      },
    }),
    datajudUltimaAtualizacao(escritorioId),
  ]);
  const datajudParado = datajudParadoHa(datajudUltima);
  const intimacoesNaoLidas = intimacoes.filter((i) => !i.lida).length;

  const resumo = new Map<string, { n: number; ultima: Date }>();
  for (const g of gruposMov) resumo.set(g.processoId, { n: g._count._all, ultima: g._max.dataMovimento! });
  for (const g of gruposPub) {
    const a = resumo.get(g.processoId);
    const d = g._max.dataPublicacao!;
    resumo.set(g.processoId, { n: (a?.n ?? 0) + g._count._all, ultima: a && a.ultima > d ? a.ultima : d });
  }
  const totalMovimentos = Array.from(resumo.values()).reduce((s, r) => s + r.n, 0);

  const processos = resumo.size
    ? await prisma.processo.findMany({
        where: { id: { in: Array.from(resumo.keys()) } },
        select: {
          id: true, numero: true, tribunal: true, tipo: true,
          gestor: { select: { nome: true } },
          movimentacoesAuto: { where: { lida: false }, orderBy: { dataMovimento: "desc" }, take: 40, select: { nomeMovimento: true, dataMovimento: true } },
          publicacoesDjen: { where: { lida: false }, orderBy: { dataPublicacao: "desc" }, take: 5, select: { dataPublicacao: true } },
        },
      })
    : [];

  const cartoes = processos
    .map((p) => {
      // Agrupa movimentos repetidos (mesmo nome no mesmo dia) e marca os importantes.
      const vistos = new Map<string, { dia: string; texto: string; tag: string | null; n: number }>();
      for (const m of p.movimentacoesAuto) {
        const k = `${diaDe(m.dataMovimento)}|${m.nomeMovimento}`;
        const atual = vistos.get(k);
        if (atual) atual.n++;
        else vistos.set(k, { dia: br(m.dataMovimento), texto: m.nomeMovimento, tag: etiqueta(m.nomeMovimento), n: 1 });
      }
      if (p.publicacoesDjen.length) {
        vistos.set(`pub`, { dia: br(p.publicacoesDjen[0].dataPublicacao), texto: "Publicação no DJEN", tag: "Publicação", n: p.publicacoesDjen.length });
      }
      const movs = Array.from(vistos.values());
      const importantes = movs.filter((m) => m.tag);
      return { p, r: resumo.get(p.id)!, movs, temImportante: importantes.length > 0 };
    })
    .filter((c) => tudo || c.temImportante)
    .sort((a, b) => b.r.ultima.getTime() - a.r.ultima.getTime());

  const semImportante = processos.length - cartoes.length;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 md:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Judicial · Datajud e DJEN</p>
          <h1 className="mt-1 text-3xl font-semibold text-brand-tinta md:text-4xl">Novidades</h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Um cartão por processo. &quot;Marcar como visto&quot; limpa todos os movimentos dele de uma vez.
          </p>
        </div>
        <div className="inline-flex overflow-hidden rounded-lg border bg-white" role="group" aria-label="Filtrar movimentos">
          <Link href="/app/monitoramento" className={cn("px-4 py-2 text-sm", !tudo ? "bg-brand-navy text-white" : "text-muted-foreground hover:bg-background")}>
            Decisões, audiências e prazos
          </Link>
          <Link href="/app/monitoramento?filtro=tudo" className={cn("px-4 py-2 text-sm", tudo ? "bg-brand-navy text-white" : "text-muted-foreground hover:bg-background")}>
            Tudo
          </Link>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-6 rounded-xl border bg-white px-5 py-4">
        <div>
          <div className="font-mono text-2xl font-medium leading-none">{totalMovimentos.toLocaleString("pt-BR")}</div>
          <div className="text-[13px] text-muted-foreground">movimentos não lidos</div>
        </div>
        <span className="text-muted-foreground" aria-hidden="true">→</span>
        <div>
          <div className="font-mono text-2xl font-medium leading-none text-brand-navy">{processos.length}</div>
          <div className="text-[13px] text-muted-foreground">processos para olhar</div>
        </div>
        <p className="min-w-[220px] flex-1 text-[13px] text-muted-foreground">
          {!tudo && semImportante > 0
            ? `${semImportante} ${semImportante === 1 ? "processo tem" : "processos têm"} só movimentos de rotina e ${semImportante === 1 ? "aparece" : "aparecem"} em “Tudo”.`
            : "Petições, juntadas e expedições continuam registradas."}
        </p>
        <Link href="/app/monitoramento/completo" className="text-[13px] font-medium text-brand-navy hover:underline">
          Lista completa e configurações →
        </Link>
      </div>

      {/* ------------------------------------------------ intimacoes DJEN por OAB */}
      <section className="rounded-xl border border-brand-navy/30 bg-white" aria-labelledby="intim">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pb-2 pt-4">
          <h2 id="intim" className="text-xl font-semibold">
            Intimações do DJEN
            {intimacoesNaoLidas > 0 && <span className="ml-2 font-mono text-sm font-semibold text-brand-navy">{intimacoesNaoLidas} não {intimacoesNaoLidas === 1 ? "lida" : "lidas"}</span>}
          </h2>
          <span className="text-[13px] text-muted-foreground">últimos 14 dias · publicadas em nome dos advogados do escritório</span>
        </div>
        {intimacoes.length === 0 && (
          <p className="border-t px-5 py-4 text-sm text-muted-foreground">Nenhuma intimação publicada nos últimos 14 dias para os processos cadastrados.</p>
        )}
        {intimacoes.map((i) => (
          <div key={i.id} className={cn("grid gap-3 border-t px-5 py-3 md:grid-cols-[62px_minmax(220px,1fr)_minmax(280px,1.6fr)_auto]", i.lida && "text-muted-foreground")}>
            <span className="font-mono text-xs text-muted-foreground">{br(i.dataPublicacao)}</span>
            <div className="min-w-0">
              <Link href={`/app/processos/${i.processo.id}`} className="hover:underline">
                <NumeroProcesso numero={i.processo.numero} />
              </Link>
              <span className="ml-2 rounded border px-1 font-mono text-[11px] text-muted-foreground">{i.processo.tribunal}</span>
              <div className={cn("mt-0.5 text-[13px]", !i.lida && "font-semibold text-foreground")}>{i.processo.gestor?.nome ?? "—"}</div>
              {i.caderno && <div className="truncate text-[12px] text-muted-foreground">{i.caderno}</div>}
            </div>
            <div className="min-w-0 text-sm">
              {!i.lida && <span className="mr-2 rounded bg-brand-navy px-1.5 text-[11px] font-semibold uppercase tracking-wide text-white">{i.tipoComunicacao || "Intimação"}</span>}
              {i.lida && i.tipoComunicacao && <span className="mr-2 text-[11px] uppercase tracking-wide">{i.tipoComunicacao}</span>}
              <span>{resumoDe(i.conteudo ?? "", 260)}</span>
            </div>
            <div className="flex flex-wrap items-start justify-end gap-2">
              {i.linkOficial && (
                <a href={i.linkOficial} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center rounded-md border px-3 text-[13px] hover:bg-background">
                  Ver no tribunal
                </a>
              )}
              {!i.lida && <MarcarProcessoVisto processoId={i.processo.id} />}
            </div>
          </div>
        ))}
        {datajudParado != null && datajudUltima && (
          <p className="border-t px-5 py-2 text-[12px] text-muted-foreground">
            DataJud atualizado pela última vez em {br(datajudUltima)} (há {datajudParado} dias): os movimentos abaixo podem estar defasados.
          </p>
        )}
      </section>

      {cartoes.length === 0 && (
        <div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm">
          Nada novo neste filtro.{" "}
          {!tudo && <Link href="/app/monitoramento?filtro=tudo" className="font-medium text-brand-navy hover:underline">Ver tudo</Link>}
        </div>
      )}

      {cartoes.map(({ p, r, movs }) => {
        const mostrar = (tudo ? movs : [...movs.filter((m) => m.tag), ...movs.filter((m) => !m.tag)]).slice(0, 3);
        const resto = movs.length - mostrar.length + Math.max(0, r.n - movs.reduce((s, m) => s + m.n, 0));
        return (
          <article key={p.id} className="grid gap-4 rounded-xl border bg-white px-5 py-4 md:grid-cols-[minmax(240px,1fr)_minmax(280px,1.4fr)_auto]">
            <div>
              <span>
                <NumeroProcesso numero={p.numero} />
                <span className="ml-2 rounded border px-1 font-mono text-[11px] text-muted-foreground">{p.tribunal}</span>
              </span>
              <div className="mt-1.5 font-semibold">{p.gestor?.nome ?? "—"}</div>
              <div className="text-[13px] text-muted-foreground">{r.n} {r.n === 1 ? "movimento não lido" : "movimentos não lidos"}</div>
            </div>
            <div className="space-y-1">
              {mostrar.map((m, i) => (
                <div key={i} className="flex items-baseline gap-2.5 text-sm">
                  <span className="w-[62px] shrink-0 font-mono text-xs text-muted-foreground">{m.dia}</span>
                  {m.tag && <span className="rounded bg-brand-navy px-1.5 text-[11px] font-semibold uppercase tracking-wide text-white">{m.tag}</span>}
                  <span className={m.tag ? "font-semibold" : "text-muted-foreground"}>{m.texto}</span>
                  {m.n > 1 && <span className="font-mono text-[11px] text-muted-foreground">×{m.n}</span>}
                </div>
              ))}
              {resto > 0 && <div className="pl-[72px] text-[13px] text-muted-foreground">+ {resto} {resto === 1 ? "movimento" : "movimentos"}</div>}
            </div>
            <div className="flex flex-wrap items-start justify-end gap-2">
              <Link href={`/app/processos/${p.id}`} className="inline-flex h-8 items-center rounded-md border px-3 text-[13px] hover:bg-background">
                Abrir
              </Link>
              <MarcarProcessoVisto processoId={p.id} />
            </div>
          </article>
        );
      })}
    </div>
  );
}
