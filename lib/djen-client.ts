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
const DJEN_TIMEOUT_MS = 5000;
const JANELA_DIAS = 3;
const TAMANHO_MAXIMO = 50 * 1024; // 50KB
// DJEN aplica rate-limit (20 req/min) e responde 429 com cabecalhos
// `Retry-After` e `x-ratelimit-reset`. Retentamos ate este teto.
const DJEN_MAX_TENTATIVAS = 3;
const DJEN_ESPERA_MAX_MS = 30_000;

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

function dormir(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calcula quanto esperar antes de tentar de novo apos um 429.
 * Le os cabecalhos `Retry-After` (segundos) e `x-ratelimit-reset` (epoch
 * seconds). Se nenhum estiver presente ou for invalido, usa backoff fixo
 * proporcional ao numero da tentativa.
 */
function calcularEspera(res: Response, tentativa: number): number {
  const retryAfter = Number(res.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(retryAfter * 1000, DJEN_ESPERA_MAX_MS);
  }
  const reset = Number(res.headers.get("x-ratelimit-reset"));
  if (Number.isFinite(reset) && reset > 0) {
    const delta = reset * 1000 - Date.now();
    if (delta > 0) return Math.min(delta, DJEN_ESPERA_MAX_MS);
  }
  // Backoff fixo: 2s, 4s, 8s ...
  return Math.min(2_000 * 2 ** (tentativa - 1), DJEN_ESPERA_MAX_MS);
}

/**
 * Busca o inteiro teor de uma publicacao no DJEN, dado o numero do processo e
 * a data aproximada do andamento. Busca em janela de +/- 3 dias.
 *
 * Retorna o primeiro match que bater na janela de data.
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
  const { inicio, fim } = janelaDatas(dataAndamento);

  const params = new URLSearchParams({
    numeroProcesso: numero,
    dataDisponibilizacaoInicio: inicio,
    dataDisponibilizacaoFim: fim,
    itensPorPagina: "20",
  });

  const url = `${DJEN_ENDPOINT}?${params.toString()}`;
  console.log(`[djen] GET ${url}`);

  let ultimoErro: { motivo: "ERRO_BUSCA"; erro: string } = {
    motivo: "ERRO_BUSCA",
    erro: "sem tentativas",
  };

  for (let tentativa = 1; tentativa <= DJEN_MAX_TENTATIVAS; tentativa++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DJEN_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
        cache: "no-store",
      });

      if (res.status === 429) {
        const espera = calcularEspera(res, tentativa);
        console.warn(
          `[djen] HTTP 429 para ${numeroProcesso} (tentativa ${tentativa}/${DJEN_MAX_TENTATIVAS}), aguardando ${espera}ms`,
        );
        ultimoErro = { motivo: "ERRO_BUSCA", erro: "HTTP 429 (rate-limit)" };
        if (tentativa < DJEN_MAX_TENTATIVAS) {
          await dormir(espera);
          continue;
        }
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
        return { encontrado: false, motivo: "INDISPONIVEL" };
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
        return {
          encontrado: true,
          conteudo: truncarSeNecessario(conteudo),
          linkOficial: extrairLink(it),
          idPublicacao: extrairId(it),
          dataPublicacao: extrairData(it),
        };
      }

      return { encontrado: false, motivo: "INDISPONIVEL" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isAbort = err instanceof Error && err.name === "AbortError";
      console.warn(
        `[djen] erro buscando ${numeroProcesso}: ${isAbort ? "timeout" : msg}`,
      );
      return {
        encontrado: false,
        motivo: "ERRO_BUSCA",
        erro: isAbort ? "timeout" : msg,
      };
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
