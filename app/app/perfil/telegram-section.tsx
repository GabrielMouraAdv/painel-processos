"use client";

import * as React from "react";
import { Loader2, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

type Props = {
  initial: {
    telegramAtivo: boolean;
    telegramBotUsername: string | null;
    telegramReceberLembreteDiario: boolean;
    telegramHorarioLembreteManha: string | null;
    telegramHorarioLembreteTarde: string | null;
  };
};

export function TelegramSection({ initial }: Props) {
  const { toast } = useToast();
  const [ativo, setAtivo] = React.useState(initial.telegramAtivo);
  const [botUsername, setBotUsername] = React.useState(
    initial.telegramBotUsername,
  );
  const [receberDiario, setReceberDiario] = React.useState(
    initial.telegramReceberLembreteDiario,
  );
  const [horarioManha, setHorarioManha] = React.useState(
    initial.telegramHorarioLembreteManha ?? "07:00",
  );
  const [horarioTarde, setHorarioTarde] = React.useState(
    initial.telegramHorarioLembreteTarde ?? "18:00",
  );

  const [token, setToken] = React.useState("");
  const [loadingConectar, setLoadingConectar] = React.useState(false);
  const [loadingTeste, setLoadingTeste] = React.useState(false);
  const [loadingPref, setLoadingPref] = React.useState(false);
  const [loadingDesc, setLoadingDesc] = React.useState(false);

  async function conectar() {
    if (!token.trim()) {
      toast({
        variant: "destructive",
        title: "Informe o token do bot",
      });
      return;
    }
    setLoadingConectar(true);
    try {
      const res = await fetch("/api/perfil/telegram/conectar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro ao conectar",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toast({ title: "Bot conectado com sucesso!" });
      setAtivo(true);
      setBotUsername(json.botUsername ?? null);
      setToken("");
    } finally {
      setLoadingConectar(false);
    }
  }

  async function desconectar() {
    if (
      !window.confirm(
        "Tem certeza que quer desconectar o bot? Voce nao recebera mais lembretes.",
      )
    ) {
      return;
    }
    setLoadingDesc(true);
    try {
      const res = await fetch("/api/perfil/telegram/desconectar", {
        method: "POST",
      });
      if (!res.ok) {
        toast({ variant: "destructive", title: "Erro ao desconectar" });
        return;
      }
      toast({ title: "Bot desconectado" });
      setAtivo(false);
      setBotUsername(null);
    } finally {
      setLoadingDesc(false);
    }
  }

  async function testar() {
    setLoadingTeste(true);
    try {
      const res = await fetch("/api/perfil/telegram/testar", {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Falha no teste",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toast({ title: "Mensagem de teste enviada" });
    } finally {
      setLoadingTeste(false);
    }
  }

  async function salvarPreferencias() {
    setLoadingPref(true);
    try {
      const res = await fetch("/api/perfil/telegram/preferencias", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receberLembreteDiario: receberDiario,
          horarioLembreteManha: horarioManha,
          horarioLembreteTarde: horarioTarde,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro ao salvar preferencias",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toast({ title: "Preferencias salvas" });
    } finally {
      setLoadingPref(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700">
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-brand-navy">
              Secretaria pessoal no Telegram
            </p>
            <p className="text-xs text-slate-500">
              Receba lembretes de compromissos e prazos diretamente no Telegram
              atraves do seu proprio bot.
            </p>
          </div>
          {ativo ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Conectado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              Desativado
            </span>
          )}
        </div>

        {!ativo && (
          <div className="space-y-3 border-t pt-4">
            <details className="rounded-md border bg-slate-50 p-3 text-sm">
              <summary className="cursor-pointer font-semibold text-slate-700">
                Como criar seu bot (passo a passo)
              </summary>
              <ol className="ml-5 mt-2 list-decimal space-y-1 text-xs text-slate-600">
                <li>
                  No Telegram, procure por <b>@BotFather</b> e inicie uma
                  conversa.
                </li>
                <li>
                  Envie <code>/newbot</code>.
                </li>
                <li>
                  Defina um nome para o bot (ex.:{" "}
                  <i>Secretaria do Filipe</i>).
                </li>
                <li>
                  Defina um username terminado em <b>bot</b> (ex.:{" "}
                  <i>secretaria_filipe_bot</i>).
                </li>
                <li>
                  Copie o <b>token</b> que o BotFather enviar (algo como{" "}
                  <code>123456789:ABC...</code>).
                </li>
                <li>
                  Abra o bot recem-criado (link enviado pelo BotFather) e mande{" "}
                  <code>/start</code> para ele.
                </li>
                <li>
                  Volte aqui, cole o token abaixo e clique em{" "}
                  <b>Validar e conectar</b>.
                </li>
              </ol>
            </details>
            <div className="space-y-1.5">
              <Label className="text-xs">Token do bot</Label>
              <Input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="123456789:ABCDEF..."
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-[11px] text-slate-500">
                O token e armazenado criptografado (AES-256) no servidor.
              </p>
            </div>
            <Button
              type="button"
              onClick={conectar}
              disabled={loadingConectar}
              className="bg-brand-navy hover:bg-brand-navy/90"
            >
              {loadingConectar ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Validar e conectar
            </Button>
          </div>
        )}

        {ativo && (
          <div className="space-y-4 border-t pt-4">
            <div className="text-sm text-slate-700">
              Conectado ao bot{" "}
              <span className="font-mono font-semibold text-brand-navy">
                @{botUsername ?? "—"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={testar}
                disabled={loadingTeste}
              >
                {loadingTeste ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Enviar mensagem de teste
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={desconectar}
                disabled={loadingDesc}
              >
                {loadingDesc ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Desconectar
              </Button>
            </div>

            <div className="space-y-3 rounded-md border bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Lembretes automaticos
              </p>
              <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
                <span>
                  Receber agenda do dia pela manha
                  <span className="ml-2 text-xs text-slate-500">
                    (segunda a sexta, ~7h)
                  </span>
                </span>
                <Switch
                  checked={receberDiario}
                  onCheckedChange={setReceberDiario}
                  ariaLabel="Lembrete diario"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Horario manha (referencia)</Label>
                  <Input
                    type="time"
                    value={horarioManha}
                    onChange={(e) => setHorarioManha(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Horario tarde (referencia)</Label>
                  <Input
                    type="time"
                    value={horarioTarde}
                    onChange={(e) => setHorarioTarde(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Os horarios sao referencia para sua agenda. Os cron jobs rodam
                em horarios fixos definidos no servidor.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={salvarPreferencias}
                disabled={loadingPref}
                className="bg-brand-navy hover:bg-brand-navy/90"
              >
                {loadingPref ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Salvar preferencias
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
