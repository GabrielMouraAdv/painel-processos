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
  // Justica Eleitoral (usada pelo modulo eleitoral):
  "TRE-PE": "api_publica_tre-pe",
  TSE: "api_publica_tse",
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
  if (segmento === "6") {
    if (tr === "00") return "TSE";
    if (tr === "17") return "TRE-PE";
    return null;
  }
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
  grau?: string | null;
  movimentos?: RawMovimento[];
};

// Rotulo da instancia para os movimentos que nao sao do 1o grau.
function rotuloDoGrau(grau: string | null | undefined): string | null {
  const g = (grau ?? "").toUpperCase();
  if (!g || g === "G1" || g === "JE") return null;
  if (g === "G2") return "2º grau";
  if (g === "SUP") return "tribunal superior";
  return g;
}

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

export type DatajudConsultaDetalhada = {
  resultado: DatajudConsultaResultado | null;
  // Motivo de nao haver resultado: "sem endpoint", "sem chave", "nao encontrado",
  // "HTTP 429", "rede: fetch failed"... (null quando deu certo).
  erro: string | null;
};

// Tempo maximo de uma consulta: o Datajud chega a 50 s em horario ruim.
const DATAJUD_TIMEOUT_MS = 60_000;

async function chamarDatajud(endpoint: string, numero: string): Promise<Response> {
  return fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `APIKey ${DATAJUD_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: { match: { numeroProcesso: numero } },
      // O mesmo numero CNJ tem um registro por instancia (G1, G2, tribunal
      // superior). Com size 1 o painel via so uma delas — quase sempre o 1o
      // grau parado, enquanto o recurso andava no 2o grau.
      size: 10,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(DATAJUD_TIMEOUT_MS),
  });
}

/**
 * Consulta com o motivo da falha. Erros de rede, timeout, 429 e 5xx sao
 * tentados uma segunda vez apos 3 s.
 */
export async function consultarProcessoDetalhado(
  numeroProcesso: string,
  tribunal: string,
): Promise<DatajudConsultaDetalhada> {
  // Se o tribunal cadastrado nao tem endpoint (ex.: OUTRO), tenta derivar do
  // proprio numero CNJ antes de desistir.
  const tribunalEfetivo = TRIBUNAL_ENDPOINTS[tribunal]
    ? tribunal
    : (tribunalPorNumeroCNJ(numeroProcesso) ?? tribunal);
  const endpoint = endpointPorTribunal(tribunalEfetivo);
  if (!endpoint) return { resultado: null, erro: `sem endpoint para ${tribunal}` };
  if (!DATAJUD_API_KEY) return { resultado: null, erro: "sem chave DATAJUD_API_KEY" };

  const numero = normalizarNumero(numeroProcesso);

  let res: Response | null = null;
  let erroRede: string | null = null;
  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    try {
      res = await chamarDatajud(endpoint, numero);
      erroRede = null;
      if (res.ok || (res.status !== 429 && res.status < 500)) break;
    } catch (err) {
      erroRede = `rede: ${errorMessage(err)}`;
      res = null;
    }
    if (tentativa === 1) await new Promise((r) => setTimeout(r, 3_000));
  }
  if (!res) return { resultado: null, erro: erroRede ?? "sem resposta" };
  if (!res.ok) return { resultado: null, erro: `HTTP ${res.status}` };

  try {
    const json = (await res.json()) as {
      hits?: { hits?: Array<{ _source?: RawHit }> };
    };
    const hits = (json?.hits?.hits ?? [])
      .map((h) => h?._source)
      .filter((h): h is RawHit => !!h);
    if (hits.length === 0) return { resultado: null, erro: "nao encontrado no Datajud" };

    // Movimentos de todas as instancias juntos; os que nao sao do 1o grau
    // ganham o grau como primeiro complemento ("2º grau · para decisão").
    const movimentos: DatajudMovimento[] = [];
    for (const hit of hits) {
      const rotuloGrau = rotuloDoGrau(hit.grau);
      if (!Array.isArray(hit.movimentos)) continue;
      for (const m of hit.movimentos) {
        const complementos = extrairComplementos(m);
        movimentos.push({
          codigo: m?.codigo != null ? String(m.codigo) : null,
          nome: String(m?.nome ?? ""),
          dataHora: String(m?.dataHora ?? ""),
          complementos: rotuloGrau ? [rotuloGrau, ...complementos] : complementos,
        });
      }
    }
    movimentos.sort((a, b) => (a.dataHora < b.dataHora ? -1 : a.dataHora > b.dataHora ? 1 : 0));

    // Classe e orgao: da instancia atualizada mais recentemente pelo tribunal.
    const principal = hits.reduce((melhor, h) =>
      (h.dataHoraUltimaAtualizacao ?? "") > (melhor.dataHoraUltimaAtualizacao ?? "") ? h : melhor,
    );
    const orgao =
      typeof principal.orgaoJulgador === "string"
        ? principal.orgaoJulgador
        : (principal.orgaoJulgador?.nome ?? null);
    const classe =
      typeof principal.classe === "string"
        ? principal.classe
        : (principal.classe?.nome ?? null);
    const dataUltimaAtualizacao = hits
      .map((h) => h.dataHoraUltimaAtualizacao ?? "")
      .sort()
      .slice(-1)[0] || null;

    return {
      resultado: {
        classe: classe ?? null,
        orgaoJulgador: orgao ? String(orgao) : null,
        dataUltimaAtualizacao,
        movimentos,
      },
      erro: null,
    };
  } catch (err) {
    return { resultado: null, erro: `resposta invalida: ${errorMessage(err)}` };
  }
}

/**
 * Versao simples: so o resultado (null quando nao encontrou ou falhou).
 * Mantida para quem nao precisa do motivo (DJEN, eleitoral).
 */
export async function consultarProcesso(
  numeroProcesso: string,
  tribunal: string,
): Promise<DatajudConsultaResultado | null> {
  return (await consultarProcessoDetalhado(numeroProcesso, tribunal)).resultado;
}

/**
 * Registra o resultado de uma verificacao em MonitoramentoConfig (uma unica
 * gravacao por processo e por rodada). `datajudAtualizadoEm` e a
 * dataHoraUltimaAtualizacao que o Datajud devolveu — a tela usa a mais
 * recente delas para avisar quando a base do CNJ esta congelada.
 */
export async function registrarVerificacaoMonitoramento(
  processoId: string,
  info: { erro: string | null; datajudAtualizadoEm?: Date | null },
): Promise<void> {
  const agora = new Date();
  const atualizadoEm =
    info.datajudAtualizadoEm instanceof Date &&
    !Number.isNaN(info.datajudAtualizadoEm.getTime())
      ? info.datajudAtualizadoEm
      : undefined;
  await prisma.monitoramentoConfig.upsert({
    where: { processoId },
    create: {
      processoId,
      ultimaVerificacao: agora,
      ultimoErro: info.erro,
      totalVerificacoes: 1,
      ...(atualizadoEm ? { datajudAtualizadoEm: atualizadoEm } : {}),
    },
    update: {
      ultimaVerificacao: agora,
      ultimoErro: info.erro,
      totalVerificacoes: { increment: 1 },
      ...(atualizadoEm ? { datajudAtualizadoEm: atualizadoEm } : {}),
    },
  });
}

export function datajudAtualizadoEmDe(
  resultado: DatajudConsultaResultado | null,
): Date | null {
  if (!resultado?.dataUltimaAtualizacao) return null;
  const d = new Date(resultado.dataUltimaAtualizacao);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Grava em lote as movimentacoes de um resultado do Datajud ja obtido.
 * Devolve quantas eram novas (duplicadas pela unique constraint
 * processoId+dataMovimento+nomeMovimento sao ignoradas).
 */
export async function gravarMovimentacoesDatajud(
  processoId: string,
  resultado: DatajudConsultaResultado,
): Promise<number> {
  // Insercao em LOTE: um processo nunca verificado pode trazer centenas de
  // movimentacoes historicas; criar uma a uma estourava o orcamento de
  // tempo do cron. createMany + skipDuplicates resolve em uma unica query.
  const linhas = [];
  for (const mov of resultado.movimentos) {
    if (!mov.nome || !mov.dataHora) continue;
    const data = new Date(mov.dataHora);
    if (Number.isNaN(data.getTime())) continue;
    linhas.push({
      processoId,
      codigoMovimento: mov.codigo,
      nomeMovimento: mov.nome,
      dataMovimento: data,
      complementos: mov.complementos.length
        ? mov.complementos.join(" | ")
        : null,
      fonte: "DATAJUD",
    });
  }
  if (linhas.length === 0) return 0;
  // Movimentos ja lidos no PJe pelo conector (fonte "PDPJ", scripts/importar-movimentos-pdpj.ts)
  // chegam ao DataJud semanas depois e com outro horario: mesmo dia (Recife) e mesmo nome
  // = mesmo movimento, nao grava de novo.
  const pdpj = await prisma.movimentacaoAutomatica.findMany({
    where: { processoId, fonte: "PDPJ" },
    select: { dataMovimento: true, nomeMovimento: true },
  });
  const chave = (d: Date, nome: string) =>
    `${new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife" }).format(d)}|${nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()}`;
  const jaVieram = new Set(pdpj.map((m) => chave(m.dataMovimento, m.nomeMovimento)));
  const novas = jaVieram.size ? linhas.filter((l) => !jaVieram.has(chave(l.dataMovimento, l.nomeMovimento))) : linhas;
  if (novas.length === 0) return 0;
  const criadas = await prisma.movimentacaoAutomatica.createMany({
    data: novas,
    skipDuplicates: true,
  });
  // O inteiro teor (DJEN) NAO e buscado aqui: a movimentacao nasce com
  // conteudoIntegralStatus null e entra na fila (processarFilaDjen), que
  // respeita rate-limit e orcamento de tempo.
  return criadas.count;
}

/**
 * Consulta o Datajud e grava as movimentacoes novas de um processo.
 * Mantida para quem so precisa das movimentacoes; o cron usa
 * verificarProcessoMonitorado (lib/monitoramento-verificar.ts), que
 * aproveita a MESMA consulta tambem para as publicacoes.
 */
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
      await registrarVerificacaoMonitoramento(processo.id, {
        erro: "consulta retornou nulo",
      });
      return 0;
    }
    novas = await gravarMovimentacoesDatajud(processo.id, resultado);
    await registrarVerificacaoMonitoramento(processo.id, {
      erro: null,
      datajudAtualizadoEm: datajudAtualizadoEmDe(resultado),
    });
  } catch (err) {
    await registrarVerificacaoMonitoramento(processo.id, {
      erro: errorMessage(err),
    });
  }

  return novas;
}
