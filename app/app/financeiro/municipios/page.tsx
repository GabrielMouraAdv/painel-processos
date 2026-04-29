import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { parseBancasParam } from "@/lib/bancas";
import { ANOS_DISPONIVEIS } from "@/lib/financeiro";
import { prisma } from "@/lib/prisma";

import { MunicipiosFinanceiroView, type ContratoCard } from "./municipios-view";

function asString(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

export default async function FinanceiroMunicipiosPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;

  const anoAtual = new Date().getFullYear();
  const anoParam = parseInt(asString(searchParams.ano), 10);
  const ano = ANOS_DISPONIVEIS.includes(anoParam) ? anoParam : anoAtual;
  const bancasFiltro = parseBancasParam(searchParams.banca);
  const municipioFocus = asString(searchParams.municipioId);

  const inicioAno = new Date(Date.UTC(ano, 0, 1));
  const fimAno = new Date(Date.UTC(ano, 11, 31, 23, 59, 59));

  // Contratos ativos no ano (dataInicio <= fimAno && (dataFim == null || dataFim >= inicioAno))
  const contratos = await prisma.contratoMunicipal.findMany({
    where: {
      municipio: { escritorioId },
      ativo: true,
      dataInicio: { lte: fimAno },
      OR: [{ dataFim: null }, { dataFim: { gte: inicioAno } }],
      ...(bancasFiltro.length > 0 && {
        bancasSlug: { hasSome: bancasFiltro },
      }),
      ...(municipioFocus && { municipioId: municipioFocus }),
    },
    include: {
      municipio: { select: { id: true, nome: true, uf: true } },
      notas: {
        where: { anoReferencia: ano },
        orderBy: { mesReferencia: "asc" },
      },
    },
    orderBy: [{ municipio: { nome: "asc" } }],
  });

  const cards: ContratoCard[] = contratos.map((c) => ({
    id: c.id,
    municipio: c.municipio,
    bancasSlug: c.bancasSlug,
    valorMensal: Number(c.valorMensal),
    dataInicio: c.dataInicio.toISOString(),
    dataFim: c.dataFim ? c.dataFim.toISOString() : null,
    ativo: c.ativo,
    dataRenovacao: c.dataRenovacao ? c.dataRenovacao.toISOString() : null,
    diasAvisoRenovacao: c.diasAvisoRenovacao,
    numeroContrato: c.numeroContrato,
    objetoDoContrato: c.objetoDoContrato,
    notas: c.notas.map((n) => ({
      id: n.id,
      mesReferencia: n.mesReferencia,
      anoReferencia: n.anoReferencia,
      valorNota: Number(n.valorNota),
      valorPago: n.valorPago ? Number(n.valorPago) : null,
      dataVencimento: n.dataVencimento.toISOString(),
      dataEmissao: n.dataEmissao ? n.dataEmissao.toISOString() : null,
      dataPagamento: n.dataPagamento ? n.dataPagamento.toISOString() : null,
      numeroNota: n.numeroNota,
      pago: n.pago,
      observacoes: n.observacoes,
      arquivoUrl: n.arquivoUrl,
      arquivoNome: n.arquivoNome,
      arquivoTipo: n.arquivoTipo,
    })),
  }));

  // Lista de municipios para selects (cadastrar contrato/nota avulsa)
  const municipios = await prisma.municipio.findMany({
    where: { escritorioId },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, uf: true },
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-3 py-4 sm:px-6 sm:py-8 md:px-8">
      <MunicipiosFinanceiroView
        ano={ano}
        cards={cards}
        municipios={municipios}
      />
    </div>
  );
}
