"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Scale, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/app";

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const res = await signIn("credentials", {
      email,
      senha,
      redirect: false,
    });

    setCarregando(false);

    if (!res || res.error) {
      setErro("Email ou senha invalidos.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-beige px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-navy text-white shadow-lg">
            <Scale className="h-7 w-7" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-brand-navy">
              Gestao Processual
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Painel Juridico</p>
          </div>
        </div>

        <Card className="border-muted shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-brand-navy">Entrar</CardTitle>
            <CardDescription>
              Informe seu email e senha para acessar o painel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@escritorio.com"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="senha" className="text-sm font-medium">
                  Senha
                </label>
                <Input
                  id="senha"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Sua senha"
                />
              </div>

              {erro && (
                <p
                  role="alert"
                  className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {erro}
                </p>
              )}

              <Button
                type="submit"
                disabled={carregando}
                className="w-full bg-brand-navy hover:bg-brand-navy/90"
              >
                {carregando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Acesso restrito a usuarios autorizados.
        </p>
      </div>
    </div>
  );
}
