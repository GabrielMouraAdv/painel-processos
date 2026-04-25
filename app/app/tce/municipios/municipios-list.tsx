"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, MapPin, Pencil, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

import {
  MunicipioDialog,
  NovoMunicipioButton,
  type MunicipioFormInitial,
} from "./municipio-dialog";

export type MunicipioCard = {
  id: string;
  nome: string;
  uf: string;
  cnpjPrefeitura: string | null;
  observacoes: string | null;
  totalProcessosTce: number;
  totalGestoes: number;
};

export function MunicipiosList({
  municipios,
}: {
  municipios: MunicipioCard[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [editando, setEditando] = React.useState<MunicipioFormInitial | null>(
    null,
  );
  const [editOpen, setEditOpen] = React.useState(false);
  const [excluindo, setExcluindo] = React.useState<MunicipioCard | null>(null);
  const [excluindoMsg, setExcluindoMsg] = React.useState<string | null>(null);
  const [excluindoBusy, setExcluindoBusy] = React.useState(false);

  function abrirEdicao(item: MunicipioCard) {
    setEditando({
      id: item.id,
      nome: item.nome,
      uf: item.uf,
      cnpjPrefeitura: item.cnpjPrefeitura ?? "",
      observacoes: item.observacoes ?? "",
    });
    setEditOpen(true);
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    setExcluindoBusy(true);
    try {
      const res = await fetch(`/api/tce/municipios/${excluindo.id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setExcluindoMsg(json.error ?? "Erro ao excluir.");
        return;
      }
      toast({ title: "Municipio excluido" });
      setExcluindo(null);
      router.refresh();
    } finally {
      setExcluindoBusy(false);
    }
  }

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Tribunal de Contas
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-brand-navy">
            Municipios
          </h1>
          <p className="text-sm text-muted-foreground">
            {municipios.length} municipio
            {municipios.length === 1 ? "" : "s"} cadastrado
            {municipios.length === 1 ? "" : "s"}.
          </p>
        </div>
        <NovoMunicipioButton />
      </header>

      {municipios.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Nenhum municipio cadastrado ainda. Use o botao acima para comecar.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {municipios.map((m) => (
            <div key={m.id} className="relative">
              <Link href={`/app/tce/municipios/${m.id}`}>
                <Card className="h-full cursor-pointer transition-all hover:shadow-md">
                  <CardContent className="flex flex-col gap-4 p-5 pr-12">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-navy/10 text-brand-navy">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold text-brand-navy">
                          {m.nome}
                        </h3>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {m.uf}
                          {m.cnpjPrefeitura ? ` • CNPJ ${m.cnpjPrefeitura}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 rounded-md border border-slate-100 bg-slate-50 p-2 text-center">
                      <Stat
                        icon={<Building2 className="h-3.5 w-3.5" />}
                        label="Processos TCE"
                        value={m.totalProcessosTce}
                      />
                      <Stat
                        icon={<Users className="h-3.5 w-3.5" />}
                        label="Gestoes"
                        value={m.totalGestoes}
                      />
                    </div>
                    {m.observacoes && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {m.observacoes}
                      </p>
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
                    abrirEdicao(m);
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
                    setExcluindo(m);
                    setExcluindoMsg(null);
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

      <MunicipioDialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) setEditando(null);
        }}
        initial={editando}
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
            <DialogTitle>Excluir municipio</DialogTitle>
            <DialogDescription>
              {excluindo
                ? `Confirma a exclusao de ${excluindo.nome}/${excluindo.uf}? Essa acao nao pode ser desfeita.`
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
