"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  CLASSES_ELEITORAIS,
  POLOS_ELEITORAIS,
  STATUS_ELEITORAIS,
} from "@/lib/eleitoral-labels";

export type UsuarioOption = { id: string; nome: string };

export type ProcessoEleitoralInitial = {
  id: string;
  numero: string;
  classe: string;
  apelido: string | null;
  parteAutora: string;
  parteRe: string;
  polo: string;
  objeto: string;
  relator: string | null;
  status: string;
  resultado: string | null;
  observacoes: string | null;
  coordenadorId: string | null;
  advogadoRespId: string | null;
};

type Props = {
  mode: "create" | "edit";
  processo?: ProcessoEleitoralInitial;
  usuarios: UsuarioOption[];
  trigger: React.ReactNode;
};

const NENHUM = "__nenhum__";

export function ProcessoFormDialog({ mode, processo, usuarios, trigger }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [numero, setNumero] = React.useState(processo?.numero ?? "");
  const [classe, setClasse] = React.useState(processo?.classe ?? "REPRESENTACAO");
  const [apelido, setApelido] = React.useState(processo?.apelido ?? "");
  const [parteAutora, setParteAutora] = React.useState(processo?.parteAutora ?? "");
  const [parteRe, setParteRe] = React.useState(processo?.parteRe ?? "");
  const [polo, setPolo] = React.useState(processo?.polo ?? "PASSIVO");
  const [objeto, setObjeto] = React.useState(processo?.objeto ?? "");
  const [relator, setRelator] = React.useState(processo?.relator ?? "");
  const [status, setStatus] = React.useState(processo?.status ?? "EM_TRAMITACAO");
  const [resultado, setResultado] = React.useState(processo?.resultado ?? "");
  const [observacoes, setObservacoes] = React.useState(processo?.observacoes ?? "");
  const [coordenadorId, setCoordenadorId] = React.useState(
    processo?.coordenadorId ?? NENHUM,
  );
  const [advogadoRespId, setAdvogadoRespId] = React.useState(
    processo?.advogadoRespId ?? NENHUM,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        numero,
        classe,
        apelido: apelido || null,
        parteAutora,
        parteRe,
        polo,
        objeto,
        relator: relator || null,
        observacoes: observacoes || null,
        coordenadorId: coordenadorId === NENHUM ? null : coordenadorId,
        advogadoRespId: advogadoRespId === NENHUM ? null : advogadoRespId,
        ...(mode === "edit" ? { status, resultado: resultado || null } : {}),
      };
      const res = await fetch(
        mode === "create"
          ? "/api/eleitoral/processos"
          : `/api/eleitoral/processos/${processo!.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error ?? "Falha ao salvar o processo");
      }
      toast({
        title: mode === "create" ? "Processo cadastrado" : "Processo atualizado",
        description:
          mode === "create" && json?.movimentos?.novos > 0
            ? `${json.movimentos.novos} movimento(s) importados do Datajud.`
            : undefined,
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Novo processo eleitoral" : "Editar processo"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="numero">Numero do processo (CNJ)</Label>
              <Input
                id="numero"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="0600000-00.2026.6.17.0000"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Classe</Label>
              <Select value={classe} onValueChange={setClasse}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLASSES_ELEITORAIS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apelido">Apelido do caso</Label>
              <Input
                id="apelido"
                value={apelido}
                onChange={(e) => setApelido(e.target.value)}
                placeholder='Ex.: "Coxa e Doquinha"'
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="parteAutora">Parte autora</Label>
              <Input
                id="parteAutora"
                value={parteAutora}
                onChange={(e) => setParteAutora(e.target.value)}
                placeholder="Ex.: PSD"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="parteRe">Parte re / representada</Label>
              <Input
                id="parteRe"
                value={parteRe}
                onChange={(e) => setParteRe(e.target.value)}
                placeholder="Ex.: Fulano e outros"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nosso polo</Label>
              <Select value={polo} onValueChange={setPolo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POLOS_ELEITORAIS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="relator">Relator(a)</Label>
              <Input
                id="relator"
                value={relator}
                onChange={(e) => setRelator(e.target.value)}
                placeholder="Nome do relator"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Coordenador(a)</Label>
              <Select value={coordenadorId} onValueChange={setCoordenadorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NENHUM}>— Sem coordenador —</SelectItem>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Advogado(a) responsavel</Label>
              <Select value={advogadoRespId} onValueChange={setAdvogadoRespId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NENHUM}>— Sem responsavel —</SelectItem>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {mode === "edit" && (
              <>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_ELEITORAIS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="resultado">Resultado</Label>
                  <Input
                    id="resultado"
                    value={resultado}
                    onChange={(e) => setResultado(e.target.value)}
                    placeholder="Ex.: Liminar indeferida"
                  />
                </div>
              </>
            )}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="objeto">Objeto</Label>
              <Textarea
                id="objeto"
                value={objeto}
                onChange={(e) => setObjeto(e.target.value)}
                placeholder="Ex.: Propaganda negativa - Desinformacao - Video ..."
                rows={3}
                required
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="observacoes">Observacoes</Label>
              <Textarea
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Salvando..."
                : mode === "create"
                  ? "Cadastrar processo"
                  : "Salvar alteracoes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
