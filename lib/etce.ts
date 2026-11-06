/**
 * Leitura da consulta PUBLICA do e-TCEPE (sem login, sem captcha).
 *
 * Pagina do processo: GET /epp/ConsultaExternaTCE/listView.seam?cprc=<8 digitos>&digito=<dv>
 * A pagina e JSF/PrimeFaces: as abas (Movimentacoes, Deliberacoes, Recursos) vem
 * por POST "partial/ajax" na mesma action, com JSESSIONID + ViewState da sessao.
 * Documentos ja vem no GET; um POST de paginacao do DataTable traz todos de uma vez.
 *
 * Armadilhas medidas em 06/11/2026:
 *  - o servidor cai (503) e, ao voltar, RENUMERA os ids gerados (j_idtNN):
 *    nunca fixar ids; localizar form/tabela pelo conteudo;
 *  - activateTab precisa de source = id do PAINEL da aba ativa
 *    (".../documentosTab"); com "...TabHeader" a resposta vem vazia;
 *  - processos fisicos antigos ("Eletronico: Nao") nao abrem aqui (erro 302).
 */

const BASE = process.env.ETCE_BASE_URL ?? "https://etce.tcepe.tc.br";
const UA = "Mozilla/5.0 (compatible; painel-processos/1.0; consulta publica e-TCEPE)";
// Processos com centenas de documentos levam mais de 40 s na primeira leitura.
const TIMEOUT_MS = 90_000;
const PAUSA_MS = 600;

export type DocumentoEtce = {
  numero: string;
  classificacao: string;
  descricao: string;
  data: string | null; // aaaa-mm-dd
  assinantes: string;
};
export type DeliberacaoEtce = {
  numero: string;
  data: string | null;
  dataPublicacao: string | null;
  pagina: string;
  tipo: string;
  colegiado: string;
};
export type MovimentacaoEtce = { tarefa: string; inicio: string | null; fim: string | null };
export type RecursoEtce = {
  numero: string;
  especie: string;
  dataEntrada: string | null;
  decisaoRecorrida: string;
  situacao: string;
};

export type LeituraEtce = {
  numeroBase: string;
  cabecalho: string;
  documentos: DocumentoEtce[];
  deliberacoes: DeliberacaoEtce[];
  movimentacoes: MovimentacaoEtce[];
  recursos: RecursoEtce[];
};

export class EtceErro extends Error {
  constructor(
    message: string,
    public readonly tipo: "FORA_DO_AR" | "NAO_ELETRONICO" | "ESTRUTURA" | "REDE",
  ) {
    super(message);
    this.name = "EtceErro";
  }
}

/** "26101133-9ED001" -> "26101133-9"; formatos antigos (PI, 6 ou 7 digitos) -> null. */
export function numeroBaseEtce(numero: string): string | null {
  const m = numero.trim().match(/^(\d{8})-(\d)/);
  return m ? `${m[1]}-${m[2]}` : null;
}

// --------------------------------------------------------------- HTML util

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#039;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function textoLimpo(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^"+|"+$/g, "")
    .trim();
}

/** Linhas de <tbody> com as celulas (td) ja limpas; ignora "Nao foram encontrados". */
function linhasDaTabela(html: string): string[][] {
  const linhas: string[][] = [];
  const corpos = html.match(/<tbody[^>]*>[\s\S]*?<\/tbody>/g) ?? [];
  for (const corpo of corpos) {
    for (const tr of corpo.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? []) {
      const tds = (tr.match(/<td[^>]*>[\s\S]*?<\/td>/g) ?? []).map(textoLimpo);
      if (tds.length === 0) continue;
      if (tds.length === 1 && /n[aã]o foram encontrados/i.test(tds[0])) continue;
      linhas.push(tds);
    }
  }
  return linhas;
}

/** "06-11-2026" ou "06/11/2026" -> "2026-11-06". */
function dataIso(s: string | undefined): string | null {
  const m = (s ?? "").match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

// --------------------------------------------------------------- sessao HTTP

class SessaoEtce {
  private cookies = new Map<string, string>();

  async pedir(caminho: string, corpo?: Record<string, string>): Promise<string> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const headers: Record<string, string> = { "User-Agent": UA };
      if (this.cookies.size) {
        headers.Cookie = Array.from(this.cookies, ([k, v]) => `${k}=${v}`).join("; ");
      }
      if (corpo) {
        headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
        headers["Faces-Request"] = "partial/ajax";
        headers["X-Requested-With"] = "XMLHttpRequest";
      }
      const resp = await fetch(BASE + caminho, {
        method: corpo ? "POST" : "GET",
        headers,
        body: corpo ? new URLSearchParams(corpo).toString() : undefined,
        redirect: "manual",
        signal: ctrl.signal,
        cache: "no-store",
      });
      const setCookie =
        (resp.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ??
        (resp.headers.get("set-cookie") ? [resp.headers.get("set-cookie") as string] : []);
      for (const c of setCookie) {
        const [par] = c.split(";");
        const i = par.indexOf("=");
        if (i > 0) this.cookies.set(par.slice(0, i).trim(), par.slice(i + 1).trim());
      }
      if (resp.status === 503 || resp.status === 502) {
        throw new EtceErro(`e-TCEPE fora do ar (HTTP ${resp.status})`, "FORA_DO_AR");
      }
      if (resp.status >= 300 && resp.status < 400) {
        const loc = resp.headers.get("location") ?? "";
        if (/errorUnexpected/i.test(loc)) {
          throw new EtceErro("processo nao abre no e-TCEPE (fisico/antigo?)", "NAO_ELETRONICO");
        }
        throw new EtceErro(`redirecionamento inesperado (HTTP ${resp.status})`, "ESTRUTURA");
      }
      if (!resp.ok) throw new EtceErro(`HTTP ${resp.status}`, "REDE");
      return await resp.text();
    } catch (err) {
      if (err instanceof EtceErro) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      throw new EtceErro(`falha de rede: ${msg}`, "REDE");
    } finally {
      clearTimeout(timer);
    }
  }
}

