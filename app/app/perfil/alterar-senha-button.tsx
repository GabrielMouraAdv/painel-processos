"use client";

import * as React from "react";
import { KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { useToast } from "@/hooks/use-toast";

export function AlterarSenhaButton() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <KeyRound className="h-4 w-4" aria-hidden="true" />
        Alterar Senha
      </Button>
      <AlterarSenhaDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function AlterarSenhaDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const [senhaAtual, setSenhaAtual] = React.useState("");
  const [senhaNova, setSenhaNova] = React.useState("");
  const [senhaConfirma, setSenhaConfirma] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setSenhaAtual("");
    setSenhaNova("");
    setSenhaConfirma("");
    setErro(null);
  }, [open]);

  async function salvar() {
    setErro(null);
    if (!senhaAtual) {
      setErro("Informe a senha atual.");
      return;
    }
    if (senhaNova.length < 6) {
      setErro("A nova senha deve ter no minimo 6 caracteres.");
      return;
    }
    if (senhaNova !== senhaConfirma) {
      setErro("A confirmacao nao confere com a nova senha.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/perfil/alterar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senhaAtual, senhaNova }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(json.error ?? "Erro ao alterar a senha.");
        return;
      }
      toast({ title: "Senha alterada com sucesso" });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar senha</DialogTitle>
          <DialogDescription>
            Informe sua senha atual e escolha uma nova com pelo menos 6
            caracteres.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="senha-atual">Senha atual</Label>
            <Input
              id="senha-atual"
              type="password"
              autoComplete="current-password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="senha-nova">Nova senha</Label>
            <Input
              id="senha-nova"
              type="password"
              autoComplete="new-password"
              value={senhaNova}
              onChange={(e) => setSenhaNova(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="senha-confirma">Confirmar nova senha</Label>
            <Input
              id="senha-confirma"
              type="password"
              autoComplete="new-password"
              value={senhaConfirma}
              onChange={(e) => setSenhaConfirma(e.target.value)}
            />
          </div>

          {erro && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={salvar} disabled={submitting}>
            {submitting ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
