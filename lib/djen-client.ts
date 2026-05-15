/**
 * Cliente para a API publica do DJEN (Diario Eletronico Nacional).
 *
 * Endpoint: https://comunicaapi.pje.jus.br/api/v1/comunicacao
 *
 * Captura o INTEIRO TEOR das publicacoes oficiais para complementar o resumo
 * que vem do Datajud. Funciona apenas para tribunais que ja migraram para o DJEN
 * (Justica Estadual e Federal). Publicacoes trabalhistas (Justica do Trabalho)
 * sao IGNORADAS por opcao deste sistema.
 */

const DJEN_ENDPOINT = "https://comunicaapi.pje.jus.br/api/v1/comunicacao";
const DJEN_TIMEOUT_MS = 8_000;
const JANELA_DIAS = 3;
const TAMANHO_MAXIMO = 50 * 1024; // 50KB

// ============================================================================
// Rate limit + cooldown
// ============================================================================
// O DJEN aplica rate-limit por IP. Observacao empirica:
//   x-ratelimit-limit: 20 (por minuto)
// Quando estouramos o limite, o servidor entra em "cooldown" e:
//   - mantem 429 por um tempo que excede 1 janela (~1 min);
//   - devolve Retry-After com valor negativo (ex.: -34) e x-ratelimit-reset
//     ja no passado, ou seja, os cabecalhos NAO sao confiaveis para decidir
//     o backoff.
//
// Estrategia em duas camadas:
//
//   (a) Preventiva — janela deslizante em memoria limitada a `MAX_REQ_POR_MIN`,
//       deixando margem sobre o limite oficial. Toda chamada espera um slot
//       antes de tocar o fetch. Evita o 429 acontecer.
//
//   (b) Reativa — se mesmo assim vier 429 (rajada concorrente, varias
//       instancias, etc.), entramos em "modo cooldown" global por
//       `COOLDOWN_MS`: novas chamadas esperam o fim do cooldown antes de
//       tentar de novo. Cada 429 estende o cooldown.
const MAX_REQ_POR_MIN = 16;
const JANELA_MS = 60_000;
const COOLDOWN_MS = 65_000;
const DJEN_MAX_TENTATIVAS = 4;

const reqTimestamps: number[] = [];
let cooldownAte = 0;

