import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CONSELHEIROS_SUBSTITUTOS,
  TCE_CAMARAS,
  TCE_RECURSO_CODE,
} from "@/lib/tce-config";

import { DespachosView, type DespachoCard } from "./despachos-view";

export default async function DespachosTcePage() {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;

  const [processos, subprocessos, todosProcessos] = await Promise.all([
    prisma.processoTce.findMany({
      where: {
        escritorioId,
        OR: [
          { memorialPronto: true },
          { despachadoComRelator: true },
          { incluidoNoDespacho: true },
        ],
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
        documentos: {
          where: { tipo: "memorial" },
          orderBy: { createdAt: "desc" },
          select: { id: true, nome: true, url: true, createdAt: true },
        },
      },
    }),
    prisma.subprocessoTce.findMany({
      where: {
        processoPai: { escritorioId },
        OR: [
          { memorialPronto: true },
          { despachadoComRelator: true },
        ],
      },
      orderBy: [
        { despachadoComRelator: "asc" },
        { memorialPronto: "desc" },
        { dataInterposicao: "desc" },
      ],
      include: {
        processoPai: {
          select: {
            id: true,
            numero: true,
            tipo: true,
            camara: true,
            municipio: { select: { id: true, nome: true, uf: true } },
            interessados: {
              include: { gestor: { select: { id: true, nome: true } } },
            },
          },
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
  ]);

  const cardsProcessos: DespachoCard[] = processos.map((p) => ({
    id: p.id,
    numero: p.numero,
    tipo: p.tipo,
    camara: p.camara,
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
    subprocesso: null,
  }));

  const cardsSubprocessos: DespachoCard[] = subprocessos.map((sp) => ({
    id: sp.id,
    numero: sp.numero,
    tipo: sp.processoPai.tipo,
    camara: sp.processoPai.camara,
    faseAtual: sp.fase,
    exercicio: null,
    relator: sp.relator,
    conselheiroSubstituto: null,
    municipio: sp.processoPai.municipio,
    interessados: sp.processoPai.interessados.map((i) => ({
      id: i.gestor.id,
      nome: i.gestor.nome,
      cargo: i.cargo,
    })),
    prognosticoDespacho: sp.prognosticoDespacho,
    retornoDespacho: sp.retornoDespacho,
    despachadoComRelator: sp.despachadoComRelator,
    dataDespacho: sp.dataDespacho,
    memorialPronto: sp.memorialPronto,
    incluidoNoDespacho: false,
    memoriais: [],
    subprocesso: {
      isSubprocesso: true,
      tipoRecursoCode: TCE_RECURSO_CODE[sp.tipoRecurso],
      processoPai: { id: sp.processoPai.id, numero: sp.processoPai.numero },
    },
  }));

  // Pendentes (despachado false) primeiro, depois ordem natural
  const cards: DespachoCard[] = [
    ...cardsProcessos,
    ...cardsSubprocessos,
  ].sort((a, b) => {
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
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 md:px-8">
      <DespachosView
        cards={cards}
        conselheiros={conselheiros}
        processosDisponiveis={todosProcessos}
      />
    </div>
  );
}
