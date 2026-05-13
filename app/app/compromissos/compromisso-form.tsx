"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { BANCAS, bancaDotClasses, getBanca } from "@/lib/bancas";

import type { CalendarEvento, CompromissoCategoriaEvento } from "./types";
import type {
  AdvogadoOption,
  ProcessoTceOption,
  ProcessoJudOption,
} from "./compromissos-view";

const TIPOS: { value: string; label: string }[] = [
  { value: "REUNIAO", label: "Reuniao" },
  { value: "AUDIENCIA", label: "Audiencia" },
  { value: "SUSTENTACAO", label: "Sustentacao Oral" },
  { value: "DESPACHO_PRESENCIAL", label: "Despacho Presencial" },
  { value: "VIAGEM", label: "Viagem" },
  { value: "PESSOAL", label: "Pessoal" },
  { value: "OUTRO", label: "Outro" },
];

type Props = {
  mode: "create" | "edit";
  evento?: CalendarEvento | null;
  dataInicialIso?: string | null;
  usuario: { id: string; nome: string };
  isAdmin: boolean;
  podeUsarPrivadas: boolean;
  advogados: AdvogadoOption[];
  processosTce: ProcessoTceOption[];
  processosJud: ProcessoJudOption[];
  onSuccess: () => void;
  onCancel?: () => void;
};

function splitIso(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return { date: `${y}-${m}-${dd}`, time: `${hh}:${mi}` };
}

function combineDateTime(date: string, time: string): string | null {
  if (!date) return null;
  const t = time || "09:00";
  return new Date(`${date}T${t}:00`).toISOString();
}