function dormir(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function aguardarSlotDjen(): Promise<void> {
  // 1) Cooldown global ativo? Espera ele acabar.
  while (Date.now() < cooldownAte) {
    await dormir(Math.max(cooldownAte - Date.now() + 50, 100));
  }
  // 2) Janela deslizante.
  while (true) {
    const agora = Date.now();
    while (reqTimestamps.length > 0 && reqTimestamps[0] < agora - JANELA_MS) {
      reqTimestamps.shift();
    }
    if (reqTimestamps.length < MAX_REQ_POR_MIN) {
      reqTimestamps.push(agora);
      return;
    }
    const espera = reqTimestamps[0] + JANELA_MS - agora + 100;
    await dormir(Math.max(espera, 100));
  }
}

function entrarEmCooldown(): void {
  cooldownAte = Math.max(cooldownAte, Date.now() + COOLDOWN_MS);
  // Tambem zera a janela: o servidor nao confia nos timestamps locais.
  reqTimestamps.length = 0;
}

// ============================================================================
// Cache de resultados (em memoria)
// ============================================================================
// Mesma (numero, data) consultada repetidamente nao precisa bater no DJEN.
// Cacheia "encontrado" indefinidamente (o conteudo do diario nao muda) e
// "INDISPONIVEL" por 30 minutos (o diario pode aparecer depois). Nao cacheia
// ERRO_BUSCA — precisa retentar.
const CACHE_TTL_INDISP_MS = 30 * 60_000;
const cacheResultados = new Map<
  string,
  { resultado: BuscaPublicacaoResultado; expira: number }
>();

function chaveCache(numero: string, data: Date): string {
  return `${numero.replace(/\D+/g, "")}|${data.toISOString().slice(0, 10)}`;
}

function cacheGet(numero: string, data: Date): BuscaPublicacaoResultado | null {
  const v = cacheResultados.get(chaveCache(numero, data));
  if (!v) return null;
  if (Date.now() > v.expira) {
    cacheResultados.delete(chaveCache(numero, data));
    return null;
  }
  return v.resultado;
}

function cacheSet(
  numero: string,
  data: Date,
  resultado: BuscaPublicacaoResultado,
): void {
  if (resultado.encontrado) {
    cacheResultados.set(chaveCache(numero, data), {
      resultado,
      expira: Number.MAX_SAFE_INTEGER,
    });
  } else if (resultado.motivo === "INDISPONIVEL") {
    cacheResultados.set(chaveCache(numero, data), {
      resultado,
      expira: Date.now() + CACHE_TTL_INDISP_MS,
    });
  }
}

export type BuscaPublicacaoResultado =
  | {
      encontrado: true;
      conteudo: string;
      linkOficial: string | null;
      idPublicacao: string | null;
      dataPublicacao: string | null;
    }
  | {
      encontrado: false;
      motivo: "INDISPONIVEL" | "TRABALHISTA" | "ERRO_BUSCA";
      erro?: string;
    };

type DjenItem = {
  id?: number | string;
  numero_processo?: string;
  numeroProcesso?: string;
  texto?: string;
  conteudo?: string;
  data_disponibilizacao?: string;
  dataDisponibilizacao?: string;
  siglaTribunal?: string;
  tribunal?: string;
  link?: string;
  linkProcessoEletronico?: string;
  link_oficial?: string;
};

type DjenResponse = {
  status?: string;
  message?: string;
  count?: number;
  items?: DjenItem[];
  data?: DjenItem[];
  result?: DjenItem[];
};

/**
 * Identifica se o numero CNJ pertence a Justica do Trabalho.
 *
 * Formato CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO
 *   J = segmento de justica
 *     1 STF | 2 CNJ | 3 STJ | 4 Federal | 5 Trabalho | 6 Eleitoral | 7 Militar | 8 Estadual
 *   TR = tribunal/regiao
 */
export function ehProcessoTrabalhista(numero: string): boolean {
  const digitos = numero.replace(/\D+/g, "");
  if (digitos.length < 20) return false;
  // posicao 13 (zero-based) e o segmento J
  const segmento = digitos.charAt(13);
  return segmento === "5";
}

function normalizarNumero(numero: string): string {
  return numero.replace(/\D+/g, "");
}

function formatarDataISO(d: Date): string {
  // YYYY-MM-DD
  return d.toISOString().slice(0, 10);
}

function janelaDatas(base: Date): { inicio: string; fim: string } {
  const inicio = new Date(base);
  inicio.setDate(inicio.getDate() - JANELA_DIAS);
  const fim = new Date(base);
  fim.setDate(fim.getDate() + JANELA_DIAS);
  return { inicio: formatarDataISO(inicio), fim: formatarDataISO(fim) };
}

function truncarSeNecessario(texto: string): string {
  if (texto.length <= TAMANHO_MAXIMO) return texto;
  return texto.slice(0, TAMANHO_MAXIMO) + "\n\n[...texto truncado em 50KB...]";
}

function extrairConteudo(item: DjenItem): string {
  return String(item.texto ?? item.conteudo ?? "").trim();
}

function extrairLink(item: DjenItem): string | null {
  return (
    (item.linkProcessoEletronico as string | undefined) ??
    (item.link as string | undefined) ??
    (item.link_oficial as string | undefined) ??
    null
  );
}

function extrairData(item: DjenItem): string | null {
  return item.data_disponibilizacao ?? item.dataDisponibilizacao ?? null;
}

function extrairId(item: DjenItem): string | null {
  return item.id != null ? String(item.id) : null;
}

/**
 * Busca o inteiro teor de uma publicacao no DJEN, dado o numero do processo e
 * a data aproximada do andamento. Busca em janela de +/- 3 dias.
 *
 * Retorna o primeiro match que bater na janela de data.
 *
 * Internamente, respeita um rate-limiter (janela deslizante) e um cooldown
 * global em caso de 429 — o servidor publico do DJEN limita 20 req/min e nao
 * envia cabecalhos confiaveis quando estoura o limite.
 */
export async function buscarPublicacaoNoDJEN(
  numeroProcesso: string,
  dataAndamento: Date,
): Promise<BuscaPublicacaoResultado> {
  if (ehProcessoTrabalhista(numeroProcesso)) {
    console.warn(
      `[djen] tentativa de busca em processo trabalhista bloqueada: ${numeroProcesso}`,
    );
    return { encontrado: false, motivo: "TRABALHISTA" };
  }

  const numero = normalizarNumero(numeroProcesso);

  // Cache em memoria evita bater na API para a mesma chave (numero, data) em
  // curto intervalo (UI re-renderiza, cron passa de novo, etc.).
  const cached = cacheGet(numero, dataAndamento);
  if (cached) return cached;

  const { inicio, fim } = janelaDatas(dataAndamento);
  const params = new URLSearchParams({
    numeroProcesso: numero,
    dataDisponibilizacaoInicio: inicio,
    dataDisponibilizacaoFim: fim,
    itensPorPagina: "20",
  });
  const url = `${DJEN_ENDPOINT}?${params.toString()}`;

  let ultimoErro: { motivo: "ERRO_BUSCA"; erro: string } = {
    motivo: "ERRO_BUSCA",
    erro: "sem tentativas",
  };

  for (let tentativa = 1; tentativa <= DJEN_MAX_TENTATIVAS; tentativa++) {
    await aguardarSlotDjen();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DJEN_TIMEOUT_MS);

    try {
      console.log(`[djen] GET ${url} (tentativa ${tentativa})`);
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
        cache: "no-store",
      });

      if (res.status === 429) {
        entrarEmCooldown();
        console.warn(
          `[djen] HTTP 429 para ${numeroProcesso} (tentativa ${tentativa}/${DJEN_MAX_TENTATIVAS}); cooldown de ${COOLDOWN_MS}ms ativado`,
        );
        ultimoErro = { motivo: "ERRO_BUSCA", erro: "HTTP 429 (rate-limit)" };
        if (tentativa < DJEN_MAX_TENTATIVAS) continue;
        return { encontrado: false, ...ultimoErro };
      }

      if (!res.ok) {
        console.warn(`[djen] HTTP ${res.status} para ${numeroProcesso}`);
        return {
          encontrado: false,
          motivo: "ERRO_BUSCA",
          erro: `HTTP ${res.status}`,
        };
      }

      const json = (await res.json()) as DjenResponse;
      const items = json.items ?? json.data ?? json.result ?? [];

      if (!Array.isArray(items) || items.length === 0) {
        const resultado: BuscaPublicacaoResultado = {
          encontrado: false,
          motivo: "INDISPONIVEL",
        };
        cacheSet(numero, dataAndamento, resultado);
        return resultado;
      }

      // ordena por data (mais proxima do andamento primeiro) e pega a primeira nao-vazia
      const baseTs = dataAndamento.getTime();
      const ordenados = [...items].sort((a, b) => {
        const da = new Date(extrairData(a) ?? "").getTime() || 0;
        const db = new Date(extrairData(b) ?? "").getTime() || 0;
        return Math.abs(da - baseTs) - Math.abs(db - baseTs);
      });

      for (const it of ordenados) {
        const conteudo = extrairConteudo(it);
        if (conteudo.length === 0) continue;
        const resultado: BuscaPublicacaoResultado = {
          encontrado: true,
          conteudo: truncarSeNecessario(conteudo),
          linkOficial: extrairLink(it),
          idPublicacao: extrairId(it),
          dataPublicacao: extrairData(it),
        };
        cacheSet(numero, dataAndamento, resultado);
        return resultado;
      }

      const resultado: BuscaPublicacaoResultado = {
        encontrado: false,
        motivo: "INDISPONIVEL",
      };
      cacheSet(numero, dataAndamento, resultado);
      return resultado;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isAbort = err instanceof Error && err.name === "AbortError";
      console.warn(
        `[djen] erro buscando ${numeroProcesso}: ${isAbort ? "timeout" : msg}`,
      );
      // Em timeout ou erro de rede, retentamos se ainda houver tentativas.
      ultimoErro = {
        motivo: "ERRO_BUSCA",
        erro: isAbort ? "timeout" : msg,
      };
      if (tentativa < DJEN_MAX_TENTATIVAS) continue;
      return { encontrado: false, ...ultimoErro };
    } finally {
      clearTimeout(timer);
    }
  }

  return { encontrado: false, ...ultimoErro };
}

/**
 * Mapeia o resultado de buscarPublicacaoNoDJEN para o conjunto de campos que
 * vai persistir em MovimentacaoAutomatica.
 */
export function montarUpdateDjen(
  resultado: BuscaPublicacaoResultado,
): {
  conteudoIntegral: string | null;
  conteudoIntegralStatus: string;
  conteudoIntegralBuscadoEm: Date;
  djenIdPublicacao: string | null;
  djenLinkOficial: string | null;
} {
  const agora = new Date();
  if (resultado.encontrado) {
    return {
      conteudoIntegral: resultado.conteudo,
      conteudoIntegralStatus: "DISPONIVEL",
      conteudoIntegralBuscadoEm: agora,
      djenIdPublicacao: resultado.idPublicacao,
      djenLinkOficial: resultado.linkOficial,
    };
  }
  const status =
    resultado.motivo === "ERRO_BUSCA" ? "ERRO_BUSCA" : "INDISPONIVEL";
  return {
    conteudoIntegral: null,
    conteudoIntegralStatus: status,
    conteudoIntegralBuscadoEm: agora,
    djenIdPublicacao: null,
    djenLinkOficial: null,
  };
}
