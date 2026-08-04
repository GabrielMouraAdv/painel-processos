import { ExternalLink, Monitor, Scale, Search } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LINKS_ELEITORAIS, type GrupoLinks } from "@/lib/eleitoral-links";
import { exigirPaginaEleitoral } from "@/lib/eleitoral-server";

export const dynamic = "force-dynamic";

function IconeGrupo({ icone }: { icone: GrupoLinks["icone"] }) {
  const cls = "h-4 w-4";
  if (icone === "search") return <Search className={cls} />;
  if (icone === "scale") return <Scale className={cls} />;
  return <Monitor className={cls} />;
}

export default async function EleitoralLinksPage() {
  await exigirPaginaEleitoral();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Links uteis</h1>
        <p className="text-sm text-muted-foreground">
          Jurisprudencia, resolucoes do TSE para 2026 e acesso ao PJe. Todos
          abrem em nova aba.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {LINKS_ELEITORAIS.map((grupo) => (
          <Card key={grupo.titulo}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <IconeGrupo icone={grupo.icone} />
                {grupo.titulo}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {grupo.descricao}
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {grupo.links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start justify-between gap-3 rounded-md border p-3 transition-colors hover:border-brand-navy/40 hover:bg-muted/50"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-brand-navy">
                      {link.titulo}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {link.descricao}
                    </span>
                  </span>
                  <ExternalLink
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </a>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
