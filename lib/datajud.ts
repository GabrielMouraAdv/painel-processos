import { prisma } from "./prisma";

export const DATAJUD_API_URL = "https://api-publica.datajud.cnj.jus.br";

export const DATAJUD_API_KEY = process.env.DATAJUD_API_KEY ?? "";

export const TRIBUNAL_ENDPOINTS: Record<string, string> = {
  TJPE: "api_publica_tjpe",
  TRF5: "api_publica_trf5",
  TRF1: "api_publica_trf1",
  TRT6: "api_publica_trt6",
  STJ: "api_publica_stj",
  STF: "api_publica_stf",
  // Tribunais consultaveis via derivacao do numero CNJ mesmo quando o
  // processo esta cadastrado como OUTRO (nao existem no enum Tribunal):
  TJPB: "api_publica_tjpb",
  TJRN: "api_publica_tjrn",
};

/**
 * Deriva o tribunal a partir do proprio numero CNJ (NNNNNNN-DD.AAAA.J.TR.OOOO):
 * J = segmento de justica, TR = tribunal/regiao. Cobre processos cadastrados
 * com tribunal errado (ex.: numero do TJPE salvo como OUTRO).
 */
export function tribunalPorNumeroCNJ(numero: string): string | null {
  const digitos = numero.replace(/\D+/g, "");
  if (digitos.length !== 20) return null;
  const segmento = digitos.charAt(13);
  const tr = digitos.slice(14, 16);
  if (segmento === "1") return "STF";
  if (segmento === "3") return "STJ";
  if (segmento === "4") {
    if (tr === "05") return "TRF5";
    if (tr === "01") return "TRF1";
    return null;
  }
  if (segmento === "5") return `TRT${Number(tr)}`;
  if (segmento === "8") {
    if (tr === "17") return "TJPE";
    if (tr === "15") return "TJPB";
    if (tr === "20") return "TJRN";
    return null;
  }
  return null;
}

export type DatajudMovimento = {
  codigo: string | null;
  nome: string;
  dataHora: string;
  complementos: string[];
};

export type DatajudConsultaResultado = {
  classe: string | null;
  orgaoJulgador: string | null;
  dataUltimaAtualizacao: string | null;
  movimentos: DatajudMovimento[];
};

function normalizarNumero(numero: string): string {
  return numero.replace(/\D+/g, "");
}

function endpointPorTribunal(tribunal: string): string | null {
  const alias = TRIBUNAL_ENDPOINTS[tribunal];
  if (!alias) return null;
  return `${DATAJUD_API_URL}/${alias}/_search`;
}

type RawHit = {
  classe?: string | { nome?: string };
  orgaoJulgador?: string | { nome?: string };
  dataHoraUltimaAtualizacao?: string;
  movimentos?: RawMovimento[];
};

type RawMovimento = {
  codigo?: number | string | null;
  nome?: string | null;
  dataHora?: string | null;
  complementosTabelados?: Array<{ descricao?: string; nome?: string }>;
  complemento?: unknown[];
};

