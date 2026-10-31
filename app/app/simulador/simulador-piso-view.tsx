"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ExternalLink, Maximize2, Plus, Printer, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PISO_FONTE, PISO_MAGISTERIO, ULTIMO_MES_INDICE } from "@/lib/simulador/dados";
import {
  calcularPiso,
  fmtBRL,
  fmtMes,
  mesesEntre,
  somaMeses,
  type Periodo,
} from "@/lib/simulador/calculo-piso";
import type { PerfilMunicipio } from "@/lib/simulador/municipios";
import { cn } from "@/lib/utils";

// Teses previstas no simulador. So o piso do temporario esta pronto.
const TESES = [
  { id: "piso", rotulo: "Piso do professor temporário", sub: "Tema 1.308/STF", pronta: true },
  { id: "terco", rotulo: "Terço de férias não pago", sub: "em breve", pronta: false },
  { id: "13", rotulo: "13º pago a menor", sub: "em breve", pronta: false },
  { id: "pccr", rotulo: "Progressão do PCCR", sub: "em breve", pronta: false },
];

function mesAtual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Aceita "2.500,00", "2500,5" ou "2500.50".
function lerValor(txt: string): number | undefined {
  const t = txt.trim();
  if (!t) return undefined;
  const normal = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const v = Number(normal);
  return Number.isFinite(v) ? v : undefined;
}

function Pendente({ children = "a confirmar" }: { children?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
      {children}
    </span>
  );
}

function LinhaSwitch({
  titulo,
  descricao,
  checked,
  onChange,
  disabled,
  extra,
}: {
  titulo: string;
  descricao: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 py-2.5", disabled && "opacity-50")}>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
          {titulo} {extra}
        </p>
        <p className="text-xs text-muted-foreground">{descricao}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} ariaLabel={titulo} />
    </div>
  );
}

