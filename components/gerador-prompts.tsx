"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, Eraser, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  buildPrompt,
  DESTINOS,
  FORMATOS,
  MODULOS,
  nivelForca,
  scorePrompt,
  type Cenario,
  type Modulo,
  type ValoresForm,
} from "@/lib/gerador-prompts";
import { cn } from "@/lib/utils";

type Props = {
  /** Ids dos modulos exibidos (default: todos). */
  modulos?: Array<Modulo["id"]>;
};

const VAZIO: ValoresForm = {
  campos: {},
  descobrir: [],
  web: false,
  fmt: FORMATOS[0],
  obs: "",
  destino: "generico",
};

function storageKey(modId: string, cenId: string) {
  return `gp.${modId}.${cenId}`;
}

function carregarRascunho(modId: string, cenId: string): ValoresForm {
  if (typeof window === "undefined") return VAZIO;
  try {
    const raw = window.localStorage.getItem(storageKey(modId, cenId));
    if (!raw) return VAZIO;
    const p = JSON.parse(raw) as Partial<ValoresForm>;
    return {
      campos: p.campos ?? {},
      descobrir: Array.isArray(p.descobrir) ? p.descobrir : [],
      web: Boolean(p.web),
      fmt: typeof p.fmt === "string" ? p.fmt : FORMATOS[0],
      obs: typeof p.obs === "string" ? p.obs : "",
      destino: typeof p.destino === "string" ? p.destino : "generico",
    };
  } catch {
    return VAZIO;
  }
}

