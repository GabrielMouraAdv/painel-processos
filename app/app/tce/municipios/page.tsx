import Link from "next/link";
import { getServerSession } from "next-auth";
import { Building2, MapPin, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { NovoMunicipioButton } from "./novo-municipio-button";

export default async function TceMunicipiosPage() {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;

  const municipios = await prisma.municipio.findMany({
    where: { escritorioId },
    orderBy: { nome: "asc" },
    include: {
      _count: {
        select: { processosTce: true, gestoes: true },
      },
    },
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 md:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Tribunal de Contas
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-brand-navy">
            Municipios
          </h1>
          <p className="text-sm text-muted-foreground">
            {municipios.length} municipio{municipios.length === 1 ? "" : "s"} cadastrado
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
            <Link key={m.id} href={`/app/tce/municipios/${m.id}`}>
              <Card className="h-full cursor-pointer transition-all hover:shadow-md">
                <CardContent className="flex flex-col gap-4 p-5">
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
                      value={m._count.processosTce}
                    />
                    <Stat
                      icon={<Users className="h-3.5 w-3.5" />}
                      label="Gestoes"
                      value={m._count.gestoes}
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
          ))}
        </div>
      )}
    </div>
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
