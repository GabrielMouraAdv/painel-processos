import {
  consultarProcessoDetalhado,
  datajudAtualizadoEmDe,
  gravarMovimentacoesDatajud,
  registrarVerificacaoMonitoramento,
} from "./datajud";
import { extrairPublicacoesDoDatajud, gravarPublicacoesDatajud } from "./djen";
import { prisma } from "./prisma";

export type VerificacaoProcessoResultado = {
  novasMovimentacoes: number;
  novasPublicacoes: number;
  datajudAtualizadoEm: Date | null;
  erro: string | null;
};

/**
 * Verificacao completa de UM processo monitorado com UMA consulta ao Datajud:
 * grava as movimentacoes novas e as publicacoes derivadas dos mesmos
 * movimentos, e registra em MonitoramentoConfig a data em que o Datajud
 * disse ter atualizado o processo (datajudAtualizadoEm).
 *
 * Substitui o par verificarNovasMovimentacoes + verificarNovasPublicacoes,
 * que consultava o Datajud duas vezes por processo.
 */
export async function verificarProcessoMonitorado(
  processoId: string,
): Promise<VerificacaoProcessoResultado> {
  const vazio: VerificacaoProcessoResultado = {
    novasMovimentacoes: 0,
    novasPublicacoes: 0,
    datajudAtualizadoEm: null,
    erro: null,
  };
  const processo = await prisma.processo.findUnique({
    where: { id: processoId },
    select: { id: true, numero: true, tribunal: true },
  });
  if (!processo) return { ...vazio, erro: "processo nao encontrado" };

  try {
    const consulta = await consultarProcessoDetalhado(processo.numero, processo.tribunal);
    const resultado = consulta.resultado;
    if (!resultado) {
      // O motivo fica gravado (HTTP 429, timeout, nao encontrado...) em vez do
      // antigo "consulta retornou nulo", que escondia a causa.
      const erro = `Datajud: ${consulta.erro ?? "sem resultado"}`;
      await registrarVerificacaoMonitoramento(processo.id, { erro });
      return { ...vazio, erro };
    }

    const novasMovimentacoes = await gravarMovimentacoesDatajud(
      processo.id,
      resultado,
    );
    const novasPublicacoes = await gravarPublicacoesDatajud(
      processo.id,
      extrairPublicacoesDoDatajud(resultado),
    );
    const datajudAtualizadoEm = datajudAtualizadoEmDe(resultado);

    await registrarVerificacaoMonitoramento(processo.id, {
      erro: null,
      datajudAtualizadoEm,
    });

    return { novasMovimentacoes, novasPublicacoes, datajudAtualizadoEm, erro: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await registrarVerificacaoMonitoramento(processo.id, { erro: msg });
    return { ...vazio, erro: msg };
  }
}

/**
 * Data mais recente em que o Datajud atualizou algum processo do escritorio
 * (null se nunca registrada). Usada pelas telas para avisar quando a base
 * do CNJ esta congelada ha mais de 7 dias.
 */
export async function datajudUltimaAtualizacao(
  escritorioId: string,
): Promise<Date | null> {
  const agg = await prisma.monitoramentoConfig.aggregate({
    where: { processo: { escritorioId } },
    _max: { datajudAtualizadoEm: true },
  });
  return agg._max.datajudAtualizadoEm ?? null;
}

export const DATAJUD_DIAS_PARA_AVISAR = 7;

export function datajudParadoHa(ultima: Date | null): number | null {
  if (!ultima) return null;
  const dias = Math.floor((Date.now() - ultima.getTime()) / 86_400_000);
  return dias > DATAJUD_DIAS_PARA_AVISAR ? dias : null;
}