function addOneHour(hhmm: string): string {
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return "10:00";
  const [h, m] = hhmm.split(":").map(Number);
  const next = (h + 1) % 24;
  return `${String(next).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function CompromissoForm({
  mode,
  evento,
  dataInicialIso,
  usuario,
  isAdmin,
  podeUsarPrivadas,
  advogados,
  processosTce,
  processosJud,
  onSuccess,
  onCancel,
}: Props) {
  const { toast } = useToast();
  const inicial = evento
    ? splitIso(evento.dataInicio)
    : splitIso(dataInicialIso ?? null);
  const fim = evento ? splitIso(evento.dataFim) : { date: "", time: "" };

  const [titulo, setTitulo] = React.useState(evento?.titulo ?? "");
  const [tipo, setTipo] = React.useState<string>(evento?.tipo ?? "REUNIAO");
  const [categoria, setCategoria] =
    React.useState<CompromissoCategoriaEvento>(
      evento?.categoria ?? "ESCRITORIO",
    );
  const horaInicialDefault = inicial.time || "09:00";
  const [dateInicio, setDateInicio] = React.useState(inicial.date);
  const [horaInicio, setHoraInicio] = React.useState(horaInicialDefault);
  const [dateFim, setDateFim] = React.useState(
    fim.date || (mode === "create" && dataInicialIso ? inicial.date : ""),
  );
  const [horaFim, setHoraFim] = React.useState(
    fim.time ||
      (mode === "create" && dataInicialIso
        ? addOneHour(horaInicialDefault)
        : ""),
  );
  const [diaInteiro, setDiaInteiro] = React.useState(
    evento?.diaInteiro ?? false,
  );
  const [cor, setCor] = React.useState(evento?.cor ?? "#3b82f6");
  const [local, setLocal] = React.useState(evento?.local ?? "");
  const [descricao, setDescricao] = React.useState(evento?.descricao ?? "");
  const [advogadoId, setAdvogadoId] = React.useState(
    evento?.advogado?.id ?? usuario.id,
  );
  const [escritorioResponsavelSlug, setEscritorioResponsavelSlug] =
    React.useState<string>(evento?.escritorioResponsavelSlug ?? "");
  const [vinculo, setVinculo] = React.useState<"nenhum" | "tce" | "judicial">(
    evento?.processoRef
      ? evento.processoRef.tipo === "tce"
        ? "tce"
        : "judicial"
      : "nenhum",
  );
  const [processoTceId, setProcessoTceId] = React.useState(
    evento?.processoRef?.tipo === "tce" ? evento.processoRef.id : "",
  );
  const [processoId, setProcessoId] = React.useState(
    evento?.processoRef?.tipo === "judicial" ? evento.processoRef.id : "",
  );
  const [submitting, setSubmitting] = React.useState(false);

  const processoTceSelecionado = React.useMemo(
    () => processosTce.find((p) => p.id === processoTceId),
    [processosTce, processoTceId],
  );
  const processoJudSelecionado = React.useMemo(
    () => processosJud.find((p) => p.id === processoId),
    [processosJud, processoId],
  );
  const bancasDoProcesso: string[] = React.useMemo(() => {
    if (vinculo === "tce" && processoTceSelecionado) {
      return processoTceSelecionado.bancasSlug ?? [];
    }
    if (vinculo === "judicial" && processoJudSelecionado) {
      return processoJudSelecionado.bancasSlug ?? [];
    }
    return [];
  }, [vinculo, processoTceSelecionado, processoJudSelecionado]);

  // Auto-preenche o escritorio responsavel quando o processo vinculado tem
  // uma unica banca; se tiver multiplas, mantem a escolha atual se ainda for
  // valida, ou limpa.
  const processoChaveAuto = React.useRef<string>("");
  React.useEffect(() => {
    const chave = `${vinculo}:${processoTceId}:${processoId}`;
    if (processoChaveAuto.current === chave) return;
    processoChaveAuto.current = chave;
    if (vinculo === "nenhum") return;
    if (bancasDoProcesso.length === 1) {
      setEscritorioResponsavelSlug(bancasDoProcesso[0]);
    } else if (bancasDoProcesso.length > 1) {
      if (
        escritorioResponsavelSlug &&
        !bancasDoProcesso.includes(escritorioResponsavelSlug)
      ) {
        setEscritorioResponsavelSlug("");
      }
    }
  }, [
    vinculo,
    processoTceId,
    processoId,
    bancasDoProcesso,
    escritorioResponsavelSlug,
  ]);

  async function salvar() {
    if (!titulo.trim()) {
      toast({ variant: "destructive", title: "Informe o titulo" });
      return;
    }
    if (!dateInicio) {
      toast({ variant: "destructive", title: "Informe a data de inicio" });
      return;
    }
    const dataInicio = combineDateTime(
      dateInicio,
      diaInteiro ? "00:00" : horaInicio,
    );
    const dataFim =
      dateFim && !diaInteiro
        ? combineDateTime(dateFim, horaFim || "23:59")
        : null;

    const categoriaFinal: CompromissoCategoriaEvento = podeUsarPrivadas
      ? categoria
      : "ESCRITORIO";

    const body = {
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      dataInicio,
      dataFim,
      diaInteiro,
      cor,
      tipo,
      categoria: categoriaFinal,
      escritorioResponsavelSlug: escritorioResponsavelSlug || null,
      local: local.trim() || null,
      advogadoId,
      processoTceId: vinculo === "tce" ? processoTceId || null : null,
      processoId: vinculo === "judicial" ? processoId || null : null,
    };

    setSubmitting(true);
    try {
      const url =
        mode === "edit" && evento
          ? `/api/compromissos/${evento.id}`
          : "/api/compromissos";
      const method = mode === "edit" ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title:
            mode === "edit" ? "Erro ao salvar" : "Erro ao criar compromisso",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toast({
        title:
          mode === "edit" ? "Compromisso atualizado" : "Compromisso criado",
      });
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  }

  const categoriaOpcoes: {
    value: CompromissoCategoriaEvento;
    label: string;
    flag: string;
    flagClass: string;
  }[] = [
    {
      value: "ESCRITORIO",
      label: "Escritorio",
      flag: "PRC",
      flagClass: "bg-blue-600 text-white",
    },
    {
      value: "PROFISSIONAL_PRIVADO",
      label: "Profissional Privado (GM)",
      flag: "GM",
      flagClass: "bg-purple-600 text-white",
    },
    {
      value: "PESSOAL",
      label: "Pessoal",
      flag: "P",
      flagClass: "bg-emerald-600 text-white",
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
      {podeUsarPrivadas && (
        <div className="space-y-1.5">
          <Label>Categoria</Label>
          <div className="grid grid-cols-3 gap-2">
            {categoriaOpcoes.map((opt) => {
              const ativo = categoria === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCategoria(opt.value)}
                  className={
                    "flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-xs font-medium transition-colors " +
                    (ativo
                      ? "border-brand-navy bg-brand-navy/5 text-brand-navy"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")
                  }
                >
                  <span
                    className={
                      "inline-flex h-5 min-w-[26px] items-center justify-center rounded px-1 text-[9px] font-bold uppercase tracking-wide " +
                      opt.flagClass
                    }
                  >
                    {opt.flag}
                  </span>
                  <span className="leading-tight">{opt.label}</span>
                </button>
              );
            })}
          </div>
          {categoria !== "ESCRITORIO" && (
            <p className="text-[11px] text-amber-700">
              Compromisso privado: visivel apenas para voce e nao entra em
              relatorios do escritorio.
            </p>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label>
          Titulo <span className="text-red-600">*</span>
        </Label>
        <Input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex.: Reuniao com cliente"
          autoFocus={mode === "create"}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Tipo</Label>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIPOS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>
            Data inicio <span className="text-red-600">*</span>
          </Label>
          <Input
            type="date"
            value={dateInicio}
            onChange={(e) => setDateInicio(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Hora inicio</Label>
          <Input
            type="time"
            value={horaInicio}
            disabled={diaInteiro}
            onChange={(e) => setHoraInicio(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Data fim (opcional)</Label>
          <Input
            type="date"
            value={dateFim}
            onChange={(e) => setDateFim(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Hora fim</Label>
          <Input
            type="time"
            value={horaFim}
            disabled={diaInteiro}
            onChange={(e) => setHoraFim(e.target.value)}
          />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-md border bg-slate-50 px-3 py-2">
        <Switch
          checked={diaInteiro}
          onCheckedChange={setDiaInteiro}
          ariaLabel="Dia inteiro"
        />
        <span className="text-sm">Dia inteiro</span>
      </label>

      <div className="grid grid-cols-[120px_1fr] gap-3">
        <div className="space-y-1.5">
          <Label>Cor</Label>
          <Input
            type="color"
            value={cor}
            onChange={(e) => setCor(e.target.value)}
            className="h-10 w-full cursor-pointer p-1"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Local</Label>
          <Input
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            placeholder="Ex.: Forum, sala 305"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Descricao</Label>
        <Textarea
          rows={2}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Detalhes adicionais..."
        />
      </div>

      <div className="space-y-1.5">
        <Label>Vincular a processo (opcional)</Label>
        <Select
          value={vinculo}
          onValueChange={(v) =>
            setVinculo(v as "nenhum" | "tce" | "judicial")
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nenhum">Sem vinculo</SelectItem>
            <SelectItem value="tce">Processo TCE</SelectItem>
            <SelectItem value="judicial">Processo Judicial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {vinculo === "tce" && (
        <div className="space-y-1.5">
          <Label>Processo TCE</Label>
          <Select value={processoTceId} onValueChange={setProcessoTceId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o processo" />
            </SelectTrigger>
            <SelectContent>
              {processosTce.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.numero}
                  {p.municipio ? ` — ${p.municipio}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {vinculo === "judicial" && (
        <div className="space-y-1.5">
          <Label>Processo Judicial</Label>
          <Select value={processoId} onValueChange={setProcessoId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o processo" />
            </SelectTrigger>
            <SelectContent>
              {processosJud.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.numero} — {p.gestor}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Escritorio responsavel</Label>
        <Select
          value={escritorioResponsavelSlug || "__nenhum__"}
          onValueChange={(v) =>
            setEscritorioResponsavelSlug(v === "__nenhum__" ? "" : v)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Sem escritorio responsavel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__nenhum__">
              <span className="text-slate-500">Sem escritorio</span>
            </SelectItem>
            {(bancasDoProcesso.length > 0
              ? BANCAS.filter((b) => bancasDoProcesso.includes(b.slug))
              : BANCAS
            ).map((b) => (
              <SelectItem key={b.slug} value={b.slug}>
                <span className="flex items-center gap-2">
                  <span
                    className={
                      "inline-block h-2.5 w-2.5 rounded-full " +
                      bancaDotClasses(b.cor)
                    }
                  />
                  <span className="font-mono text-[11px] font-bold">
                    {b.sigla}
                  </span>
                  <span>— {b.nome}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {escritorioResponsavelSlug &&
          getBanca(escritorioResponsavelSlug) === null && (
            <p className="text-[11px] text-amber-700">
              Escritorio invalido para esse processo. Selecione outro.
            </p>
          )}
      </div>

      <div className="space-y-1.5">
        <Label>
          Advogado responsavel <span className="text-red-600">*</span>
        </Label>
        <Select
          value={advogadoId}
          onValueChange={setAdvogadoId}
          disabled={!isAdmin}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {advogados.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      </div>
      <div className="flex shrink-0 items-center justify-end gap-2 border-t bg-white px-6 py-3">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancelar
          </Button>
        )}
        <Button
          type="button"
          onClick={salvar}
          disabled={submitting}
          className="bg-brand-navy hover:bg-brand-navy/90"
        >
          {submitting
            ? "Salvando..."
            : mode === "edit"
              ? "Salvar"
              : "Cadastrar"}
        </Button>
      </div>
    </div>
  );
}
