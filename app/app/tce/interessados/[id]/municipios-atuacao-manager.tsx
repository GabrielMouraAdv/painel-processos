"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export type MunicipioBasico = { id: string; nome: string; uf: string };

export function MunicipiosAtuacaoManager({
  gestorId,
  vinculados,
  todosMunicipios,
}: {
  gestorId: string;
  vinculados: MunicipioBasico[];
  todosMunicipios: MunicipioBasico[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [adicionando, setAdicionando] = React.useState("");

  const disponiveis = React.useMemo(
    () => todosMunicipios.filter((m) => !vinculados.some((v) => v.id === m.id)),
    [todosMunicipios, vinculados],
  );

  async function adicionar(municipioId: string) {
    if (!municipioId || municipioId === "__placeholder__") return;
    setBusy(true);
    try {
      const res = await fetch(`/api/gestores/${gestorId}/municipios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ municipioId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: json.error ?? "Falha ao vincular",
        });
        return;
      }
      toast({ title: "Municipio vinculado" });
      setAdicionando("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remover(municipioId: string) {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/gestores/${gestorId}/municipios/${municipioId}`,
        { method: "DELETE" },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: json.error ?? "Falha ao remover",
        });
        return;
      }
      toast({ title: "Municipio desvinculado" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {vinculados.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum municipio vinculado.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {vinculados.map((m) => (
            <li key={m.id}>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-navy/30 bg-brand-navy/5 px-2.5 py-1.5 text-sm font-medium text-brand-navy">
                {m.nome}/{m.uf}
                <button
                  type="button"
                  onClick={() => remover(m.id)}
                  disabled={busy}
                  aria-label={`Remover ${m.nome}`}
                  className="text-brand-navy/60 transition-colors hover:text-red-600 disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {disponiveis.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Select
              value={adicionando}
              onValueChange={(v) => {
                setAdicionando(v);
                adicionar(v);
              }}
              disabled={busy}
            >
              <SelectTrigger>
                <SelectValue placeholder="Adicionar municipio..." />
              </SelectTrigger>
              <SelectContent>
                {disponiveis.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome}/{m.uf}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="icon" disabled className="shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
