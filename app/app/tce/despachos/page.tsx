import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { parseBancasParam } from "@/lib/bancas";
import { prisma } from "@/lib/prisma";
import {
  CONSELHEIROS_SUBSTITUTOS,
  TCE_CAMARAS,
  TCE_RECURSO_CODE,
} from "@/lib/tce-config";

import { DespachosView, type DespachoCard } from "./despachos-view";

export default async function DespachosTcePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;

  const bancasFiltro = parseBancasParam(searchParams.banca);

  const [processos, todosProcessos, advogados] = await Promise.all([
    prisma.processoTce.findMany({
      where: {
        escritorioId,
        julgado: false,
        OR: [
          { memorialPronto: true },
          { despachadoComRelator: true },
          { incluidoNoDespacho: true },
        ],
        ...(bancasFiltro.length > 0 && {
          bancasSlug: { hasSome: bancasFiltro },
        }),
      },
      orderBy: [
        { despachadoComRelator: "asc" },
        { memorialPronto: "desc" },
        { dataAutuacao: "desc" },
      ],
      include: {
        municipio: { select: { id: true, nome: true, uf: true } },
        interessados: {
          include: { gestor: { select: { id: true, nome: true } } },
        },
        processoOrigem: { select: { id: true, numero: true } },
        documentos: {
          where: { tipo: "memorial" },
          orderBy: { createdAt: "desc" },
          select: { id: true, nome: true, url: true, createdAt: true },
        },
      },
    }),
    prisma.processoTce.findMany({
      where: { escritorioId },
      orderBy: { numero: "asc" },
      select: {
        id: true,
        numero: true,
        tipo: true,
        camara: true,
        memorialPronto: true,
        despachadoComRelator: true,
        incluidoNoDespacho: true,
      },
    }),
    prisma.user.findMany({
      where: { escritorioId, role: Role.ADVOGADO },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
  ]);

  const cards: DespachoCard[] = processos
    .map<DespachoCard>((p) => ({
      id: p.id,
      numero: p.numero,
      tipo: p.tipo,
      camara: p.camara,
      bancasSlug: p.bancasSlug,
      faseAtual: p.faseAtual,
      exercicio: p.exercicio,
      relator: p.relator,
      conselheiroSubstituto: p.conselheiroSubstituto,
      municipio: p.municipio,
      interessados: p.interessados.map((i) => ({
        id: i.gestor.id,
        nome: i.gestor.nome,
        cargo: i.cargo,
      })),
      prognosticoDespacho: p.prognosticoDespacho,
      retornoDespacho: p.retornoDespacho,
      despachadoComRelator: p.despachadoComRelator,
      dataDespacho: p.dataDespacho,
      memorialPronto: p.memorialPronto,
      incluidoNoDespacho: p.incluidoNoDespacho,
      memoriais: p.documentos.map((d) => ({
        id: d.id,
        nome: d.nome,
        url: d.url,
        createdAt: d.createdAt,
      })),
      memorialDispensado:
        p.memorialDispensado && p.memorialDispensadoPor && p.memorialDispensadoEm
          ? {
              por: p.memorialDispensadoPor,
              em: p.memorialDispensadoEm,
              motivo: p.memorialDispensadoMotivo,
            }
          : null,
      despachoDispensado:
        p.despachoDispensado && p.despachoDispensadoPor && p.despachoDispensadoEm
          ? {
              por: p.despachoDispensadoPor,
              em: p.despachoDispensadoEm,
              motivo: p.despachoDispensadoMotivo,
            }
          : null,
      recurso:
        p.ehRecurso && p.tipoRecurso && p.processoOrigem
          ? {
              tipoRecursoCode: TCE_RECURSO_CODE[p.tipoRecurso],
              processoOrigem: {
                id: p.processoOrigem.id,
                numero: p.processoOrigem.numero,
              },
            }
          : null,
    }))
    .sort((a, b) => {
    if (a.despachadoComRelator !== b.despachadoComRelator) {
      return a.despachadoComRelator ? 1 : -1;
    }
    if (a.memorialPronto !== b.memorialPronto) {
      return a.memorialPronto ? -1 : 1;
    }
    return 0;
  });

  // Conselheiros para autocomplete: titulares + substitutos
  const conselheirosUnicos = new Set<string>();
  for (const c of Object.values(TCE_CAMARAS)) {
    for (const t of c.titulares) conselheirosUnicos.add(t);
  }
  for (const s of CONSELHEIROS_SUBSTITUTOS) conselheirosUnicos.add(s);
  const conselheiros = Array.from(conselheirosUnicos).sort();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-3 py-4 sm:px-6 sm:py-8 md:px-8">
      <DespachosView
        cards={cards}
        conselheiros={conselheiros}
        processosDisponiveis={todosProcessos}
        advogados={advogados}
      />
    </div>
  );
}