export function GeradorPrompts({ modulos }: Props) {
  const listaModulos = useMemo(
    () => MODULOS.filter((m) => !modulos || modulos.includes(m.id)),
    [modulos],
  );

  const [modId, setModId] = useState(listaModulos[0]?.id ?? "tce");
  const [cenId, setCenId] = useState<string | null>(null);
  const [valores, setValores] = useState<ValoresForm>(VAZIO);
  const [copiado, setCopiado] = useState(false);

  const mod = listaModulos.find((m) => m.id === modId) ?? listaModulos[0];
  const cen: Cenario | undefined = mod?.cen.find((c) => c.id === cenId);

  const abrirCenario = useCallback(
    (id: string) => {
      setCenId(id);
      setValores(carregarRascunho(mod.id, id));
    },
    [mod],
  );

  // Persiste rascunho a cada alteracao
  useEffect(() => {
    if (!cen) return;
    try {
      window.localStorage.setItem(storageKey(mod.id, cen.id), JSON.stringify(valores));
    } catch {
      /* localStorage cheio/indisponivel: rascunho nao persiste, geracao segue normal */
    }
  }, [valores, mod, cen]);

  const prompt = cen ? buildPrompt(mod, cen, valores) : "";
  const score = cen ? scorePrompt(mod, valores) : 0;
  const nivel = nivelForca(score);
  const palavras = prompt ? prompt.split(/\s+/).filter(Boolean).length : 0;

  const setCampo = (id: string, valor: string) =>
    setValores((v) => ({ ...v, campos: { ...v.campos, [id]: valor } }));

  const toggleDescobrir = (i: number) =>
    setValores((v) => ({
      ...v,
      descobrir: v.descobrir.includes(i)
        ? v.descobrir.filter((x) => x !== i)
        : [...v.descobrir, i],
    }));

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = prompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  };

  if (!mod) return null;

  return (
    <div className="space-y-6">
      {/* Abas de modulo */}
      {listaModulos.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {listaModulos.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setModId(m.id);
                setCenId(null);
              }}
              className={cn(
                "flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors",
                m.id === mod.id
                  ? "border-brand-navy bg-brand-navy text-white"
                  : "bg-card text-muted-foreground hover:border-brand-navy/40 hover:text-foreground",
              )}
            >
              <span aria-hidden="true">{m.icon}</span>
              <span>
                {m.nome}
                <span
                  className={cn(
                    "block text-[10px] font-semibold uppercase tracking-wider",
                    m.id === mod.id ? "text-slate-300" : "text-muted-foreground/70",
                  )}
                >
                  {m.tag}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Passo 1: cards de cenario */}
      <div>
        <h2 className="text-lg font-semibold">{mod.titulo}</h2>
        <p className="mt-1 max-w-3xl text-xs text-muted-foreground">{mod.sub}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {mod.cen.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => abrirCenario(c.id)}
            className={cn(
              "rounded-lg border bg-card p-4 text-left transition-colors hover:border-brand-navy/50 hover:bg-muted/40",
              c.id === cenId && "border-brand-navy ring-1 ring-brand-navy/30",
            )}
          >
            <span className="text-xl" aria-hidden="true">
              {c.ico}
            </span>
            <p className="mt-1.5 text-sm font-semibold leading-snug">{c.tit}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.desc}</p>
            <span className="mt-2 inline-block rounded-full border border-brand-navy/25 bg-brand-navy/5 px-2 py-0.5 font-mono text-[10px] font-medium text-brand-navy">
              ⏱ {c.prazo}
            </span>
          </button>
        ))}
      </div>

      {/* Passos 2 e 3: formulario + prompt */}
      {cen && (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(340px,46%)_1fr]">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <span aria-hidden="true">{cen.ico}</span> {cen.tit}
              </CardTitle>
              <p
                className="text-xs leading-relaxed text-muted-foreground [&_b]:font-semibold [&_b]:text-brand-navy"
                dangerouslySetInnerHTML={{ __html: `<b>Base normativa:</b> ${cen.base}` }}
              />
              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setCenId(null)}>
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Trocar peça
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    try {
                      window.localStorage.removeItem(storageKey(mod.id, cen.id));
                    } catch {
                      /* sem localStorage, nada a limpar */
                    }
                    setValores(VAZIO);
                  }}
                >
                  <Eraser className="mr-1.5 h-3.5 w-3.5" /> Limpar campos
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {mod.fields.map((f) => (
                <div key={f.id} className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    {f.l}
                    {f.req && <span className="ml-0.5 text-red-600">*</span>}
                  </Label>
                  {f.t === "text" && (
                    <Input
                      value={valores.campos[f.id] ?? ""}
                      placeholder={f.ph}
                      onChange={(e) => setCampo(f.id, e.target.value)}
                    />
                  )}
                  {f.t === "ta" && (
                    <Textarea
                      value={valores.campos[f.id] ?? ""}
                      placeholder={f.ph}
                      rows={3}
                      onChange={(e) => setCampo(f.id, e.target.value)}
                    />
                  )}
                  {f.t === "select" && (
                    <select
                      value={valores.campos[f.id] ?? f.opts?.[0] ?? ""}
                      onChange={(e) => setCampo(f.id, e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {f.opts?.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  )}
                  {f.help && <p className="text-[11px] text-muted-foreground">{f.help}</p>}
                </div>
              ))}

              <div className="space-y-2">
                <Label className="text-xs font-semibold">
                  O que você quer descobrir?<span className="ml-0.5 text-red-600">*</span>
                </Label>
                <div className="space-y-1.5">
                  {cen.descobrir.map((d, i) => (
                    <label
                      key={d}
                      className="flex cursor-pointer items-start gap-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Checkbox
                        checked={valores.descobrir.includes(i)}
                        onChange={() => toggleDescobrir(i)}
                        className="mt-0.5"
                      />
                      <span>{d}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-2 rounded-md border border-dashed border-brand-navy/30 bg-brand-navy/5 p-3 text-xs">
                <Checkbox
                  checked={valores.web}
                  onChange={() => setValores((v) => ({ ...v, web: !v.web }))}
                  className="mt-0.5"
                />
                <span>
                  <b className="font-semibold">Verificar mudanças recentes na web</b> (que ainda
                  não estão nos documentos) — cruza as fontes locais com publicações oficiais em
                  tempo real.
                </span>
              </label>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Onde você vai usar o prompt</Label>
                <select
                  value={valores.destino}
                  onChange={(e) => setValores((v) => ({ ...v, destino: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {DESTINOS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Muda só a forma de citar as fontes. O prompt funciona em qualquer IA.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Formato da resposta</Label>
                <select
                  value={valores.fmt}
                  onChange={(e) => setValores((v) => ({ ...v, fmt: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {FORMATOS.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Observações e instruções extras</Label>
                <Textarea
                  value={valores.obs}
                  rows={2}
                  placeholder="Qualquer orientação adicional para a IA: tom, limite de páginas da análise, ponto que merece atenção especial..."
                  onChange={(e) => setValores((v) => ({ ...v, obs: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="xl:sticky xl:top-4">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Prompt gerado</CardTitle>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {prompt.length} caracteres · {palavras} palavras
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        score < 35 ? "bg-red-500" : score < 60 ? "bg-amber-500" : score < 85 ? "bg-emerald-500" : "bg-brand-navy",
                      )}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <span className={cn("font-mono text-[10px] font-bold", nivel.cor)}>
                    {nivel.nome} {score}%
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <pre className="max-h-[540px] overflow-y-auto whitespace-pre-wrap break-words rounded-md border bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100">
                {prompt}
              </pre>
              <Button onClick={copiar} className="w-full bg-brand-navy hover:bg-brand-navy/90">
                {copiado ? (
                  <>
                    <Check className="mr-2 h-4 w-4" /> Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" /> Copiar prompt
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Como usar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-[0.14em] text-brand-navy">
            Como usar este prompt
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1.5 pl-5 text-xs text-muted-foreground">
            <li>
              Funciona em <b className="text-foreground">qualquer IA</b> — Claude, ChatGPT,
              Gemini, NotebookLM. Anexe (ou cole) os documentos do caso: a peça atacada ou o
              relatório, os autos relevantes, a legislação aplicável e a jurisprudência que você
              já separou.
            </li>
            <li>
              Cole o prompt na conversa <b className="text-foreground">depois</b> de anexar os
              documentos. Se a IA não tiver os arquivos, ela vai avisar em vez de inventar.
            </li>
            <li>
              <b className="text-foreground">Sempre confira as citações</b> direto na fonte
              original antes de levar o resultado à peça final — o prompt pede a transcrição do
              trecho justamente para facilitar essa conferência.
            </li>
            <li>
              Se a resposta vier rasa, peça:{" "}
              <b className="text-foreground">&quot;aprofunde com base nos trechos exatos dos documentos [X, Y]&quot;</b>.
            </li>
            <li>
              Para dados sigilosos, prefira contas corporativas (Claude/ChatGPT Team ou Enterprise,
              Google Workspace Business) — atenção à LGPD.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
