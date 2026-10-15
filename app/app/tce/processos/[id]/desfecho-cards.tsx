"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CamaraTce, ResultadoRecursoTce, TipoProcessoTce } from "@prisma/client";
import { Gavel, Pencil, Scale } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { diaDe, formatarDia } from "@/lib/datas";
import {
  RECURSO_MANTEM_RESULTADO,
  RESULTADOS_POR_TIPO_TCE,
  RESULTADO_RECURSO_LABELS,
  classeBadgeResultado,
  classificarResultadoRecurso,
  classificarResultadoTce,
} from "@/lib/julgamento-config";
import { TCE_CAMARA_LABELS } from "@/lib/tce-config";
import { cn } from "@/lib/utils";

export type DesfechoRecurso = {
  resultadoRecurso: ResultadoRecursoTce | null;
  numeroAcordao: string | null;
  orgaoJulgador: CamaraTce | null;
  dataSessao: string | null;
  dataTransito: string | null;
};

export type RecursoResumo = DesfechoRecurso & {
  id: string;
  numero: string;
  julgado: boolean;
};

const API = "/api/tce/pendencias";
const MANTIDO = "__mantido__";

async function enviar(body: Record<string, unknown>) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, erro: (json as { error?: string }).error };
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  if (!valor) return null;
  return (
    <p>
      <span className="font-semibold text-slate-700">{rotulo}:</span> {valor}
    </p>
  );
}

// ============================ RECURSO: desfecho proprio ============================

export function CardDesfechoRecurso({
  processoId,
  desfecho,
  observacoes,
}: {
  processoId: string;
  desfecho: DesfechoRecurso;
  observacoes: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [aberto, setAberto] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const d = desfecho;
  const classe = classificarResultadoRecurso(d.resultadoRecurso);

  async function desfazer() {
    if (!window.confirm("Desfazer o desfecho deste recurso?")) return;
    setBusy(true);
    const r = await enviar({ acao: "desfazer_desfecho_recurso", processoId });
    setBusy(false);
    if (!r.ok) return toast({ variant: "destructive", title: "Erro", description: r.erro });
    toast({ title: "Desfecho desfeito" });
    router.refresh();
  }

  return (
    <Card id="card-julgamento" className="scroll-mt-24 border border-slate-200 bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gavel className="h-4 w-4" />
          Desfecho do recurso
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!d.resultadoRecurso ? (
          <>
            <p className="text-sm text-slate-600">Desfecho do recurso ainda nao registrado.</p>
            <Button size="sm" className="bg-brand-navy hover:bg-brand-navy/90" onClick={() => setAberto(true)}>
              <Gavel className="mr-1 h-3.5 w-3.5" />
              Registrar desfecho
            </Button>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold uppercase tracking-wide",
                  classeBadgeResultado(classe),
                )}
              >
                {RESULTADO_RECURSO_LABELS[d.resultadoRecurso]}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setAberto(true)} disabled={busy}>
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  onClick={desfazer}
                  disabled={busy}
                >
                  Desfazer
                </Button>
              </div>
            </div>
            <div className="rounded-md border bg-white px-3 py-2 text-xs">
              <Linha rotulo="Acordao" valor={d.numeroAcordao} />
              <Linha rotulo="Orgao julgador" valor={d.orgaoJulgador ? TCE_CAMARA_LABELS[d.orgaoJulgador] : null} />
              <Linha rotulo="Sessao" valor={d.dataSessao ? formatarDia(d.dataSessao) : null} />
              <Linha rotulo="Transito em julgado" valor={d.dataTransito ? formatarDia(d.dataTransito) : null} />
            </div>
          </>
        )}
        {observacoes && (
          <div className="rounded-md border bg-white px-3 py-2 text-xs">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Observacoes</p>
            <p className="mt-1 whitespace-pre-wrap text-slate-700">{observacoes}</p>
          </div>
        )}
        <DialogDesfechoRecurso
          aberto={aberto}
          onAberto={setAberto}
          processoId={processoId}
          inicial={d}
          observacoes={observacoes}
        />
      </CardContent>
    </Card>
  );
}

