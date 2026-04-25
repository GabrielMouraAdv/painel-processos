"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type Props = {
  subprocessoId: string;
  fase: string;
  relator: string | null;
  decisao: string | null;
  observacoes: string | null;
};

export function SubprocessoActions({
  subprocessoId,
  fase,
  relator,
  decisao,
  observacoes,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [editing, setEditing] = React.useState(false);
  const [faseLocal, setFaseLocal] = React.useState(fase);
  const [relatorLocal, setRelatorLocal] = React.useState(relator ?? "");
  const [decisaoLocal, setDecisaoLocal] = React.useState(decisao ?? "");
  const [obsLocal, setObsLocal] = React.useState(observacoes ?? "");
  const [saving, setSaving] = React.useState(false);

  async function salvar() {
    setSaving(true);
    try {
      const res = await fetch(`/api/tce/subprocessos/${subprocessoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fase: faseLocal.trim(),
          relator: relatorLocal.trim() || null,
          decisao: decisaoLocal.trim() || null,
          observacoes: obsLocal.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro ao salvar",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toast({ title: "Subprocesso atualizado" });
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <Card>
        <CardContent className="flex flex-wrap items-start justify-between gap-3 pt-6">
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2 md:flex-1">
            <div>
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Fase atual
              </Label>
              <p className="mt-0.5 font-medium text-brand-navy">{fase}</p>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Relator
              </Label>
              <p className="mt-0.5 text-slate-800">{relator ?? "-"}</p>
            </div>
            <div className="md:col-span-2">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Decisao
              </Label>
              <p className="mt-0.5 whitespace-pre-wrap text-slate-700">
                {decisao ?? "-"}
              </p>
            </div>
            <div className="md:col-span-2">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Observacoes
              </Label>
              <p className="mt-0.5 whitespace-pre-wrap text-slate-700">
                {observacoes ?? "-"}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Editar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Fase atual</Label>
            <Input
              value={faseLocal}
              onChange={(e) => setFaseLocal(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Relator</Label>
            <Input
              value={relatorLocal}
              onChange={(e) => setRelatorLocal(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Decisao</Label>
          <Textarea
            rows={3}
            value={decisaoLocal}
            onChange={(e) => setDecisaoLocal(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Observacoes</Label>
          <Textarea
            rows={2}
            value={obsLocal}
            onChange={(e) => setObsLocal(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              setEditing(false);
              setFaseLocal(fase);
              setRelatorLocal(relator ?? "");
              setDecisaoLocal(decisao ?? "");
              setObsLocal(observacoes ?? "");
            }}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            onClick={salvar}
            disabled={saving}
            className="bg-brand-navy hover:bg-brand-navy/90"
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
