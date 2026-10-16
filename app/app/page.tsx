import Link from "next/link";
import { getServerSession } from "next-auth";

import { NumeroProcesso } from "@/components/numero-processo";
import { authOptions } from "@/lib/auth";
import { BANCAS } from "@/lib/bancas";
import { diaDe, hojeDia } from "@/lib/datas";
import { filtroVisibilidadeCompromissos } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { whereSituacaoTce } from "@/lib/situacao-tce";
import { TCE_TIPO_LABELS } from "@/lib/tce-config";
import { cn } from "@/lib/utils";

import { HojePrazoAcoes } from "./hoje-prazo-acoes";

// Inicio "Pauta de hoje" (Direcao A): o que venceu sem baixa, os proximos 14 dias,
// a fila de trabalho do escritorio e as novidades dos processos judiciais.

const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const DIAS_SEMANA = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

// "aaaa-mm-dd" +n dias (aritmetica em UTC para nao depender do fuso).
function somaDias(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const br = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");
const diasEntre = (a: string, b: string) =>
  Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86400000);

type ItemRegua = { tipo: "prazo" | "sessao" | "compromisso"; texto: string; href: string };

export default async function HojePage() {
  const session = await getServerSession(authOptions);
  const user = session!.user;
  const escritorioId = user.escritorioId;

  const hoje = hojeDia();
  const fimRegua = somaDias(hoje, 13);
  const iniBusca = new Date(`${somaDias(hoje, -1)}T00:00:00Z`);
  const fimBusca = new Date(`${somaDias(fimRegua, 1)}T23:59:59Z`);

  const [
    prazosTce, prazosJud, compromissos, sessoesTce, sessoesJud,
    emJulgamentoSemMemorial, contrarrazoesPendentes, recursoPendente, situacaoConfirmar,
    novidadesGrupo, principais,
  ] = await Promise.all([
    prisma.prazoTce.findMany({
      where: { cumprido: false, dispensado: false, processo: { escritorioId } },
      orderBy: { dataVencimento: "asc" },
      select: {
        id: true, tipo: true, dataVencimento: true,
        advogadoResp: { select: { nome: true } },
        processo: { select: { id: true, numero: true, tipo: true, municipio: { select: { nome: true } } } },
      },
    }),
    prisma.prazo.findMany({
      where: { cumprido: false, dispensado: false, processo: { escritorioId } },
      orderBy: { data: "asc" },
      select: {
        id: true, tipo: true, data: true,
        advogadoResp: { select: { nome: true } },
        processo: { select: { id: true, numero: true, gestor: { select: { nome: true } } } },
      },
    }),
    prisma.compromisso.findMany({
      where: { escritorioId, cumprido: false, dataInicio: { gte: iniBusca, lte: fimBusca }, ...filtroVisibilidadeCompromissos(user) },
      orderBy: { dataInicio: "asc" },
      select: { id: true, titulo: true, dataInicio: true },
    }),
    prisma.sessaoPauta.findMany({
      where: { escritorioId, data: { gte: iniBusca, lte: fimBusca } },
      select: { id: true, data: true, camara: true, _count: { select: { itens: true } } },
    }),
    prisma.sessaoJudicial.findMany({
      where: { escritorioId, data: { gte: iniBusca, lte: fimBusca } },
      select: { id: true, data: true, tribunal: true, orgaoJulgador: true, _count: { select: { itens: true } } },
    }),
    prisma.processoTce.count({
      where: { escritorioId, memorialPronto: false, memorialDispensado: false, AND: [whereSituacaoTce("em_julgamento")] },
    }),
    prisma.processoTce.count({
      where: {
        escritorioId,
        julgado: false,
        OR: [
          { notaTecnica: true, contrarrazoesNtApresentadas: false, contrarrazoesNtDispensadas: false },
          { parecerMpco: true, contrarrazoesMpcoApresentadas: false, contrarrazoesMpcoDispensadas: false },
        ],
      },
    }),
    prisma.processoTce.count({ where: { escritorioId, AND: [whereSituacaoTce("recurso_pendente")] } }),
    prisma.processoTce.count({ where: { escritorioId, ehRecurso: false, andamentos: { none: {} } } }),
    prisma.movimentacaoAutomatica.groupBy({
      by: ["processoId"],
      where: { lida: false, processo: { escritorioId } },
      _count: { _all: true },
      _max: { dataMovimento: true },
      orderBy: { _max: { dataMovimento: "desc" } },
    }),
    prisma.processoTce.findMany({ where: { escritorioId, ehRecurso: false }, select: { bancasSlug: true } }),
  ]);

  // ---------------------------------------------------------------- vencidos sem baixa
  const vencidos = [
    ...prazosTce
      .filter((p) => diaDe(p.dataVencimento) < hoje)
      .map((p) => ({
        id: p.id, escopo: "tce" as const, dia: diaDe(p.dataVencimento), tipo: p.tipo,
        numero: p.processo.numero, href: `/app/tce/processos/${p.processo.id}`,
        contexto: [p.processo.municipio?.nome, TCE_TIPO_LABELS[p.processo.tipo]].filter(Boolean).join(" · "),
        resp: p.advogadoResp?.nome ?? null,
      })),
    ...prazosJud
      .filter((p) => diaDe(p.data) < hoje)
      .map((p) => ({
        id: p.id, escopo: "judicial" as const, dia: diaDe(p.data), tipo: p.tipo,
        numero: p.processo.numero, href: `/app/processos/${p.processo.id}`,
        contexto: p.processo.gestor?.nome ?? "", resp: p.advogadoResp?.nome ?? null,
      })),
  ].sort((a, b) => (a.dia < b.dia ? -1 : 1));

  // ---------------------------------------------------------------- regua de 14 dias
  const dias = Array.from({ length: 14 }, (_, i) => somaDias(hoje, i));
  const regua = new Map<string, ItemRegua[]>(dias.map((d) => [d, []]));
  const poe = (dia: string, item: ItemRegua) => regua.get(dia)?.push(item);
  for (const p of prazosTce) poe(diaDe(p.dataVencimento), { tipo: "prazo", texto: `${p.tipo} · ${p.processo.numero}`, href: `/app/tce/processos/${p.processo.id}` });
  for (const p of prazosJud) poe(diaDe(p.data), { tipo: "prazo", texto: `${p.tipo} · ${p.processo.numero}`, href: `/app/processos/${p.processo.id}` });
  for (const s of sessoesTce) if (s._count.itens > 0) poe(diaDe(s.data), { tipo: "sessao", texto: `Pauta TCE · ${s.camara === "PLENO" ? "Pleno" : s.camara === "PRIMEIRA" ? "1ª Câmara" : "2ª Câmara"} (${s._count.itens})`, href: "/app/tce/pauta" });
  for (const s of sessoesJud) if (s._count.itens > 0) poe(diaDe(s.data), { tipo: "sessao", texto: `Pauta ${s.tribunal} · ${s.orgaoJulgador} (${s._count.itens})`, href: "/app/pautas" });
  for (const c of compromissos) poe(diaDe(c.dataInicio), { tipo: "compromisso", texto: c.titulo, href: "/app/compromissos" });
  const totalRegua = Array.from(regua.values()).reduce((a, l) => a + l.length, 0);

  // ---------------------------------------------------------------- novidades judiciais
  const topNovidades = novidadesGrupo.slice(0, 5);
  const procsNov = topNovidades.length
    ? await prisma.processo.findMany({
        where: { id: { in: topNovidades.map((g) => g.processoId) } },
        select: {
          id: true, numero: true, tribunal: true, gestor: { select: { nome: true } },
          movimentacoesAuto: { where: { lida: false }, orderBy: { dataMovimento: "desc" }, take: 1, select: { nomeMovimento: true, dataMovimento: true } },
        },
      })
    : [];
  const novidades = topNovidades
    .map((g) => ({ g, p: procsNov.find((p) => p.id === g.processoId) }))
    .filter((x) => x.p);

  // ---------------------------------------------------------------- carteira por banca
  const porBanca = BANCAS.map((b) => ({ ...b, n: principais.filter((p) => p.bancasSlug.includes(b.slug)).length }))
    .filter((b) => b.n > 0)
    .sort((a, b) => b.n - a.n);
  const maxBanca = Math.max(1, ...porBanca.map((b) => b.n));

  // ---------------------------------------------------------------- cabecalho
  const dHoje = new Date(`${hoje}T12:00:00Z`);
  const titulo = `${DIAS_SEMANA[dHoje.getUTCDay()]}, ${dHoje.getUTCDate()} de ${MESES[dHoje.getUTCMonth()]}`;
  const resumo = [
    totalRegua === 0 ? "Nada cadastrado nos próximos 14 dias." : `${totalRegua} ${totalRegua === 1 ? "compromisso" : "itens"} nos próximos 14 dias.`,
    vencidos.length ? `${vencidos.length} ${vencidos.length === 1 ? "prazo vencido continua" : "prazos vencidos continuam"} sem baixa.` : "Nenhum prazo vencido sem baixa.",
  ].join(" ");

  const fila = [
    { n: emJulgamentoSemMemorial, t: "Em julgamento sem memorial", d: "TCE · nenhum memorial pronto ou dispensado", href: "/app/tce/processos?situacao=em_julgamento" },
    { n: contrarrazoesPendentes, t: "Contrarrazões pendentes", d: "TCE · Nota Técnica ou Parecer do MPCO sem resposta", href: "/app/tce/pendencias" },
    { n: recursoPendente, t: "Julgados com recurso pendente", d: "TCE · aguardando o julgamento do recurso", href: "/app/tce/processos?situacao=recurso_pendente" },
    { n: situacaoConfirmar, t: "Processos sem nenhum andamento", d: "TCE · falta carregar a linha do tempo", href: "/app/tce/processos" },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-10">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Pauta do escritório</p>
        <h1 className="mt-1 text-3xl font-semibold leading-tight text-brand-tinta md:text-4xl">{titulo}</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">{resumo}</p>
      </header>

      {/* ------------------------------------------------ vencidos sem baixa */}
      {vencidos.length > 0 && (
        <section className="rounded-xl border bg-white" aria-labelledby="venc">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pb-2 pt-4">
            <h2 id="venc" className="flex items-center gap-2 text-xl font-semibold">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-destructive" aria-hidden="true" />
              Prazos vencidos sem baixa
              <span className="font-mono text-sm font-semibold text-destructive">{vencidos.length}</span>
            </h2>
            <span className="text-[13px] text-muted-foreground">Marque como cumprido ou encerre como perdido.</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <tbody>
                {vencidos.map((v) => (
                  <tr key={v.id} className="border-t">
                    <td className="w-28 px-5 py-3 align-top">
                      <span className="font-mono text-[13px] font-semibold text-destructive">há {diasEntre(v.dia, hoje)} dias</span>
                      <div className="text-xs text-muted-foreground">venceu {br(v.dia)}</div>
                    </td>
                    <td className="px-2 py-3 align-top">
                      <div className="font-semibold">{v.tipo}</div>
                      <Link href={v.href} className="mr-2 hover:underline">
                        <NumeroProcesso numero={v.numero} />
                      </Link>
                      <span className="text-[13px] text-muted-foreground">{v.contexto}</span>
                    </td>
                    <td className="hidden px-2 py-3 align-top text-[13px] text-muted-foreground md:table-cell">{v.resp ?? "—"}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right align-top">
                      <HojePrazoAcoes prazoId={v.id} escopo={v.escopo} usuarioId={user.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ------------------------------------------------ regua 14 dias */}
      <section className="rounded-xl border bg-white" aria-labelledby="regua">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pb-2 pt-4">
          <h2 id="regua" className="text-xl font-semibold">Próximos 14 dias</h2>
          <span className="text-[13px] text-muted-foreground">
            {br(hoje)} a {br(fimRegua)} · prazos, sessões de pauta e compromissos
          </span>
        </div>
        <div className="overflow-x-auto border-t">
          <div className="grid min-w-[980px] grid-cols-[repeat(14,minmax(0,1fr))]">
            {dias.map((d) => {
              const dt = new Date(`${d}T12:00:00Z`);
              const fds = dt.getUTCDay() === 0 || dt.getUTCDay() === 6;
              const itens = regua.get(d) ?? [];
              return (
                <div key={d} className={cn("min-h-[120px] border-l px-1.5 pb-2 pt-2 first:border-l-0", fds && "bg-background", d === hoje && "bg-accent")}>
                  <div className="text-center">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{d === hoje ? "hoje" : SEMANA[dt.getUTCDay()]}</div>
                    <div className="font-mono text-[15px] font-medium">{dt.getUTCDate()}</div>
                  </div>
                  <div className="mt-1.5 space-y-1">
                    {itens.slice(0, 3).map((it, i) => (
                      <Link
                        key={i}
                        href={it.href}
                        title={it.texto}
                        className={cn(
                          "block truncate rounded px-1 py-0.5 text-[10.5px] leading-tight",
                          it.tipo === "prazo" && "bg-amber-50 text-amber-900",
                          it.tipo === "sessao" && "bg-brand-navy text-white",
                          it.tipo === "compromisso" && "bg-accent text-brand-navy",
                        )}
                      >
                        {it.texto}
                      </Link>
                    ))}
                    {itens.length > 3 && <div className="text-center text-[10.5px] text-muted-foreground">+{itens.length - 3}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {totalRegua === 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-5 py-3 text-sm">
            <span>Nenhum prazo, sessão de pauta ou compromisso cadastrado no período.</span>
            <Link href="/app/tce/pauta" className="font-medium text-brand-navy hover:underline">Cadastrar pauta da semana →</Link>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ------------------------------------------------ fila de trabalho */}
        <section className="rounded-xl border bg-white" aria-labelledby="fila">
          <div className="flex items-baseline justify-between gap-2 px-5 pb-2 pt-4">
            <h2 id="fila" className="text-xl font-semibold">Fila de trabalho</h2>
            <span className="text-[13px] text-muted-foreground">o que depende do escritório</span>
          </div>
          {fila.map((f) => (
            <Link key={f.t} href={f.href} className="flex items-center gap-4 border-t px-5 py-3 transition-colors hover:bg-background">
              <span className="min-w-[56px] text-right font-mono text-2xl font-medium">{f.n}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{f.t}</span>
                <span className="text-[13px] text-muted-foreground">{f.d}</span>
              </span>
              <span className="text-muted-foreground" aria-hidden="true">→</span>
            </Link>
          ))}
        </section>

        {/* ------------------------------------------------ novidades judiciais */}
        <section className="rounded-xl border bg-white" aria-labelledby="nov">
          <div className="flex items-baseline justify-between gap-2 px-5 pb-2 pt-4">
            <h2 id="nov" className="text-xl font-semibold">Novidades nos judiciais</h2>
            <Link href="/app/monitoramento" className="text-[13px] font-medium text-brand-navy hover:underline">
              {novidadesGrupo.length} {novidadesGrupo.length === 1 ? "processo" : "processos"} →
            </Link>
          </div>
          {novidades.length === 0 && <p className="border-t px-5 py-4 text-sm text-muted-foreground">Nenhuma novidade não lida.</p>}
          {novidades.map(({ g, p }) => {
            const ult = p!.movimentacoesAuto[0];
            return (
              <Link key={g.processoId} href={`/app/processos/${p!.id}`} className="block border-t px-5 py-3 transition-colors hover:bg-background">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span>
                    <NumeroProcesso numero={p!.numero} />
                    <span className="ml-2 rounded border px-1 font-mono text-[11px] text-muted-foreground">{p!.tribunal}</span>
                  </span>
                  {ult && <span className="font-mono text-xs text-muted-foreground">{br(diaDe(ult.dataMovimento))}</span>}
                </div>
                <div className="mt-0.5 font-semibold">{ult?.nomeMovimento ?? "Movimentação"}</div>
                <div className="text-[13px] text-muted-foreground">
                  {p!.gestor?.nome ?? "—"} · {g._count._all} {g._count._all === 1 ? "movimento não lido" : "movimentos não lidos"}
                </div>
              </Link>
            );
          })}
        </section>
      </div>

      {/* ------------------------------------------------ carteira por banca */}
      <section className="rounded-xl border bg-white" aria-labelledby="cart">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pb-2 pt-4">
          <h2 id="cart" className="text-xl font-semibold">Carteira TCE por banca</h2>
          <span className="text-[13px] text-muted-foreground">processos principais, sem contar recursos</span>
        </div>
        <div className="space-y-2.5 px-5 pb-5 pt-1">
          {porBanca.map((b) => (
            <Link key={b.slug} href={`/app/tce/processos?banca=${b.slug}&situacao=todos`} className="flex items-center gap-3 text-sm hover:underline">
              <span className="w-56 shrink-0">{b.nome}</span>
              <span className="h-2 flex-1 rounded-full bg-secondary">
                <span className="block h-2 rounded-full bg-brand-navy" style={{ width: `${Math.round((b.n / maxBanca) * 100)}%` }} />
              </span>
              <span className="w-12 text-right font-mono">{b.n}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
