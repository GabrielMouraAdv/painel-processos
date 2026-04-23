import Link from "next/link";
import { getServerSession } from "next-auth";
import { Building2, FileText } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { iniciais } from "@/lib/iniciais";
import { prisma } from "@/lib/prisma";

export default async function TceInteressadosPage() {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;

  const gestores = await prisma.gestor.findMany({
    where: {
      escritorioId,
      OR: [
        { historicoGestoes: { some: {} } },
        { interessadoProcessosTce: { some: {} } },
      ],
    },
    orderBy: { nome: "asc" },
    include: {
      historicoGestoes: {
        orderBy: { dataInicio: "desc" },
        include: { municipio: { select: { nome: true, uf: true } } },
      },
      _count: { select: { interessadoProcessosTce: true } },
    },
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 md:px-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Tribunal de Contas
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-brand-navy">
          Interessados
        </h1>
        <p className="text-sm text-muted-foreground">
          {gestores.length} gestor{gestores.length === 1 ? "" : "es"} com vinculo ao
          TCE.
        </p>
      </header>

      {gestores.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Nenhum gestor vinculado a processos TCE ou municipios ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {gestores.map((g) => {
            const municipiosUnicos = Array.from(
              new Set(g.historicoGestoes.map((h) => h.municipio.nome)),
            );
            return (
              <Link key={g.id} href={`/app/tce/interessados/${g.id}`}>
                <Card className="h-full cursor-pointer transition-all hover:shadow-md">
                  <CardContent className="flex flex-col gap-4 p-5">
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
                        value={municipiosUnicos.length}
                      />
                      <Stat
                        icon={<FileText className="h-3.5 w-3.5" />}
                        label="Processos TCE"
                        value={g._count.interessadoProcessosTce}
                      />
                    </div>

                    {municipiosUnicos.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Atuou em
                        </p>
                        <ul className="flex flex-wrap gap-1.5">
                          {municipiosUnicos.slice(0, 5).map((m) => (
                            <li
                              key={m}
                              className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700"
                            >
                              {m}
                            </li>
                          ))}
                          {municipiosUnicos.length > 5 && (
                            <li className="text-[11px] text-muted-foreground">
                              +{municipiosUnicos.length - 5}
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
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
