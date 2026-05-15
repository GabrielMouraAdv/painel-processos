import { buscarPublicacaoNoDJEN, montarUpdateDjen } from "./djen-client";
import { prisma } from "./prisma";

export type ProcessarFilaResultado = {
  pendentesTotal: number;
  processadas: number;
  encontradas: number;
  indisponiveis: number;
  erros: number;
  trabalhistas: number;
  duracaoMs: number;
};

/**
 * Processa a fila de movimentacoes pendentes de busca DJEN. Respeita o
 * rate-limit interno do `djen-client` (16 req/min + cooldown em 429).
 *
 * Prioridade (mais alto primeiro):
 *   1. status = "PENDENTE"   — usuario clicou explicitamente
 *   2. status IS NULL        — nunca buscou
 *   3. status = "ERRO_BUSCA" — falhou em tentativa anterior
 *
 * Movimentacoes "INDISPONIVEL" e "DISPONIVEL" nao sao re-processadas.
 *
 * @param opts.escritorioId  restringe a movimentacoes de processos do escritorio
 *                           (null = todos os escritorios, ex.: cron)
 * @param opts.limite        teto de movimentacoes processadas por execucao
 */
export async function processarFilaDjen(opts: {
  escritorioId: string | null;
  limite: number;
}): Promise<ProcessarFilaResultado> {
  const inicio = Date.now();
  const escritorioFiltro = opts.escritorioId
    ? { escritorioId: opts.escritorioId }
    : {};

  const baseWhere = {
    processo: {
      monitoramento: { monitoramentoAtivo: true },
      ...escritorioFiltro,
    },
  };
  const baseSelect = {
    id: true,
    dataMovimento: true,
    conteudoIntegralStatus: true,
    processo: { select: { numero: true } },
  } as const;

  // Buscamos em 3 niveis de prioridade. `Prisma.orderBy` nao suporta CASE WHEN,
  // entao 3 queries separadas — mais legivel e o `take` global e respeitado.
  const pendentesPrior = await prisma.movimentacaoAutomatica.findMany({
    where: { ...baseWhere, conteudoIntegralStatus: "PENDENTE" },
    select: baseSelect,
    orderBy: { dataMovimento: "desc" },
    take: opts.limite,
  });
  const restante1 = opts.limite - pendentesPrior.length;
  const nuncaBuscadas = restante1 > 0
    ? await prisma.movimentacaoAutomatica.findMany({
        where: { ...baseWhere, conteudoIntegralStatus: null },
        select: baseSelect,
        orderBy: { dataMovimento: "desc" },
        take: restante1,
      })
    : [];
  const restante2 = opts.limite - pendentesPrior.length - nuncaBuscadas.length;
  const comErro = restante2 > 0
    ? await prisma.movimentacaoAutomatica.findMany({
        where: { ...baseWhere, conteudoIntegralStatus: "ERRO_BUSCA" },
        select: baseSelect,
        orderBy: { dataMovimento: "desc" },
        take: restante2,
      })
    : [];
  const pendentes = [...pendentesPrior, ...nuncaBuscadas, ...comErro];

  let processadas = 0;
  let encontradas = 0;
  let indisponiveis = 0;
  let erros = 0;
  let trabalhistas = 0;

  for (const m of pendentes) {
    const numero = m.processo.numero;
    const digitos = numero.replace(/\D+/g, "");
    if (digitos.length >= 14 && digitos.charAt(13) === "5") {
      // Trabalhista — DJEN do painel nao suporta. Marca como INDISPONIVEL
      // para sair da fila.
      await prisma.movimentacaoAutomatica.update({
        where: { id: m.id },
        data: {
          conteudoIntegralStatus: "INDISPONIVEL",
          conteudoIntegralBuscadoEm: new Date(),
        },
      });
      trabalhistas++;
      continue;
    }

    const resultado = await buscarPublicacaoNoDJEN(numero, m.dataMovimento);
    const update = montarUpdateDjen(resultado);
    await prisma.movimentacaoAutomatica.update({
      where: { id: m.id },
      data: update,
    });

    processadas++;
    if (resultado.encontrado) encontradas++;
    else if (resultado.motivo === "INDISPONIVEL") indisponiveis++;
    else erros++;
  }

  return {
    pendentesTotal: pendentes.length,
    processadas,
    encontradas,
    indisponiveis,
    erros,
    trabalhistas,
    duracaoMs: Date.now() - inicio,
  };
}