function extrairComplementos(mov: RawMovimento): string[] {
  const lista: string[] = [];
  if (Array.isArray(mov.complementosTabelados)) {
    for (const c of mov.complementosTabelados) {
      // No Datajud, `nome` quase sempre traz o valor humano do complemento
      // (ex.: "Mandado", "para decisao", "sorteio") e `descricao` traz o
      // rotulo do campo em snake_case (ex.: "tipo_de_documento").
      // Queremos o valor humano. Consideramos algo "raw" (= rotulo, nao valor)
      // apenas se contiver underscore — palavras minusculas legitimas como
      // "sorteio" passam.
      const nome = typeof c?.nome === "string" ? c.nome.trim() : "";
      const descricao =
        typeof c?.descricao === "string" ? c.descricao.trim() : "";
      const nomeRaw = nome.includes("_");
      const descRaw = descricao.includes("_");
      const valor = nomeRaw
        ? descRaw
          ? nome || descricao
          : descricao || nome
        : nome || descricao;
      if (valor) lista.push(valor);
    }
  }
  if (Array.isArray(mov.complemento)) {
    for (const c of mov.complemento) {
      if (typeof c === "string") lista.push(c);
    }
  }
  return lista;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export async function consultarProcesso(
  numeroProcesso: string,
  tribunal: string,
): Promise<DatajudConsultaResultado | null> {
  // Se o tribunal cadastrado nao tem endpoint (ex.: OUTRO), tenta derivar do
  // proprio numero CNJ antes de desistir.
  const tribunalEfetivo = TRIBUNAL_ENDPOINTS[tribunal]
    ? tribunal
    : (tribunalPorNumeroCNJ(numeroProcesso) ?? tribunal);
  const endpoint = endpointPorTribunal(tribunalEfetivo);
  if (!endpoint) return null;
  if (!DATAJUD_API_KEY) return null;

  const numero = normalizarNumero(numeroProcesso);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `APIKey ${DATAJUD_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: { match: { numeroProcesso: numero } },
        size: 1,
      }),
      cache: "no-store",
    });

    if (!res.ok) return null;

    const json = (await res.json()) as {
      hits?: { hits?: Array<{ _source?: RawHit }> };
    };
    const hit = json?.hits?.hits?.[0]?._source;
    if (!hit) return null;

    const movimentos: DatajudMovimento[] = Array.isArray(hit.movimentos)
      ? hit.movimentos.map((m) => ({
          codigo: m?.codigo != null ? String(m.codigo) : null,
          nome: String(m?.nome ?? ""),
          dataHora: String(m?.dataHora ?? ""),
          complementos: extrairComplementos(m),
        }))
      : [];

    const orgao =
      typeof hit.orgaoJulgador === "string"
        ? hit.orgaoJulgador
        : (hit.orgaoJulgador?.nome ?? null);

    const classe =
      typeof hit.classe === "string"
        ? hit.classe
        : (hit.classe?.nome ?? null);

    return {
      classe: classe ?? null,
      orgaoJulgador: orgao ? String(orgao) : null,
      dataUltimaAtualizacao: hit.dataHoraUltimaAtualizacao ?? null,
      movimentos,
    };
  } catch {
    return null;
  }
}

export async function verificarNovasMovimentacoes(
  processoId: string,
): Promise<number> {
  const processo = await prisma.processo.findUnique({
    where: { id: processoId },
    select: { id: true, numero: true, tribunal: true },
  });
  if (!processo) return 0;

  let novas = 0;
  try {
    const resultado = await consultarProcesso(processo.numero, processo.tribunal);
    if (!resultado) {
      await prisma.monitoramentoConfig.upsert({
        where: { processoId: processo.id },
        create: {
          processoId: processo.id,
          ultimaVerificacao: new Date(),
          ultimoErro: "consulta retornou nulo",
          totalVerificacoes: 1,
        },
        update: {
          ultimaVerificacao: new Date(),
          ultimoErro: "consulta retornou nulo",
          totalVerificacoes: { increment: 1 },
        },
      });
      return 0;
    }

    // Insercao em LOTE: um processo nunca verificado pode trazer centenas de
    // movimentacoes historicas; criar uma a uma estourava o orcamento de
    // tempo do cron. createMany + skipDuplicates resolve em uma unica query
    // (duplicadas pela unique constraint processoId+dataMovimento+nomeMovimento
    // sao ignoradas, inclusive dentro do proprio lote).
    const linhas = [];
    for (const mov of resultado.movimentos) {
      if (!mov.nome || !mov.dataHora) continue;
      const data = new Date(mov.dataHora);
      if (Number.isNaN(data.getTime())) continue;
      linhas.push({
        processoId: processo.id,
        codigoMovimento: mov.codigo,
        nomeMovimento: mov.nome,
        dataMovimento: data,
        complementos: mov.complementos.length
          ? mov.complementos.join(" | ")
          : null,
        fonte: "DATAJUD",
      });
    }
    if (linhas.length > 0) {
      const criadas = await prisma.movimentacaoAutomatica.createMany({
        data: linhas,
        skipDuplicates: true,
      });
      novas = criadas.count;
    }

    // O inteiro teor (DJEN) NAO e buscado aqui: a movimentacao nasce com
    // conteudoIntegralStatus null e entra na fila (processarFilaDjen), que
    // respeita rate-limit e orcamento de tempo. Buscar inline derrubava o
    // cron por timeout antes de percorrer todos os processos.

    await prisma.monitoramentoConfig.upsert({
      where: { processoId: processo.id },
      create: {
        processoId: processo.id,
        ultimaVerificacao: new Date(),
        ultimoErro: null,
        totalVerificacoes: 1,
      },
      update: {
        ultimaVerificacao: new Date(),
        ultimoErro: null,
        totalVerificacoes: { increment: 1 },
      },
    });
  } catch (err) {
    const msg = errorMessage(err);
    await prisma.monitoramentoConfig.upsert({
      where: { processoId: processo.id },
      create: {
        processoId: processo.id,
        ultimaVerificacao: new Date(),
        ultimoErro: msg,
        totalVerificacoes: 1,
      },
      update: {
        ultimaVerificacao: new Date(),
        ultimoErro: msg,
        totalVerificacoes: { increment: 1 },
      },
    });
  }

  return novas;
}