function DialogDesfechoRecurso({
  aberto,
  onAberto,
  processoId,
  inicial,
  observacoes,
}: {
  aberto: boolean;
  onAberto: (v: boolean) => void;
  processoId: string;
  inicial: DesfechoRecurso;
  observacoes: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [resultado, setResultado] = React.useState<string>("");
  const [sessao, setSessao] = React.useState("");
  const [acordao, setAcordao] = React.useState("");
  const [orgao, setOrgao] = React.useState<string>("");
  const [transito, setTransito] = React.useState("");
  const [obs, setObs] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!aberto) return;
    setResultado(inicial.resultadoRecurso ?? "");
    setSessao(inicial.dataSessao ? diaDe(inicial.dataSessao) : "");
    setAcordao(inicial.numeroAcordao ?? "");
    setOrgao(inicial.orgaoJulgador ?? "");
    setTransito(inicial.dataTransito ? diaDe(inicial.dataTransito) : "");
    setObs(observacoes ?? "");
  }, [aberto, inicial, observacoes]);

  async function salvar() {
    if (!resultado || !sessao) {
      toast({ variant: "destructive", title: "Informe o desfecho e a data da sessao" });
      return;
    }
    setBusy(true);
    const r = await enviar({
      acao: "registrar_desfecho_recurso",
      processoId,
      resultadoRecurso: resultado,
      dataSessao: sessao,
      numeroAcordao: acordao || null,
      orgaoJulgador: orgao || null,
      dataTransito: transito || null,
      observacoes: obs || null,
    });
    setBusy(false);
    if (!r.ok) return toast({ variant: "destructive", title: "Erro ao salvar", description: r.erro });
    toast({ title: "Desfecho do recurso registrado" });
    onAberto(false);
    router.refresh();
  }

  return (
    <Dialog open={aberto} onOpenChange={onAberto}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desfecho do recurso</DialogTitle>
          <DialogDescription>
            O resultado do processo de origem nao e alterado aqui.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Desfecho *</Label>
              <Select value={resultado} onValueChange={setResultado}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RESULTADO_RECURSO_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Data da sessao *</Label>
              <Input type="date" value={sessao} onChange={(e) => setSessao(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Numero do acordao</Label>
              <Input value={acordao} onChange={(e) => setAcordao(e.target.value)} placeholder="Ex.: 1596/2021" />
            </div>
            <div className="space-y-1.5">
              <Label>Orgao julgador</Label>
              <Select value={orgao} onValueChange={setOrgao}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TCE_CAMARA_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Transito em julgado</Label>
              <Input type="date" value={transito} onChange={(e) => setTransito(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Observacoes</Label>
            <Textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onAberto(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={salvar} disabled={busy} className="bg-brand-navy hover:bg-brand-navy/90">
            {busy ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ======================= PROCESSO DE ORIGEM: desfecho apos recursos =======================

export function CardDesfechoAposRecursos({
  processoId,
  tipo,
  resultadoInicial,
  resultadoFinal,
  dataTransito,
  recursos,
}: {
  processoId: string;
  tipo: TipoProcessoTce;
  resultadoInicial: string | null;
  resultadoFinal: string | null;
  dataTransito: string | null;
  recursos: RecursoResumo[];
}) {
  const [aberto, setAberto] = React.useState(false);

  const comDesfecho = recursos.filter((r) => r.resultadoRecurso);
  const pendentes = recursos.filter((r) => !r.resultadoRecurso);
  const alterou = comDesfecho.some((r) => !RECURSO_MANTEM_RESULTADO.includes(r.resultadoRecurso!));

  // Transito do processo = o ultimo entre ele e os recursos.
  const transitos = [dataTransito, ...recursos.map((r) => r.dataTransito)].filter(Boolean) as string[];
  const ultimoTransito = transitos.length
    ? transitos.reduce((a, b) => (diaDe(a) >= diaDe(b) ? a : b))
    : null;

  let situacao: { texto: string; classe: Parameters<typeof classeBadgeResultado>[0] | null; dica?: string };
  if (resultadoFinal) {
    situacao = { texto: resultadoFinal, classe: classificarResultadoTce(tipo, resultadoFinal), dica: "Definido manualmente." };
  } else if (!comDesfecho.length) {
    situacao = { texto: "Recursos sem desfecho registrado", classe: null };
  } else if (alterou) {
    situacao = { texto: "Alterado em recurso", classe: "parcial", dica: "Algum recurso foi provido: defina o desfecho final." };
  } else if (pendentes.length) {
    situacao = { texto: "Resultado inicial mantido ate aqui", classe: null, dica: `${pendentes.length} recurso(s) sem desfecho registrado.` };
  } else {
    situacao = {
      texto: resultadoInicial ? `${resultadoInicial} (mantido)` : "Resultado inicial mantido",
      classe: classificarResultadoTce(tipo, resultadoInicial),
      dica: "Nenhum recurso alterou o resultado inicial.",
    };
  }

  return (
    <Card id="card-desfecho-final" className="scroll-mt-24 border border-slate-200 bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Desfecho apos recursos
          </span>
          <Button variant="outline" size="sm" onClick={() => setAberto(true)}>
            <Pencil className="mr-1 h-3.5 w-3.5" />
            Definir
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold uppercase tracking-wide",
              situacao.classe ? classeBadgeResultado(situacao.classe) : "border-slate-300 bg-slate-50 text-slate-700",
            )}
          >
            {situacao.texto}
          </span>
          {situacao.dica && <p className="text-xs text-muted-foreground">{situacao.dica}</p>}
          {ultimoTransito && (
            <p className="text-xs text-muted-foreground">Transito em julgado: {formatarDia(ultimoTransito)}</p>
          )}
        </div>

        <ol className="space-y-1 rounded-md border bg-white px-3 py-2 text-xs">
          {recursos.map((r) => (
            <li key={r.id} className="flex flex-wrap items-baseline gap-x-2">
              <Link href={`/app/tce/processos/${r.id}`} className="font-mono font-semibold text-brand-navy hover:underline">
                {r.numero}
              </Link>
              <span className={r.resultadoRecurso ? "font-medium text-slate-800" : "text-slate-500"}>
                {r.resultadoRecurso ? RESULTADO_RECURSO_LABELS[r.resultadoRecurso] : "sem desfecho registrado"}
              </span>
              {r.numeroAcordao && <span className="text-slate-500">Ac. {r.numeroAcordao}</span>}
              {r.orgaoJulgador && <span className="text-slate-500">{TCE_CAMARA_LABELS[r.orgaoJulgador]}</span>}
              {r.dataSessao && <span className="text-slate-500">sessao {formatarDia(r.dataSessao)}</span>}
              {r.dataTransito && <span className="text-slate-500">transito {formatarDia(r.dataTransito)}</span>}
            </li>
          ))}
        </ol>

        <DialogDesfechoFinal
          aberto={aberto}
          onAberto={setAberto}
          processoId={processoId}
          tipo={tipo}
          resultadoFinal={resultadoFinal}
          dataTransito={dataTransito}
        />
      </CardContent>
    </Card>
  );
}

function DialogDesfechoFinal({
  aberto,
  onAberto,
  processoId,
  tipo,
  resultadoFinal,
  dataTransito,
}: {
  aberto: boolean;
  onAberto: (v: boolean) => void;
  processoId: string;
  tipo: TipoProcessoTce;
  resultadoFinal: string | null;
  dataTransito: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [valor, setValor] = React.useState(MANTIDO);
  const [transito, setTransito] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!aberto) return;
    setValor(resultadoFinal ?? MANTIDO);
    setTransito(dataTransito ? diaDe(dataTransito) : "");
  }, [aberto, resultadoFinal, dataTransito]);

  async function salvar() {
    setBusy(true);
    const r = await enviar({
      acao: "registrar_desfecho_final",
      processoId,
      resultadoFinal: valor === MANTIDO ? null : valor,
      dataTransito: transito || null,
    });
    setBusy(false);
    if (!r.ok) return toast({ variant: "destructive", title: "Erro ao salvar", description: r.erro });
    toast({ title: "Desfecho apos recursos atualizado" });
    onAberto(false);
    router.refresh();
  }

  return (
    <Dialog open={aberto} onOpenChange={onAberto}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desfecho apos recursos</DialogTitle>
          <DialogDescription>
            Use quando um recurso alterou o resultado inicial. O resultado inicial continua guardado.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Desfecho</Label>
            <Select value={valor} onValueChange={setValor}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={MANTIDO}>Automatico (pelos recursos)</SelectItem>
                {RESULTADOS_POR_TIPO_TCE[tipo].map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Transito em julgado do processo</Label>
            <Input type="date" value={transito} onChange={(e) => setTransito(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onAberto(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={salvar} disabled={busy} className="bg-brand-navy hover:bg-brand-navy/90">
            {busy ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