function caminhoAction(action: string): string {
  // action vem como "/epp/...seam;jsessionid=...?scid=NN" — mantem como esta.
  return decodeEntities(action);
}

// --------------------------------------------------------------- leitura

/**
 * opts.todosDocumentos: primeira leitura traz o historico inteiro; nas seguintes
 * bastam os mais recentes (a lista vem do mais novo para o mais antigo).
 */
export async function lerProcessoEtce(
  numeroBase: string,
  opts: { todosDocumentos?: boolean } = {},
): Promise<LeituraEtce> {
  const m = numeroBase.match(/^(\d{8})-(\d)$/);
  if (!m) throw new EtceErro(`numero fora do padrao e-TCEPE: ${numeroBase}`, "NAO_ELETRONICO");
  const s = new SessaoEtce();

  const pagina = await s.pedir(
    `/epp/ConsultaExternaTCE/listView.seam?cprc=${m[1]}&digito=${m[2]}`,
  );
  let viewState = pagina.match(/name="javax\.faces\.ViewState"[^>]*value="([^"]+)"/)?.[1];
  const cab = textoLimpo(pagina).match(/Processo nº .*?\[ver mais\]/)?.[0] ?? "";
  if (!viewState || !cab) {
    throw new EtceErro("pagina do processo sem cabecalho/ViewState", "ESTRUTURA");
  }

  // Form das abas: o que contem a <ul class="ui-tabs-nav">.
  const formAbas = pagina.match(
    /<form id="(wizardConsultaExterna2:j_idt\d+)"[^>]*action="([^"]+)"[^>]*>\s*<input[^>]*>\s*<ul[^>]*ui-tabs-nav/,
  );
  if (!formAbas) throw new EtceErro("form das abas nao encontrado", "ESTRUTURA");
  const [, formId, actionAbas] = formAbas;

  // ---- Documentos: todos de uma vez pela paginacao do DataTable.
  let documentos: DocumentoEtce[] = [];
  const tabelaDocs = pagina.match(/PrimeFaces\.cw\("DataTable","[^"]+",\{id:"([^"]+)"/)?.[1];
  if (tabelaDocs) {
    const formDocs = tabelaDocs.slice(0, tabelaDocs.lastIndexOf(":"));
    const actionDocs = pagina.match(
      new RegExp(`<form id="${formDocs.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*action="([^"]+)"`),
    )?.[1];
    if (actionDocs) {
      await dormir(PAUSA_MS);
      const resp = await s.pedir(caminhoAction(actionDocs), {
        "javax.faces.partial.ajax": "true",
        "javax.faces.source": tabelaDocs,
        "javax.faces.partial.execute": tabelaDocs,
        "javax.faces.partial.render": tabelaDocs,
        [`${tabelaDocs}_pagination`]: "true",
        [`${tabelaDocs}_first`]: "0",
        [`${tabelaDocs}_rows`]: opts.todosDocumentos === false ? "100" : "2000",
        [`${tabelaDocs}_skipChildren`]: "true",
        [`${tabelaDocs}_encodeFeature`]: "true",
        [formDocs]: formDocs,
        "javax.faces.ViewState": viewState,
      });
      viewState = resp.match(/ViewState[^>]*><!\[CDATA\[([^\]]+)/)?.[1] ?? viewState;
      // Na resposta de paginacao as linhas vem soltas (sem <tbody>).
      documentos = parseDocumentos(`<tbody>${resp}</tbody>`);
    }
  }
  if (documentos.length === 0) documentos = parseDocumentos(pagina);

  // ---- Demais abas via activateTab.
  let ativa = "documentosTab";
  async function aba(nova: string): Promise<string> {
    await dormir(PAUSA_MS);
    const resp = await s.pedir(caminhoAction(actionAbas), {
      "javax.faces.partial.ajax": "true",
      "javax.faces.source": `wizardConsultaExterna2:${ativa}`,
      "javax.faces.partial.event": "activateTab",
      "javax.faces.partial.execute": `wizardConsultaExterna2:${ativa}`,
      newTabId: nova,
      [formId]: formId,
      "javax.faces.ViewState": viewState as string,
    });
    viewState = resp.match(/ViewState[^>]*><!\[CDATA\[([^\]]+)/)?.[1] ?? viewState;
    if (resp.length < 500) throw new EtceErro(`aba ${nova} veio vazia`, "ESTRUTURA");
    ativa = nova;
    return resp;
  }

  const movimentacoes = linhasDaTabela(await aba("movimentacaoTab"))
    .filter((c) => c.length >= 2 && c[0])
    .map((c) => ({ tarefa: c[0], inicio: dataIso(c[1]), fim: dataIso(c[2]) }));

  const deliberacoes = linhasDaTabela(await aba("deliberacoesTab"))
    .filter((c) => c.length >= 5 && /^\d+$/.test(c[0]))
    .map((c) => ({
      numero: c[0],
      data: dataIso(c[1]),
      dataPublicacao: dataIso(c[2]),
      pagina: c[3] ?? "",
      tipo: c[4] ?? "",
      colegiado: c[5] ?? "",
    }));

  const recursos = linhasDaTabela(await aba("recursoTab"))
    .filter((c) => c.length >= 3 && c[0])
    .map((c) => ({
      numero: c[0],
      especie: c[1] ?? "",
      dataEntrada: dataIso(c[2]),
      decisaoRecorrida: c[3] ?? "",
      situacao: c[4] ?? "",
    }));

  return { numeroBase, cabecalho: cab, documentos, deliberacoes, movimentacoes, recursos };
}

function parseDocumentos(html: string): DocumentoEtce[] {
  return linhasDaTabela(html)
    .map((c) => {
      // 1a celula e o checkbox de selecao (vazia).
      const i = c.findIndex((x) => /^\d+$/.test(x));
      return i < 0 ? null : c.slice(i);
    })
    .filter((c): c is string[] => !!c && c.length >= 4)
    .map((c) => ({
      numero: c[0],
      classificacao: c[1] ?? "",
      descricao: c[2] ?? "",
      data: dataIso(c[3]),
      assinantes: c[5] ?? "",
    }));
}

// --------------------------------------------------------------- classificacao

/** Categoria de um documento pela "Classificacao de Documento" do e-TCEPE. */
export function categoriaDocumento(classificacao: string): string {
  const c = classificacao.toLowerCase();
  if (/^nota t[eé]cnica|^relat[oó]rio complementar/.test(c)) return "NOTA_TECNICA";
  if (/solicita[cç][aã]o de nota t[eé]cnica/.test(c)) return "PEDIDO_NT";
  if (/solicita[cç][aã]o de opinativo/.test(c)) return "PEDIDO_MPCO";
  // Cota (manifestacao intermediaria) nao e o parecer opinativo do MPCO.
  if (/cota\b.*\bmpc|\bmpc.*\bcota/.test(c)) return "COTA_MPCO";
  if (/parecer.*\bmpc|\bmpc.*parecer|opinativo mpc/.test(c)) return "PARECER_MPCO";
  if (/defesa pr[eé]via|manifesta[cç][aã]o pr[eé]via|contrarraz/.test(c)) return "DEFESA";
  if (/^ac[oó]rd[aã]o|parecer pr[eé]vio|inteiro teor da delibera/.test(c)) return "DELIBERACAO_MERITO";
  if (/delibera[cç][aã]o|despacho decis[oó]rio|decis[aã]o/.test(c)) return "DELIBERACAO";
  if (/of[ií]cio de notifica|notifica[cç][aã]o|cita[cç][aã]o/.test(c)) return "NOTIFICACAO";
  if (/relat[oó]rio de auditoria|relat[oó]rio preliminar/.test(c)) return "RELATORIO_AUDITORIA";
  if (/reencaminhamento|informativo interno|ci[eê]ncia de comunica|comprobat[oó]rio anexo/.test(c)) {
    return "RUIDO";
  }
  return "OUTRO";
}

/** Categoria de uma deliberacao pelo "Tipo da Deliberacao". */
export function categoriaDeliberacao(tipo: string): string {
  const t = tipo.toLowerCase();
  if (/prorroga/.test(t)) return "DELIBERACAO";
  if (/^ac[oó]rd[aã]o|parecer pr[eé]vio|^decis[aã]o\b/.test(t)) return "DELIBERACAO_MERITO";
  return "DELIBERACAO";
}

/** Tarefas internas que sao marcos para o advogado; o resto e ruido. */
export function categoriaTarefa(tarefa: string): string {
  const t = tarefa.toLowerCase();
  if (/aguardar prazo recursal/.test(t)) return "PRAZO_RECURSAL";
  if (/agendar processo para pauta/.test(t)) return "PAUTA";
  if (/devolu[cç][aã]o de vista/.test(t)) return "VISTA";
  if (/aguardar retorno de solicita/.test(t)) return "AGUARDA_NT_MPCO";
  if (/audi[eê]ncia pr[eé]via|t[eé]rmino da instru/.test(t)) return "INSTRUCAO";
  if (/tr[aâ]nsito|arquiv/.test(t)) return "ENCERRAMENTO";
  return "RUIDO";
}
