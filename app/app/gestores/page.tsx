import Link from "next/link";
import { getServerSession } from "next-auth";
import { Risco } from "@prisma/client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { GrauBadge, RiscoBadge, TribunalBadge } from "@/components/processo-badges";
import { authOptions } from "@/lib/auth";
import { iniciais } from "@/lib/iniciais";
import { prisma } from "@/lib/prisma";

import { NovoGestorButton } from "./novo-gestor-button";

const riscoOrdem: Record<Risco, number> = { ALTO: 3, MEDIO: 2, BAIXO: 1 };

export default async function GestoresPage() {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const em30 = new Date(hoje);
  em30.setDate(em30.getDate() + 30);
  em30.setHours(23, 59, 59, 999);

  const gestores = await prisma.gestor.findMany({
    where: { escritorioId },
    orderBy: { nome: "asc" },
    include: {
      processos: {
        select: {
          id: true,
          numero: true,
          tribunal: true,
          grau: true,
          risco: true,
        },
        orderBy: { dataDistribuicao: "desc" },
      },
    },
  });

  const gestorIds = gestores.map((g) => g.id);
  const prazosPorGestor = await prisma.prazo.groupBy({
    by: ["processoId"],
    where: {
      cumprido: false,
      data: { gte: hoje, lte: em30 },
      processo: { escritorioId, gestorId: { in: gestorIds } },
    },
    _count: { _all: true },
  });

  const processoToGestor = new Map<string, string>();
  for (const g of gestores) {
    for (const p of g.processos) processoToGestor.set(p.id, g.id);
  }
  const prazosGestorMap = new Map<string, number>();
  for (const row of prazosPorGestor) {
    const gid = processoToGestor.get(row.processoId);
    if (!gid) continue;
    prazosGestorMap.set(gid, (prazosGestorMap.get(gid) ?? 0) + row._count._all);
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-3 py-4 sm:px-6 sm:py-8 md:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-navy">
            Gestores
          </h1>
          <p className="text-sm text-muted-foreground">
            {gestores.length} gestor{gestores.length === 1 ? "" : "es"} cadastrado
            {gestores.length === 1 ? "" : "s"}.
          </p>
        </div>
        <NovoGestorButton />
      </header>

      {gestores.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Nenhum gestor cadastrado ainda. Use o botao acima para comecar.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {gestores.map((g) => {
            const total = g.processos.length;
            const alto = g.processos.filter((p) => p.risco === Risco.ALTO).length;
            const prazos30 = prazosGestorMap.get(g.id) ?? 0;
            const riscoMax = g.processos.reduce<Risco | null>((acc, p) => {
              if (!acc) return p.risco;
              return riscoOrdem[p.risco] > riscoOrdem[acc] ? p.risco : acc;
            }, null);

            return (
              <Card key={g.id} className="flex flex-col">
                <CardContent className="flex flex-1 flex-col gap-4 p-5">
                  <Link
                    href={`/app/gestores/${g.id}`}
                    className="flex items-start gap-3"
                  >
                    <Avatar className="h-12 w-12 bg-brand-navy/10">
                      <AvatarFallback className="bg-brand-navy/10 text-sm font-semibold text-brand-navy">
                        {iniciais(g.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-brand-navy hover:underline">
                        {g.nome}
                      </h3>
                      <p className="truncate text-xs text-muted-foreground">
                        {g.cargo} • {g.municipio}
                      </p>
                      {riscoMax && (
                        <div className="mt-1.5">
                          <RiscoBadge risco={riscoMax} />
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="grid grid-cols-3 gap-2 rounded-md border border-slate-100 bg-slate-50 p-2 text-center">
                    <Stat label="Processos" value={total} />
                    <Stat label="Risco alto" value={alto} accent={alto > 0} />
                    <Stat label="Prazos 30d" value={prazos30} accent={prazos30 > 0} />
                  </div>

                  <div className="flex-1">
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Processos
                    </p>
                    {g.processos.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Sem processos vinculados.
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {g.processos.slice(0, 5).map((p) => (
                          <li key={p.id}>
                            <Link
                              href={`/app/processos/${p.id}`}
                              className="flex items-center gap-2 rounded px-1 py-1 text-xs hover:bg-slate-50"
                            >
                              <TribunalBadge tribunal={p.tribunal} />
                              <span className="min-w-0 flex-1 truncate font-mono text-xs text-brand-navy">
                                {p.numero}
                              </span>
                              <GrauBadge grau={p.grau} />
                            </Link>
                          </li>
                        ))}
                        {g.processos.length > 5 && (
                          <li className="px-1 pt-1 text-[11px] text-muted-foreground">
                            +{g.processos.length - 5} mais...
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div>
      <p
        className={
          accent
            ? "text-lg font-semibold text-red-700"
            : "text-lg font-semibold text-brand-navy"
        }
      >
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
