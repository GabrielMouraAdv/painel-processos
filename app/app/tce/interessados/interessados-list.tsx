"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, FileText, Pencil, Trash2 } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { iniciais } from "@/lib/iniciais";

import {
  InteressadoDialog,
  NovoInteressadoButton,
  type InteressadoFormInitial,
  type MunicipioOption,
} from "./interessado-dialog";

export type InteressadoCard = {
  id: string;
  nome: string;
  cargo: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
  observacoes: string | null;
  municipio: string;
  municipiosVinculados: string[];
  totalProcessosTce: number;
};

export function InteressadosList({
  interessados,
  municipios,
}: {
  interessados: InteressadoCard[];
  municipios: MunicipioOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [editando, setEditando] = React.useState<InteressadoFormInitial | null>(
    null,
  );
  const [editOpen, setEditOpen] = React.useState(false);
  const [excluindo, setExcluindo] = React.useState<InteressadoCard | null>(
    null,
  );
  const [excluindoMsg, setExcluindoMsg] = React.useState<string | null>(null);
  const [excluindoBusy, setExcluindoBusy] = React.useState(false);

  function abrirEdicao(item: InteressadoCard) {
    setEditando({
      id: item.id,
      nome: item.nome,
      cpf: item.cpf ?? "",
      cargo: item.cargo,
      municipio: item.municipio,
      email: item.email ?? "",
      telefone: item.telefone ?? "",
      observacoes: item.observacoes ?? "",
    });
    setEditOpen(true);
  }

  function abrirExclusao(item: InteressadoCard) {
    setExcluindo(item);
    setExcluindoMsg(null);
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    setExcluindoBusy(true);
    try {
      const res = await fetch(`/api/gestores/${excluindo.id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setExcluindoMsg(json.error ?? "Erro ao excluir.");
        return;
      }
      toast({ title: "Interessado excluido" });
      setExcluindo(null);
      router.refresh();
    } finally {
      setExcluindoBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Tribunal de Contas
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-brand-navy">
            Interessados
          </h1>
          <p className="text-sm text-muted-foreground">
            {interessados.length} interessado
            {interessados.length === 1 ? "" : "s"} cadastrado
            {interessados.length === 1 ? "" : "s"}.
          </p>
        </div>
        <NovoInteressadoButton municipios={municipios} />
      </div>

      {interessados.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Nenhum interessado cadastrado ainda. Use o botao acima para
            comecar.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {interessados.map((g) => (
            <div key={g.id} className="relative">
              <Link href={`/app/tce/interessados/${g.id}`}>
                <Card className="h-full cursor-pointer transition-all hover:shadow-md">
                  <CardContent className="flex flex-col gap-4 p-5 pr-12">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12 bg-brand-navy/10">
                        <AvatarFallback className="bg-brand-navy/10 text-sm font-semibold text-brand-navy">
                          {iniciais(g.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold text-brand-navy">
                          {g.nome}
                        </h3>
                        <p className="truncate text-xs text-muted-foreground">
                          {g.cargo}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 rounded-md border border-slate-100 bg-slate-50 p-2 text-center">
                      <Stat
                        icon={<Building2 className="h-3.5 w-3.5" />}
                        label="Municipios"
                        value={g.municipiosVinculados.length}
                      />
                      <Stat
                        icon={<FileText className="h-3.5 w-3.5" />}
                        label="Processos TCE"
                        value={g.totalProcessosTce}
                      />
                    </div>

                    {g.municipiosVinculados.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Atuou em
                        </p>
                        <ul className="flex flex-wrap gap-1.5">
                          {g.municipiosVinculados.slice(0, 5).map((m) => (
                            <li
                              key={m}
                              className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700"
                            >
                              {m}
                            </li>
                          ))}
                          {g.municipiosVinculados.length > 5 && (
                            <li className="text-[11px] text-muted-foreground">
                              +{g.municipiosVinculados.length - 5}
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
              <div className="absolute right-3 top-3 flex gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    abrirEdicao(g);
                  }}
                  aria-label="Editar"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:border-brand-navy hover:text-brand-navy"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    abrirExclusao(g);
                  }}
                  aria-label="Excluir"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:border-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <InteressadoDialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) setEditando(null);
        }}
        initial={editando}
        municipios={municipios}
      />

      <Dialog
        open={!!excluindo}
        onOpenChange={(v) => {
          if (!v) {
            setExcluindo(null);
            setExcluindoMsg(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir interessado</DialogTitle>
            <DialogDescription>
              {excluindo
                ? `Confirma a exclusao de ${excluindo.nome}? Essa acao nao pode ser desfeita.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {excluindoMsg && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {excluindoMsg}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setExcluindo(null);
                setExcluindoMsg(null);
              }}
              disabled={excluindoBusy}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmarExclusao}
              disabled={excluindoBusy}
            >
              {excluindoBusy ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div>
      <p className="text-lg font-semibold text-brand-navy">{value}</p>
      <p className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
    </div>
  );
}
