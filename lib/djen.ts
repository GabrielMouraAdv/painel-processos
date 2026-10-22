import { prisma } from "./prisma";
import { consultarProcesso, type DatajudConsultaResultado } from "./datajud";
import { hashConteudo } from "./djen-oab";
import { detectaIntimacao } from "./monitoramento-detect";

// Publicacoes DERIVADAS dos movimentos do Datajud (fonte "DJEN"). Sao um
// complemento: a fonte primaria das intimacoes e a varredura por OAB na API
// do DJEN (lib/djen-oab.ts, fonte "DJEN_OAB").

export type PublicacaoDjenResultado = {
  dataPublicacao: Date;
  dataDisponibilizacao: Date | null;
  conteudo: string;
  caderno: string | null;
  pagina: string | null;
  geraIntimacao: boolean;
};

const CODIGOS_PUBLICACAO = new Set<string>([
  // codigos TPU comuns de publicacao/intimacao
  "11383", // publicacao
  "12265", // expedicao de diario
  "12266",
  "51", // intimacao eletronica
  "60", // intimacao
  "246", // juntada de intimacao
  "581", // intimacao via diario
]);

function indicaPublicacao(nome: string, complementos: string[]): boolean {
  const texto = [nome, ...complementos].join(" ").toLowerCase();
  return (
    texto.includes("publicac") ||
    texto.includes("intimac") ||
    texto.includes("diario") ||
    texto.includes("djen") ||
    texto.includes("disponibiliza")
  );
}

function extrairCaderno(complementos: string[]): string | null {
  for (const c of complementos) {
    const m = c.match(/caderno[^:]*:\s*(.+)/i);
    if (m) return m[1].trim();
  }
  return null;
}

function extrairPagina(complementos: string[]): string | null {
  for (const c of complementos) {
    const m = c.match(/pagina[^:]*:\s*([\w\-\/]+)/i);
    if (m) return m[1].trim();
  }
  return null;
}

/**
 * Extrai, de um resultado do Datajud JA OBTIDO, os movimentos que indicam
 * publicacao/intimacao. Funcao pura: nao consulta nada.
 */
export function extrairPublicacoesDoDatajud(
  resultado: DatajudConsultaResultado,
): PublicacaoDjenResultado[] {
  const publicacoes: PublicacaoDjenResultado[] = [];

  for (const mov of resultado.movimentos) {
    const ehPublicacao =
      (mov.codigo && CODIGOS_PUBLICACAO.has(String(mov.codigo))) ||
      indicaPublicacao(mov.nome, mov.complementos);

    if (!ehPublicacao) continue;

    const dataPub = new Date(mov.dataHora);
    if (Number.isNaN(dataPub.getTime())) continue;

    const conteudo = [mov.nome, ...mov.complementos].filter(Boolean).join(" | ");

    publicacoes.push({
      dataPublicacao: dataPub,
      dataDisponibilizacao: null,
      conteudo,
      caderno: extrairCaderno(mov.complementos),
      pagina: extrairPagina(mov.complementos),
      geraIntimacao: detectaIntimacao(conteudo),
    });
  }

  return publicacoes;
}

export async function consultarPublicacoesDJEN(
  numeroProcesso: string,
  tribunal: string,
): Promise<PublicacaoDjenResultado[]> {
  const resultado = await consultarProcesso(numeroProcesso, tribunal);
  if (!resultado) return [];
  return extrairPublicacoesDoDatajud(resultado);
}

/**
 * Grava em lote as publicacoes derivadas do Datajud. Duplicadas pela unique
 * constraint (processoId, dataPublicacao, hashConteudo) sao ignoradas.
 */
export async function gravarPublicacoesDatajud(
  processoId: string,
  publicacoes: PublicacaoDjenResultado[],
): Promise<number> {
  if (publicacoes.length === 0) return 0;
  const criadas = await prisma.publicacaoDJEN.createMany({
    data: publicacoes.map((pub) => ({
      processoId,
      dataPublicacao: pub.dataPublicacao,
      dataDisponibilizacao: pub.dataDisponibilizacao,
      conteudo: pub.conteudo,
      caderno: pub.caderno,
      pagina: pub.pagina,
      fonte: "DJEN",
      geraIntimacao: pub.geraIntimacao,
      hashConteudo: hashConteudo(pub.conteudo),
    })),
    skipDuplicates: true,
  });
  return criadas.count;
}

/**
 * Consulta o Datajud e grava as publicacoes derivadas. Mantida para
 * compatibilidade; o cron usa verificarProcessoMonitorado, que aproveita a
 * mesma consulta das movimentacoes (uma requisicao por processo, nao duas).
 */
export async function verificarNovasPublicacoes(
  processoId: string,
): Promise<number> {
  const processo = await prisma.processo.findUnique({
    where: { id: processoId },
    select: { id: true, numero: true, tribunal: true },
  });
  if (!processo) return 0;

  const publicacoes = await consultarPublicacoesDJEN(
    processo.numero,
    processo.tribunal,
  );
  return gravarPublicacoesDatajud(processo.id, publicacoes);
}
