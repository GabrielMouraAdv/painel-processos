import { Construction } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type Props = {
  titulo: string;
};

export function EmConstrucao({ titulo }: Props) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8 md:px-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Tribunal de Contas
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-brand-navy">
          {titulo}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Em construcao</p>
      </header>

      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Construction className="h-10 w-10 text-slate-400" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-700">
            Modulo em construcao
          </p>
          <p className="max-w-md text-xs text-muted-foreground">
            Esta area do Tribunal de Contas ainda esta sendo desenvolvida. Em
            breve voce podera acessar as funcionalidades aqui.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
