"use client";

import * as React from "react";
import { Search, Star, X } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  confDia,
  confTotal,
  ordemTabela,
  severidade,
  urgencia,
  type LinhaLig,
  type Proximo,
  type Resumo,
  type Urgencia,
} from "@/lib/prazos-lig";
import { cn } from "@/lib/utils";

export type PublicacaoRow = { diario: string; data: string; origem: string; texto: string; inteiroTeor: string };
export type CienciaRow = { data: string; processo: string; cliente: string; motivo: string };

const COR_TIPO: Record<Urgencia["Tipo"], string> = {
  "TCE-PE": "#1e40af",
  Judicial: "#c2410c",
  Sessão: "#6b21a8",
};
const COR_A = "#1e40af";
const COR_B = "#0f766e";

type FiltroTipo = "todos" | "TCE-PE" | "Judicial" | "Prioritário";

export function PrazosLigView({
  hoje,
  prazos,
  conf,
  ciencia,
  publicacoes,
  textoColunaV,
  resumo,
  proximo,
}: {
  hoje: string;
  prazos: LinhaLig[];
  conf: LinhaLig[];
  ciencia: CienciaRow[];
  publicacoes: Record<string, PublicacaoRow>;
  textoColunaV: Record<string, string>;
  resumo: Resumo;
  proximo: Proximo | null;
}) {
  const urg = React.useMemo(() => urgencia(prazos, hoje), [prazos, hoje]);
  const [tipo, setTipo] = React.useState<FiltroTipo>("todos");
  const [busca, setBusca] = React.useState("");
  const [concluidos, setConcluidos] = React.useState(false);
  const [sel, setSel] = React.useState<string | null>(null);
  const leitorRef = React.useRef<HTMLDivElement>(null);

  const abrir = (id: string) => {
    setSel(id);
    requestAnimationFrame(() => leitorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div className="space-y-6">
      <Destaque proximo={proximo} resumo={resumo} />
      <Agenda urg={urg} prazos={prazos} hoje={hoje} concluidos={concluidos} />

      <section className="rounded-xl border bg-white p-4 shadow-sm md:p-5">
        <h2 className="text-lg font-semibold text-brand-navy">Todos os prazos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ordenados pelo prazo interno. Clique num prazo para ler a publicação logo abaixo da lista.{" "}
          <Star className="inline h-3.5 w-3.5 fill-amber-400 text-amber-500" aria-hidden /> marca processo da tabela de prioritários.
        </p>
        <Tabela
          urg={urg}
          prazos={prazos}
          tipo={tipo}
          setTipo={setTipo}
          busca={busca}
          setBusca={setBusca}
          concluidos={concluidos}
          setConcluidos={setConcluidos}
          sel={sel}
          abrir={abrir}
        />
      </section>

      <div ref={leitorRef} className="scroll-mt-4">
        <Leitor
          prazo={sel ? prazos.find((p) => p.ID === sel) ?? null : null}
          publicacoes={publicacoes}
          textoColunaV={textoColunaV}
          fechar={() => setSel(null)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Conferencia conf={conf} />
        <Ciencia ciencia={ciencia} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Destaque do proximo prazo fatal + 4 cartoes
// ---------------------------------------------------------------------------

function Destaque({ proximo, resumo }: { proximo: Proximo | null; resumo: Resumo }) {
  const tiles: { n: number; t: string; tom: "bad" | "warn" }[] = [
    { n: resumo.vencidos, t: "Prazo fatal passou sem baixa", tom: "bad" },
    { n: resumo.ateAmanha, t: "Prazo interno até amanhã ou já passou", tom: "bad" },
    { n: resumo.proximos7, t: "Prazo interno em 2 a 7 dias", tom: "warn" },
    { n: resumo.semLegalOne, t: "Ainda não lançados no Legal One", tom: "warn" },
  ];
  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="rounded-xl border border-l-4 border-l-brand-navy bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Próximo prazo fatal</p>
        {proximo ? (
          <>
            <p className="mt-2 text-4xl font-semibold leading-none text-brand-navy">{proximo.Faltam}</p>
            <p className="mt-3 text-base font-medium text-slate-900">{proximo.peca}</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span>
                Processo <b className="font-mono font-medium text-slate-900">{proximo.processo}</b>
              </span>
              <span>
                Cliente <b className="font-medium text-slate-900">{proximo.cliente}</b>
              </span>
              <span>
                Fatal <b className="font-mono font-medium text-slate-900">{proximo.prazoFatal}</b>
              </span>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Nenhum prazo fatal em aberto.</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t) => {
          const quente = t.n > 0;
          return (
            <div
              key={t.t}
              className={cn(
                "rounded-xl border bg-white px-4 py-3 shadow-sm",
                quente && t.tom === "bad" && "border-red-200 bg-red-50",
                quente && t.tom === "warn" && "border-amber-200 bg-amber-50",
              )}
            >
              <span
                className={cn(
                  "block font-mono text-3xl font-medium leading-none text-slate-900",
                  quente && t.tom === "bad" && "text-red-700",
                  quente && t.tom === "warn" && "text-amber-700",
                )}
              >
                {t.n}
              </span>
              <span className="mt-1.5 block text-xs leading-snug text-muted-foreground">{t.t}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Agenda de vencimentos (prazo fatal por dia, empilhado por tipo)
// ---------------------------------------------------------------------------

type DiaAgenda = {
  d: number;
  rotulo: string;
  dataLonga: string;
  fimDeSemana: boolean;
  segunda: boolean;
  itens: { tipo: Urgencia["Tipo"]; texto: string }[];
} & Partial<Record<Urgencia["Tipo"], number>>;

function Agenda({ urg, prazos, hoje, concluidos }: { urg: Urgencia[]; prazos: LinhaLig[]; hoje: string; concluidos: boolean }) {
  const dados = React.useMemo(() => {
    const by = new Map(prazos.map((r) => [r.ID, r]));
    const base = Date.parse(hoje + "T00:00:00Z");
    const itens = urg
      .filter((u) => (concluidos || u.emAberto) && u.diasFatal !== null)
      .map((u) => ({ u, r: by.get(u.ID), d: u.diasFatal! }))
      .filter((x) => x.r);
    const ds = itens.map((i) => i.d);
    const minD = Math.max(-14, Math.min(-5, ds.length ? Math.min(...ds) : -5));
    const maxD = Math.min(120, Math.max(30, (ds.length ? Math.max(...ds) : 30) + 3));
    const out: DiaAgenda[] = [];
    for (let d = minD; d <= maxD; d++) {
      const dt = new Date(base + d * 864e5);
      const dd = String(dt.getUTCDate()).padStart(2, "0");
      const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
      const doDia = itens.filter((i) => i.d === d);
      const linha: DiaAgenda = {
        d,
        rotulo: `${dd}/${mm}`,
        dataLonga: `${dd}/${mm}/${dt.getUTCFullYear()}`,
        fimDeSemana: dt.getUTCDay() === 0 || dt.getUTCDay() === 6,
        segunda: dt.getUTCDay() === 1,
        itens: doDia.map((i) => ({
          tipo: i.u.Tipo,
          texto: `${i.r!["Peça / providência"].replace(/^SESSÃO: /, "Sessão: ")} · ${i.r!["Nº do processo"]} (${i.r!["Cliente / ente"]})`,
        })),
      };
      for (const t of ["TCE-PE", "Judicial", "Sessão"] as const) {
        const n = doDia.filter((i) => i.u.Tipo === t).length;
        if (n) linha[t] = n;
      }
      out.push(linha);
    }
    return out;
  }, [urg, prazos, hoje, concluidos]);

  const maxN = Math.max(3, ...dados.map((d) => d.itens.length));
  const segundas = dados.filter((d) => d.segunda).map((d) => d.d);
  const temSessao = dados.some((d) => d.Sessão);

  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm md:p-5">
      <h2 className="text-lg font-semibold text-brand-navy">Agenda de vencimentos</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Prazos fatais por dia, da semana passada às próximas semanas. Passe o mouse (ou toque) num dia para ver os
        processos. A linha marca hoje.
      </p>
      <Legenda itens={[["TCE-PE", COR_TIPO["TCE-PE"]], ["Judicial", COR_TIPO.Judicial], ...(temSessao ? [["Sessão", COR_TIPO.Sessão] as [string, string]] : [])]} />
      <div className="mt-2 h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} margin={{ top: 16, right: 8, bottom: 0, left: -24 }} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke="#e9ebef" />
            {dados
              .filter((d) => d.fimDeSemana)
              .map((d) => (
                <ReferenceArea key={d.d} x1={d.d} x2={d.d} fill="#e2e8f0" fillOpacity={0.5} stroke="none" ifOverflow="visible" />
              ))}
            <XAxis
              dataKey="d"
              ticks={segundas}
              interval={0}
              tickFormatter={(d: number) => dados.find((x) => x.d === d)?.rotulo ?? ""}
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={{ stroke: "#cbd5e1" }}
            />
            <YAxis allowDecimals={false} domain={[0, maxN]} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: "rgba(15,23,42,0.06)" }} content={<TooltipAgenda />} />
            <ReferenceLine x={0} stroke="#0f172a" strokeWidth={1.5} label={{ value: "hoje", position: "insideTopRight", fontSize: 11, fill: "#0f172a" }} />
            {(["TCE-PE", "Judicial", "Sessão"] as const).map((t) => (
              <Bar key={t} dataKey={t} stackId="tipo" fill={COR_TIPO[t]} maxBarSize={28} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function TooltipAgenda({ active, payload }: { active?: boolean; payload?: { payload: DiaAgenda }[] }) {
  if (!active || !payload?.length) return null;
  const dia = payload[0].payload;
  return (
    <div className="max-w-xs rounded-lg border bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-900">
        {dia.dataLonga}
        {dia.d === 0 ? " · hoje" : ""} · {dia.itens.length} {dia.itens.length === 1 ? "prazo" : "prazos"}
      </p>
      {dia.itens.map((i, k) => (
        <p key={k} className="mt-1 flex gap-1.5 text-slate-700">
          <i className="mt-1 inline-block h-2 w-2 shrink-0 rounded-sm" style={{ background: COR_TIPO[i.tipo] }} />
          <span>{i.texto}</span>
        </p>
      ))}
    </div>
  );
}

function Legenda({ itens }: { itens: [string, string][] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
      {itens.map(([t, c]) => (
        <span key={t} className="inline-flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
          {t}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabela com filtros
// ---------------------------------------------------------------------------

function Tabela({
  urg,
  prazos,
  tipo,
  setTipo,
  busca,
  setBusca,
  concluidos,
  setConcluidos,
  sel,
  abrir,
}: {
  urg: Urgencia[];
  prazos: LinhaLig[];
  tipo: FiltroTipo;
  setTipo: (t: FiltroTipo) => void;
  busca: string;
  setBusca: (q: string) => void;
  concluidos: boolean;
  setConcluidos: (v: boolean) => void;
  sel: string | null;
  abrir: (id: string) => void;
}) {
  const u = React.useMemo(() => new Map(urg.map((r) => [r.ID, r])), [urg]);
  const q = busca.toLowerCase().trim();
  const linhas = prazos
    .filter((r) => r.ID && u.has(r.ID))
    .filter((r) => {
      const x = u.get(r.ID)!;
      if (!concluidos && !x.emAberto) return false;
      if (tipo === "Prioritário" && !x.prioritario) return false;
      if (tipo !== "todos" && tipo !== "Prioritário" && x.Tipo !== tipo) return false;
      if (q && !Object.values(r).join(" ").toLowerCase().includes(q)) return false;
      return true;
    })
    .sort((a, b) => ordemTabela(u.get(a.ID)!) - ordemTabela(u.get(b.ID)!) || a.ID.localeCompare(b.ID));

  const chips: { v: FiltroTipo; t: React.ReactNode }[] = [
    { v: "todos", t: "Todos" },
    { v: "TCE-PE", t: "TCE-PE" },
    { v: "Judicial", t: "Judicial" },
    { v: "Prioritário", t: <><Star className="h-3.5 w-3.5" aria-hidden /> Prioritários</> },
  ];

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {chips.map((c) => (
          <button
            key={c.v}
            type="button"
            aria-pressed={tipo === c.v}
            onClick={() => setTipo(c.v)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors",
              tipo === c.v ? "border-brand-navy bg-brand-navy text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            {c.t}
          </button>
        ))}
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar processo, cliente, peça…"
            aria-label="Buscar"
            className="h-9 pl-8"
          />
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <Checkbox checked={concluidos} onChange={(e) => setConcluidos(e.target.checked)} />
          Mostrar concluídos
        </label>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Situação</th>
              <th className="px-3 py-2">Interno</th>
              <th className="px-3 py-2">Fatal</th>
              <th className="px-3 py-2">Peça / providência</th>
              <th className="px-3 py-2">Processo</th>
              <th className="px-3 py-2">Cliente / ente</th>
              <th className="hidden px-3 py-2 md:table-cell">Órgão</th>
              <th className="hidden px-3 py-2 md:table-cell">Status</th>
              <th className="hidden px-3 py-2 md:table-cell">Legal One</th>
              <th className="hidden px-3 py-2 md:table-cell">Observações</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((r) => {
              const x = u.get(r.ID)!;
              const sev = severidade(x);
              return (
                <tr
                  key={r.ID}
                  tabIndex={0}
                  onClick={() => abrir(r.ID)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      abrir(r.ID);
                    }
                  }}
                  className={cn(
                    "cursor-pointer border-t border-l-4 border-l-transparent align-top outline-none transition-colors hover:bg-slate-50 focus-visible:bg-slate-100",
                    sev === "bad" && "border-l-red-600 bg-red-50/60",
                    sev === "warn" && "border-l-amber-500 bg-amber-50/50",
                    sev === "done" && "opacity-50",
                    sel === r.ID && "bg-blue-50 ring-1 ring-inset ring-brand-navy/40",
                  )}
                >
                  <td
                    className={cn(
                      "whitespace-nowrap px-3 py-2 font-medium",
                      sev === "bad" && "text-red-700",
                      sev === "warn" && "text-amber-800",
                    )}
                  >
                    {x.Faltam}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{r["Prazo interno"]}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{r["Prazo fatal"]}</td>
                  <td className="min-w-[220px] px-3 py-2">{r["Peça / providência"]}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-brand-navy">
                    {r["Nº do processo"]}
                    {x.prioritario && <Star className="ml-1 inline h-3.5 w-3.5 fill-amber-400 text-amber-500" aria-label="prioritário" />}
                  </td>
                  <td className="min-w-[140px] px-3 py-2">{r["Cliente / ente"]}</td>
                  <td className="hidden min-w-[110px] px-3 py-2 md:table-cell">{r["Órgão / tribunal"]}</td>
                  <td className="hidden whitespace-nowrap px-3 py-2 md:table-cell">{r.Status}</td>
                  <td className="hidden px-3 py-2 md:table-cell">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        r["Lançado no Legal One?"] === "Sim" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900",
                      )}
                    >
                      {r["Lançado no Legal One?"] || "—"}
                    </span>
                  </td>
                  <td className="hidden min-w-[220px] max-w-[300px] px-3 py-2 text-xs text-slate-600 md:table-cell">
                    <span className="line-clamp-2">{r["Observações / alertas"]}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {linhas.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhum prazo com esses filtros.</p>}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Leitor da publicacao
// ---------------------------------------------------------------------------

function Leitor({
  prazo,
  publicacoes,
  textoColunaV,
  fechar,
}: {
  prazo: LinhaLig | null;
  publicacoes: Record<string, PublicacaoRow>;
  textoColunaV: Record<string, string>;
  fechar: () => void;
}) {
  if (!prazo) {
    return (
      <section className="rounded-xl border border-dashed bg-white/60 p-4 text-sm text-muted-foreground md:p-5">
        <p className="text-xs font-medium uppercase tracking-[0.12em]">Publicação</p>
        <p className="mt-1">Clique num prazo da lista para ler aqui o texto extraído da publicação.</p>
      </section>
    );
  }
  const pub = publicacoes[prazo.Publicação];
  const texto = pub?.texto || textoColunaV[prazo.ID] || "";
  const meta: [string, string][] = [
    ["Processo", prazo["Nº do processo"]],
    ["Cliente", prazo["Cliente / ente"]],
    ["Órgão", prazo["Órgão / tribunal"]],
    ["Publicação", prazo["Data de publicação (LIG)"]],
    ["Interno", prazo["Prazo interno"]],
    ["Fatal", prazo["Prazo fatal"]],
    ["Contagem", prazo["Prazo (dias) e contagem"]],
  ];
  return (
    <section className="rounded-xl border border-l-4 border-l-brand-navy bg-white p-4 shadow-sm md:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Publicação</p>
        <button
          type="button"
          onClick={fechar}
          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
        >
          <X className="h-3.5 w-3.5" /> Fechar
        </button>
      </div>
      <h2 className="mt-1 text-lg font-semibold text-slate-900">{prazo["Peça / providência"]}</h2>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
        {meta.map(([rot, val]) => (
          <span key={rot}>
            {rot} <b className="font-medium text-slate-900">{val || "—"}</b>
          </span>
        ))}
      </div>
      {prazo["Observações / alertas"] && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {prazo["Observações / alertas"]}
        </p>
      )}
      {pub && (
        <p className="mt-3 text-xs text-muted-foreground">
          {[pub.diario, pub.data, pub.origem && `assinatura LIG ${pub.origem}`].filter(Boolean).join(" · ")}
        </p>
      )}
      {texto ? (
        <div
          tabIndex={0}
          className="mt-2 max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-lg border bg-slate-50 p-3 font-serif text-[15px] leading-relaxed text-slate-800"
        >
          {texto}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">O texto desta publicação ainda não foi extraído para a aba Publicações.</p>
      )}
      {pub?.inteiroTeor && (
        <p className="mt-3 text-sm">
          <a href={pub.inteiroTeor} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-navy underline underline-offset-2">
            Abrir o inteiro teor no PJe
          </a>
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Conferencia das duas assinaturas e ciencia
// ---------------------------------------------------------------------------

function Conferencia({ conf }: { conf: LinhaLig[] }) {
  const dias = React.useMemo(() => confDia(conf), [conf]);
  const tot = React.useMemo(() => confTotal(conf), [conf]);
  const porData = new Map(dias.map((d) => [d.Data, d]));
  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm md:p-5">
      <h2 className="text-lg font-semibold text-brand-navy">Conferência das duas assinaturas LIG</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        <b className="text-slate-900">{tot.batem}</b> de <b className="text-slate-900">{tot.mensagens}</b> e-mails batem com o
        total informado pela LIG. <b className="text-slate-900">{tot.excluidas}</b> publicações excluídas (aposentadoria,
        pensão, reforma).
      </p>
      <Legenda itens={[["A · advogados e pessoas", COR_A], ["B · prefeituras", COR_B]]} />
      {dias.length ? (
        <div className="mt-2 h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dias} margin={{ top: 8, right: 4, bottom: 0, left: -24 }} barCategoryGap="25%">
              <CartesianGrid vertical={false} stroke="#e9ebef" />
              <XAxis
                dataKey="Data"
                interval={0}
                height={40}
                tickLine={false}
                axisLine={{ stroke: "#cbd5e1" }}
                tick={(p) => {
                  const valor = String(p.payload?.value ?? "");
                  const d = porData.get(valor);
                  const falhou = (d?.naoBateram ?? 0) > 0;
                  return (
                    <g transform={`translate(${p.x},${p.y})`}>
                      <text dy={12} textAnchor="middle" fontSize={11} fill="#64748b">{valor.slice(0, 5)}</text>
                      <text dy={27} textAnchor="middle" fontSize={12} fill={falhou ? "#b91c1c" : "#047857"}>{falhou ? "✕" : "✓"}</text>
                    </g>
                  );
                }}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(15,23,42,0.06)" }}
                formatter={(v, nome) => [String(v ?? 0), nome === "A" ? "Assinatura A" : "Assinatura B"]}
                labelFormatter={(rotulo) => {
                  const l = String(rotulo ?? "");
                  const d = porData.get(l);
                  return `${l} · ${d?.emails ?? 0} e-mails${d?.naoBateram ? ` · ${d.naoBateram} não bateram` : ""}`;
                }}
              />
              <Bar dataKey="A" fill={COR_A} radius={[2, 2, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="B" fill={COR_B} radius={[2, 2, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Sem e-mails conferidos.</p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Publicações por dia de diário em cada assinatura. Um ✕ sob o dia indica e-mail cujo total não bateu.
      </p>
    </section>
  );
}

function Ciencia({ ciencia }: { ciencia: CienciaRow[] }) {
  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm md:p-5">
      <h2 className="text-lg font-semibold text-brand-navy">Sem prazo · só ciência</h2>
      <p className="mt-1 text-sm text-muted-foreground">Publicações no escopo que não abrem prazo para o escritório.</p>
      <div className="mt-3 max-h-[360px] overflow-auto rounded-lg border">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="sticky top-0 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Publicação</th>
              <th className="px-3 py-2">Processo</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Por que não gera prazo</th>
            </tr>
          </thead>
          <tbody>
            {ciencia.map((c) => (
              <tr key={`${c.processo}|${c.data}`} className="border-t align-top">
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{c.data}</td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-brand-navy">{c.processo}</td>
                <td className="px-3 py-2">{c.cliente}</td>
                <td className="px-3 py-2 text-xs text-slate-600">{c.motivo}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {ciencia.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhuma publicação só de ciência.</p>}
      </div>
    </section>
  );
}