export function SimuladorPisoView({ municipios }: { municipios: PerfilMunicipio[] }) {
  const [municipioId, setMunicipioId] = useState(municipios[0]?.id ?? "");
  const perfil = municipios.find((m) => m.id === municipioId) ?? municipios[0];

  const [nome, setNome] = useState("");
  const [periodos, setPeriodos] = useState<Periodo[]>([{ inicio: "2022-02", fim: "2026-09" }]);
  const [horasMensais, setHorasMensais] = useState(150);
  const [ajuizamento, setAjuizamento] = useState(mesAtual);
  const [vencimentos, setVencimentos] = useState<Record<number, string>>({});

  const [reflexos, setReflexos] = useState(perfil?.temporarios.preve13Ferias ?? true);
  const [pagou13, setPagou13] = useState(true);
  const [pagouTerco, setPagouTerco] = useState(false);
  const [feriasNaoGozadas, setFeriasNaoGozadas] = useState(false);
  const [fgts, setFgts] = useState(false);

  const [grupo, setGrupo] = useState(1);
  const [apresentacao, setApresentacao] = useState(false);
  const [memoria, setMemoria] = useState(false);

  // Ao trocar de municipio, o padrao de 13º/ferias segue a lei local (se conferida).
  useEffect(() => {
    if (perfil?.temporarios.preve13Ferias != null) setReflexos(perfil.temporarios.preve13Ferias);
  }, [perfil]);

  useEffect(() => {
    if (!apresentacao) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setApresentacao(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [apresentacao]);

  // Anos que entram no calculo (dentro da prescricao e ate o ajuizamento).
  const inicioPrescricao = somaMeses(ajuizamento, -60);
  const anos = useMemo(() => {
    const s = new Set<number>();
    for (const p of periodos)
      for (const m of mesesEntre(p.inicio, p.fim))
        if (m >= inicioPrescricao && m <= ajuizamento) s.add(Number(m.slice(0, 4)));
    return Array.from(s).sort();
  }, [periodos, inicioPrescricao, ajuizamento]);

  const vencimentoPorAno = useMemo(() => {
    const out: Record<number, number> = {};
    for (const a of anos) {
      const v = lerValor(vencimentos[a] ?? "");
      if (v != null) out[a] = v;
    }
    return out;
  }, [anos, vencimentos]);

  const r = useMemo(
    () =>
      calcularPiso({
        periodos,
        horasMensais,
        vencimentoPorAno,
        ajuizamento,
        reflexos13Ferias: reflexos,
        pagou13,
        pagouTerco,
        feriasNaoGozadas,
        fgts,
      }),
    [
      periodos,
      horasMensais,
      vencimentoPorAno,
      ajuizamento,
      reflexos,
      pagou13,
      pagouTerco,
      feriasNaoGozadas,
      fgts,
    ],
  );

  const algumVencimento = Object.keys(vencimentoPorAno).length > 0;
  const total = r.totais.atualizado;
  const maxAno = Math.max(1, ...r.anos.map((a) => a.atualizado));

  function setPeriodo(i: number, campo: keyof Periodo, valor: string) {
    setPeriodos((ps) => ps.map((p, j) => (j === i ? { ...p, [campo]: valor } : p)));
  }

  function copiarParaTodos() {
    const primeiro = anos.map((a) => vencimentos[a]).find((v) => v && v.trim());
    if (!primeiro) return;
    setVencimentos((vs) => {
      const n = { ...vs };
      for (const a of anos) n[a] = primeiro;
      return n;
    });
  }

  const rubricas = [
    { rotulo: "Diferença do piso", valor: r.totais.diferenca, mostrar: true },
    { rotulo: "Reflexo no 13º", valor: r.totais.decimoTerceiro, mostrar: reflexos },
    {
      rotulo: feriasNaoGozadas ? "Férias + 1/3" : "Terço de férias",
      valor: r.totais.ferias,
      mostrar: reflexos,
    },
    { rotulo: "FGTS (8%)", valor: r.totais.fgts, mostrar: fgts },
  ].filter((x) => x.mostrar);

  return (
    <div className="space-y-6">
      {/* Teses */}
      <div
        className="flex gap-2 overflow-x-auto pb-1 print:hidden"
        role="tablist"
        aria-label="Teses"
      >
        {TESES.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === "piso"}
            disabled={!t.pronta}
            className={cn(
              "shrink-0 rounded-lg border px-4 py-2 text-left transition-colors",
              t.id === "piso"
                ? "border-brand-navy bg-brand-navy text-white"
                : "cursor-not-allowed border-border bg-white text-muted-foreground",
            )}
          >
            <span className="block text-sm font-medium">{t.rotulo}</span>
            <span className={cn("block text-[11px]", t.id === "piso" ? "text-white/70" : "")}>
              {t.sub}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        {/* ---------------- Formulario ---------------- */}
        <div className="space-y-6 print:hidden">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">1. Município</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {municipios.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMunicipioId(m.id)}
                    className={cn(
                      "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
                      m.id === municipioId
                        ? "border-brand-navy bg-accent text-brand-navy"
                        : "border-border hover:bg-muted/50",
                    )}
                  >
                    {m.nome}-{m.uf}
                  </button>
                ))}
              </div>
              {perfil && (
                <div className="space-y-3 rounded-md border bg-muted/30 p-3 text-sm">
                  <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-[180px_1fr]">
                    <dt className="text-muted-foreground">Lei dos temporários</dt>
                    <dd>{perfil.temporarios.lei ?? <Pendente />}</dd>
                    <dt className="text-muted-foreground">13º e férias ao temporário</dt>
                    <dd>
                      {perfil.temporarios.preve13Ferias == null ? (
                        <Pendente />
                      ) : perfil.temporarios.preve13Ferias ? (
                        "Previstos na lei"
                      ) : (
                        "Não previstos (só com desvirtuamento)"
                      )}
                    </dd>
                    <dt className="text-muted-foreground">PCCR do magistério</dt>
                    <dd>{perfil.magisterio.pccr ?? <Pendente />}</dd>
                  </dl>
                  <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                    {perfil.observacoes.map((o) => (
                      <li key={o}>{o}</li>
                    ))}
                  </ul>
                  {perfil.fontes.length > 0 && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      {perfil.fontes.map((f) =>
                        f.url ? (
                          <a
                            key={f.descricao}
                            href={f.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-brand-navy underline-offset-2 hover:underline"
                          >
                            {f.descricao} <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          </a>
                        ) : (
                          <span key={f.descricao}>{f.descricao}</span>
                        ),
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">2. Contrato do professor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="nome">Nome (opcional, sai na impressão)</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex.: Maria da Silva"
                />
              </div>

              <div className="space-y-2">
                <Label>Períodos de contrato</Label>
                {periodos.map((p, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <Input
                      type="month"
                      aria-label={`Início do contrato ${i + 1}`}
                      value={p.inicio}
                      onChange={(e) => setPeriodo(i, "inicio", e.target.value)}
                      className="w-[170px]"
                    />
                    <span className="text-sm text-muted-foreground">até</span>
                    <Input
                      type="month"
                      aria-label={`Fim do contrato ${i + 1}`}
                      value={p.fim}
                      onChange={(e) => setPeriodo(i, "fim", e.target.value)}
                      className="w-[170px]"
                    />
                    {periodos.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remover período"
                        onClick={() => setPeriodos((ps) => ps.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPeriodos((ps) => [...ps, { inicio: "", fim: "" }])}
                >
                  <Plus className="mr-1 h-4 w-4" /> Outro contrato (renovação)
                </Button>
                {periodos.length > 1 && (
                  <p className="text-xs text-amber-800">
                    {periodos.length} contratos: renovações sucessivas reforçam o desvirtuamento
                    (Tema 551, item II).
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="horas">Jornada (horas mensais)</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      id="horas"
                      type="number"
                      min={1}
                      max={200}
                      value={horasMensais}
                      onChange={(e) => setHorasMensais(Number(e.target.value) || 0)}
                      className="w-24"
                    />
                    {perfil?.magisterio.jornadasMensais.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setHorasMensais(h)}
                        className={cn(
                          "rounded border px-2 py-1 text-xs",
                          h === horasMensais
                            ? "border-brand-navy bg-accent text-brand-navy"
                            : "hover:bg-muted/50",
                        )}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    = {Math.round((horasMensais / 200) * 40 * 10) / 10}h semanais ·{" "}
                    {Math.round((horasMensais / 200) * 100)}% do piso
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ajuizamento">Ajuizamento (prescrição de 5 anos)</Label>
                  <Input
                    id="ajuizamento"
                    type="month"
                    value={ajuizamento}
                    onChange={(e) => e.target.value && setAjuizamento(e.target.value)}
                    className="w-[170px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Entram os meses desde {fmtMes(inicioPrescricao)}.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-base">3. Vencimento-base pago</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Valor mensal do contracheque, só o vencimento (sem gratificações: ADI 4.167).
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copiarParaTodos}
                disabled={anos.length < 2}
              >
                Repetir em todos
              </Button>
            </CardHeader>
            <CardContent>
              {anos.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Informe um período de contrato dentro dos últimos 5 anos.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Ano</th>
                        <th className="py-2 pr-3 font-medium">Piso 40h</th>
                        <th className="py-2 pr-3 font-medium">Piso {horasMensais}h/mês</th>
                        <th className="py-2 font-medium">Pago por mês</th>
                      </tr>
                    </thead>
                    <tbody>
                      {anos.map((a) => {
                        const piso = PISO_MAGISTERIO[a];
                        const prop = piso != null ? (piso * horasMensais) / 200 : undefined;
                        const pago = vencimentoPorAno[a];
                        const abaixo = prop != null && pago != null && pago < prop;
                        return (
                          <tr key={a} className="border-b last:border-0">
                            <td className="py-2 pr-3 font-mono">{a}</td>
                            <td className="py-2 pr-3 font-mono text-muted-foreground">
                              {piso != null ? fmtBRL(piso) : "—"}
                            </td>
                            <td className="py-2 pr-3 font-mono">
                              {prop != null ? fmtBRL(prop) : "—"}
                            </td>
                            <td className="py-2">
                              <div className="flex items-center gap-2">
                                <Input
                                  inputMode="decimal"
                                  aria-label={`Vencimento pago em ${a}`}
                                  placeholder="ex.: 2.500,00"
                                  value={vencimentos[a] ?? ""}
                                  onChange={(e) =>
                                    setVencimentos((vs) => ({ ...vs, [a]: e.target.value }))
                                  }
                                  className={cn(
                                    "w-32 font-mono",
                                    abaixo && "border-red-300 bg-red-50",
                                  )}
                                />
                                {abaixo && (
                                  <span className="text-xs text-red-700">abaixo do piso</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-3 text-[11px] text-muted-foreground">{PISO_FONTE}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">4. Direitos incluídos</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <LinhaSwitch
                titulo="Reflexos em 13º e férias"
                descricao="Tema 551/STF: devidos ao temporário se a lei ou o contrato preveem, ou se houve renovações sucessivas."
                checked={reflexos}
                onChange={setReflexos}
                extra={
                  perfil?.temporarios.preve13Ferias == null ? (
                    <Pendente>conferir lei local</Pendente>
                  ) : undefined
                }
              />
              <LinhaSwitch
                titulo="A prefeitura pagou o 13º"
                descricao="Se pagou, entra só a diferença sobre o piso; se não pagou, o 13º inteiro."
                checked={pagou13}
                onChange={setPagou13}
                disabled={!reflexos}
              />
              <LinhaSwitch
                titulo="A prefeitura pagou o terço de férias"
                descricao="Se não pagou, entra o terço inteiro calculado sobre o piso."
                checked={pagouTerco}
                onChange={setPagouTerco}
                disabled={!reflexos}
              />
              <LinhaSwitch
                titulo="Férias não gozadas (indenizar)"
                descricao="Contratos encerrados sem férias: soma 1/12 do salário por mês trabalhado."
                checked={feriasNaoGozadas}
                onChange={setFeriasNaoGozadas}
                disabled={!reflexos}
              />
              <LinhaSwitch
                titulo="FGTS (contrato nulo)"
                descricao="Tema 916/STF: renovações além do prazo legal tornam o contrato nulo e geram o FGTS de 8%."
                checked={fgts}
                onChange={setFgts}
              />
            </CardContent>
          </Card>
        </div>

        {/* ---------------- Resultado ---------------- */}
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="hidden print:block">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Simulação ilustrativa
            </p>
            <h2 className="font-serif text-2xl font-semibold">
              Piso do magistério para professor temporário
            </h2>
            <p className="text-sm">
              {nome ? `${nome} · ` : ""}
              {perfil?.nome}-{perfil?.uf} · jornada de {horasMensais}h mensais ·{" "}
              {periodos
                .filter((p) => p.inicio && p.fim)
                .map((p) => `${fmtMes(p.inicio)} a ${fmtMes(p.fim)}`)
                .join("; ")}
            </p>
          </div>

          <Card className="overflow-hidden border-brand-navy/20">
            <div className="bg-brand-navy px-5 py-5 text-white">
              <p className="text-xs uppercase tracking-[0.12em] text-white/60">
                Estimativa atualizada
              </p>
              <p className="mt-1 font-mono text-4xl font-medium leading-none">
                {algumVencimento ? fmtBRL(total) : "—"}
              </p>
              <p className="mt-2 text-xs text-white/70">
                {algumVencimento
                  ? `${fmtBRL(r.totais.principal)} de principal + ${fmtBRL(r.correcao)} de correção (até ${fmtMes(ULTIMO_MES_INDICE)}) · ${r.totais.meses} meses`
                  : "Preencha o vencimento pago para ver a estimativa."}
              </p>
            </div>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-2">
                {rubricas.map((x) => (
                  <div key={x.rotulo} className="rounded-md bg-muted/50 px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">{x.rotulo}</p>
                    <p className="font-mono text-sm font-medium">{fmtBRL(x.valor)}</p>
                  </div>
                ))}
              </div>

              {r.anos.length > 0 && algumVencimento && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Por ano (atualizado)</p>
                  {r.anos.map((a) => (
                    <div key={a.ano} className="flex items-center gap-2 text-xs">
                      <span className="w-10 font-mono">{a.ano}</span>
                      <div className="h-3 flex-1 rounded-sm bg-muted">
                        <div
                          className="h-3 rounded-sm bg-brand-navy/80"
                          style={{ width: `${(a.atualizado / maxAno) * 100}%` }}
                        />
                      </div>
                      <span className="w-24 text-right font-mono">{fmtBRL(a.atualizado)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-md border p-3 print:hidden">
                <Label htmlFor="grupo" className="text-xs">
                  Servidores em situação parecida
                </Label>
                <div className="mt-1.5 flex items-center gap-3">
                  <Input
                    id="grupo"
                    type="number"
                    min={1}
                    value={grupo}
                    onChange={(e) => setGrupo(Math.max(1, Number(e.target.value) || 1))}
                    className="w-24"
                  />
                  {grupo > 1 && algumVencimento && (
                    <p className="text-sm">
                      ≈ <span className="font-mono font-semibold">{fmtBRL(total * grupo)}</span> no
                      grupo
                    </p>
                  )}
                </div>
              </div>

              {r.avisos.length > 0 && (
                <ul className="space-y-1.5">
                  {r.avisos.map((a) => (
                    <li key={a} className="flex gap-2 text-xs text-amber-900">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {a}
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap gap-2 print:hidden">
                <Button
                  type="button"
                  onClick={() => setApresentacao(true)}
                  disabled={!algumVencimento}
                >
                  <Maximize2 className="mr-1.5 h-4 w-4" /> Apresentar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.print()}
                  disabled={!algumVencimento}
                >
                  <Printer className="mr-1.5 h-4 w-4" /> Imprimir / PDF
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setMemoria((v) => !v)}
                  disabled={r.linhas.length === 0}
                >
                  {memoria ? "Ocultar memória" : "Memória mês a mês"}
                </Button>
              </div>

              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Estimativa ilustrativa, sem valor de cálculo judicial e sem promessa de resultado.
                Depende da documentação (contratos e contracheques), da lei municipal e do
                entendimento do Judiciário. Base: Tema 1.308/STF (ARE 1.487.739, j. 16/04/2026), Lei
                11.738/2008, Temas 551 e 916/STF; correção por IPCA-E até 11/2021 e SELIC a partir
                de 12/2021 (EC 113/2021).
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {memoria && r.linhas.length > 0 && (
        <Card className="print:break-before-page">
          <CardHeader>
            <CardTitle className="text-base">Memória de cálculo</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  {[
                    "Mês",
                    "Piso prop.",
                    "Pago",
                    "Diferença",
                    "13º",
                    "Férias",
                    "FGTS",
                    "Principal",
                    "Fator",
                    "Atualizado",
                  ].map((h) => (
                    <th key={h} className="py-2 pr-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-mono">
                {r.linhas.map((l) => (
                  <tr key={l.mes} className="border-b last:border-0">
                    <td className="py-1.5 pr-3">{fmtMes(l.mes)}</td>
                    <td className="py-1.5 pr-3">{fmtBRL(l.pisoProporcional)}</td>
                    <td className="py-1.5 pr-3">{fmtBRL(l.pago)}</td>
                    <td className="py-1.5 pr-3">{fmtBRL(l.diferenca)}</td>
                    <td className="py-1.5 pr-3">{fmtBRL(l.decimoTerceiro)}</td>
                    <td className="py-1.5 pr-3">{fmtBRL(l.ferias)}</td>
                    <td className="py-1.5 pr-3">{fmtBRL(l.fgts)}</td>
                    <td className="py-1.5 pr-3">{fmtBRL(l.principal)}</td>
                    <td className="py-1.5 pr-3">{l.fator.toFixed(4)}</td>
                    <td className="py-1.5 pr-3">{fmtBRL(l.atualizado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ---------------- Modo apresentacao (projetor/TV) ---------------- */}
      {apresentacao && (
        <div className="fixed inset-0 z-50 !mt-0 flex flex-col overflow-y-auto bg-brand-navy p-8 text-white md:p-14">
          <button
            type="button"
            onClick={() => setApresentacao(false)}
            aria-label="Fechar apresentação"
            className="absolute right-6 top-6 rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
          <p className="text-sm uppercase tracking-[0.2em] text-white/60">
            Professor temporário · {perfil?.nome}-{perfil?.uf}
          </p>
          <h2 className="mt-3 max-w-4xl font-serif text-3xl leading-tight md:text-5xl">
            O piso do magistério vale também para o professor contratado.
          </h2>
          <p className="mt-3 text-white/70 md:text-lg">
            STF, Tema 1.308 · julgado por unanimidade em 16/04/2026
          </p>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="text-white/60">
                Estimativa para um professor com {horasMensais}h mensais
              </p>
              <p className="mt-2 font-mono text-5xl font-medium md:text-7xl">{fmtBRL(total)}</p>
              <p className="mt-3 text-white/70">
                {r.totais.meses} meses · corrigido até {fmtMes(ULTIMO_MES_INDICE)}
              </p>
              {grupo > 1 && (
                <div className="mt-8 rounded-2xl bg-white/10 p-6">
                  <p className="text-white/70">{grupo} professores em situação parecida</p>
                  <p className="mt-1 font-mono text-4xl md:text-5xl">{fmtBRL(total * grupo)}</p>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {r.anos.map((a) => (
                <div key={a.ano} className="flex items-center gap-4">
                  <span className="w-14 font-mono text-lg">{a.ano}</span>
                  <div className="h-7 flex-1 rounded bg-white/10">
                    <div
                      className="h-7 rounded bg-white/80"
                      style={{ width: `${(a.atualizado / maxAno) * 100}%` }}
                    />
                  </div>
                  <span className="w-36 text-right font-mono text-lg">{fmtBRL(a.atualizado)}</span>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3 pt-4">
                {rubricas.map((x) => (
                  <div key={x.rotulo} className="rounded-xl bg-white/10 px-4 py-3">
                    <p className="text-sm text-white/60">{x.rotulo}</p>
                    <p className="font-mono text-xl">{fmtBRL(x.valor)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-auto pt-10 text-xs text-white/50">
            Estimativa ilustrativa, sem promessa de resultado. Valores dependem dos contracheques,
            da lei municipal e da decisão judicial.
          </p>
        </div>
      )}
    </div>
  );
}
