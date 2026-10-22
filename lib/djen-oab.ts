/**
 * Varredura do DJEN por OAB (fonte primaria do monitoramento judicial).
 *
 * A API publica do DJEN (comunicaapi.pje.jus.br) aceita busca por advogado:
 * numeroOab + ufOab + janela de dataDisponibilizacao, paginada em ate 100
 * itens. Em vez de consultar processo a processo, o cron pergunta "o que
 * foi publicado para cada advogado do escritorio nos ultimos N dias" — sao
 * poucas requisicoes por dia (uma por OAB e por pagina).
 *
 * Cada comunicacao cujo numero de processo (20 digitos) existe no painel
 * vira uma PublicacaoDJEN com fonte "DJEN_OAB". Comunicacoes de processos
 * que NAO estao no painel nao criam processo: sao apenas devolvidas no
 * resultado para o usuario decidir se cadastra.
 */
import { createHash } from "crypto";

import { oabsMonitoradasDjen, type OabMonitorada } from "./bancas";
import { DJEN_ENDPOINT_COMUNICACAO, requisitarDjen } from "./djen-client";
import { detectaIntimacao } from "./monitoramento-detect";
import { prisma } from "./prisma";

export const FONTE_DJEN_OAB = "DJEN_OAB";
const ITENS_POR_PAGINA = 100;
const MAX_PAGINAS_POR_OAB = 20;
const TAMANHO_MAXIMO = 50 * 1024;

export type ComunicacaoDjen = {
  id: string;
  numeroProcesso: string; // 20 digitos
  numeroComMascara: string;
  tribunal: string;
  classe: string;
  tipoComunicacao: string;
  orgao: string;
  texto: string;
  link: string | null;
  dataDisponibilizacao: string; // YYYY-MM-DD
  oabs: string[]; // "PE 58958" das OABs monitoradas em que apareceu
};

export type VarreduraOabResultado = {
  janela: { inicio: string; fim: string; dias: number };
  porOab: {
    oab: string;
    advogado: string;
    sigla: string;
    total: number;
    paginas: number;
    erro: string | null;
  }[];
  comunicacoes: number; // distintas (uma comunicacao pode citar 2 advogados)
  casaram: number; // comunicacoes de processos que estao no painel
  gravadas: number; // PublicacaoDJEN novas (0 em simulacao)
  simulacao: boolean;
  interrompidoPorTempo: boolean;
  noPainel: {
    processoId: string;
    numero: string;
    data: string;
    tribunal: string;
    tipoComunicacao: string;
    geraIntimacao: boolean;
    resumo: string;
  }[];
  naoCasaram: {
    numero: string;
    tribunal: string;
    classe: string;
    orgao: string;
    data: string;
    tipoComunicacao: string;
    oabs: string[];
    comunicacoes: number;
  }[];
};

type DjenItemOab = {
  id?: number | string;
  numero_processo?: string;
  numeroprocessocommascara?: string;
  siglaTribunal?: string;
  nomeClasse?: string;
  tipoComunicacao?: string;
  tipoDocumento?: string;
  nomeOrgao?: string;
  texto?: string;
  link?: string;
  data_disponibilizacao?: string;
  datadisponibilizacao?: string;
};

type DjenRespostaOab = {
  status?: string;
  message?: string;
  count?: number;
  items?: DjenItemOab[];
};

function soDigitos(v: string | null | undefined): string {
  return (v ?? "").replace(/\D+/g, "");
}

function dataISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// A API devolve a data como "2026-10-19" (data_disponibilizacao) ou
// "19/10/2026" (datadisponibilizacao). Normaliza para YYYY-MM-DD.
function normalizarData(item: DjenItemOab): string | null {
  const a = (item.data_disponibilizacao ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(a)) return a.slice(0, 10);
  const b = (item.datadisponibilizacao ?? "").trim();
  const m = b.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

function limparTexto(texto: string): string {
  const t = texto.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
  if (t.length <= TAMANHO_MAXIMO) return t;
  return t.slice(0, TAMANHO_MAXIMO) + "\n\n[...texto truncado em 50KB...]";
}

export function hashConteudo(conteudo: string | null | undefined): string {
  return createHash("md5").update(conteudo ?? "", "utf8").digest("hex");
}

// Data de publicacao gravada como meia-noite UTC: o painel trata esse valor
// como "so data" (lib/datas.ts: diaDe) e mostra o dia certo em Recife.
function dataPublicacaoDe(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function resumoDe(texto: string, max = 240): string {
  const t = texto.replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max) + "…" : t;
}

/**
 * Busca todas as comunicacoes de uma OAB na janela, pagina a pagina.
 */
export async function buscarComunicacoesPorOab(
  oab: OabMonitorada,
  janela: { inicio: string; fim: string },
  opts?: { deadline?: number },
): Promise<{
  itens: ComunicacaoDjen[];
  paginas: number;
  erro: string | null;
  esgotouTempo: boolean;
}> {
  const itens: ComunicacaoDjen[] = [];
  let paginas = 0;
  const rotuloOab = `${oab.uf} ${oab.numero}`;

  for (let pagina = 1; pagina <= MAX_PAGINAS_POR_OAB; pagina++) {
    const params = new URLSearchParams({
      numeroOab: oab.numero,
      ufOab: oab.uf,
      dataDisponibilizacaoInicio: janela.inicio,
      dataDisponibilizacaoFim: janela.fim,
      itensPorPagina: String(ITENS_POR_PAGINA),
      pagina: String(pagina),
    });
    const url = `${DJEN_ENDPOINT_COMUNICACAO}?${params.toString()}`;
    const res = await requisitarDjen(url, {
      deadline: opts?.deadline,
      rotulo: `OAB ${rotuloOab} p.${pagina} (${janela.inicio}..${janela.fim})`,
    });
    if (!res.ok) {
      return { itens, paginas, erro: res.erro, esgotouTempo: res.esgotouTempo };
    }
    paginas++;
    const json = res.json as DjenRespostaOab;
    const lista = Array.isArray(json.items) ? json.items : [];
    for (const it of lista) {
      const numero = soDigitos(it.numero_processo ?? it.numeroprocessocommascara);
      const data = normalizarData(it);
      if (numero.length !== 20 || !data) continue;
      itens.push({
        id:
          it.id != null
            ? String(it.id)
            : `${numero}|${data}|${hashConteudo(it.texto)}`,
        numeroProcesso: numero,
        numeroComMascara: (it.numeroprocessocommascara ?? "").trim() || numero,
        tribunal: (it.siglaTribunal ?? "").trim(),
        classe: (it.nomeClasse ?? "").trim(),
        tipoComunicacao: (it.tipoComunicacao ?? it.tipoDocumento ?? "").trim(),
        orgao: (it.nomeOrgao ?? "").trim(),
        texto: limparTexto(String(it.texto ?? "")),
        link: (it.link ?? "").trim() || null,
        dataDisponibilizacao: data,
        oabs: [rotuloOab],
      });
    }
    // Ultima pagina: veio menos que o tamanho da pagina, ou ja cobrimos count.
    const total = typeof json.count === "number" ? json.count : null;
    if (lista.length < ITENS_POR_PAGINA) break;
    if (total != null && pagina * ITENS_POR_PAGINA >= total) break;
  }
  return { itens, paginas, erro: null, esgotouTempo: false };
}

/**
 * Varre todas as OABs monitoradas (lib/bancas.ts) nos ultimos `dias` dias,
 * casa com os processos do painel e grava as intimacoes (salvo simulacao).
 *
 * @param opts.dias      tamanho da janela (padrao 3; a carga inicial usa 30)
 * @param opts.gravar    false = simulacao, nada e gravado (padrao false)
 * @param opts.deadline  epoch ms; ao passar, para limpo com resultado parcial
 * @param opts.fim       data final da janela (padrao: hoje, UTC)
 */
export async function varrerDjenPorOab(opts?: {
  dias?: number;
  gravar?: boolean;
  deadline?: number;
  fim?: Date;
}): Promise<VarreduraOabResultado> {
  const dias = Math.max(1, Math.trunc(opts?.dias ?? 3));
  const gravar = opts?.gravar === true;
  const fimDate = opts?.fim ?? new Date();
  const inicioDate = new Date(fimDate);
  inicioDate.setUTCDate(inicioDate.getUTCDate() - dias);
  const janela = { inicio: dataISO(inicioDate), fim: dataISO(fimDate), dias };

  const oabs = oabsMonitoradasDjen();
  const porOab: VarreduraOabResultado["porOab"] = [];
  const distintas = new Map<string, ComunicacaoDjen>();
  let interrompidoPorTempo = false;

  for (const oab of oabs) {
    const rotulo = `${oab.uf} ${oab.numero}`;
    if (interrompidoPorTempo) {
      porOab.push({
        oab: rotulo,
        advogado: oab.advogado,
        sigla: oab.sigla,
        total: 0,
        paginas: 0,
        erro: "nao consultada (tempo esgotado)",
      });
      continue;
    }
    const r = await buscarComunicacoesPorOab(oab, janela, {
      deadline: opts?.deadline,
    });
    if (r.esgotouTempo) interrompidoPorTempo = true;
    porOab.push({
      oab: rotulo,
      advogado: oab.advogado,
      sigla: oab.sigla,
      total: r.itens.length,
      paginas: r.paginas,
      erro: r.erro,
    });
    for (const c of r.itens) {
      const atual = distintas.get(c.id);
      if (atual) {
        if (!atual.oabs.includes(rotulo)) atual.oabs.push(rotulo);
      } else {
        distintas.set(c.id, c);
      }
    }
  }

  const comunicacoes = Array.from(distintas.values());

  // Casa com os processos do painel comparando so os digitos do numero.
  const processos = comunicacoes.length
    ? await prisma.processo.findMany({ select: { id: true, numero: true } })
    : [];
  const porNumero = new Map<string, { id: string; numero: string }>();
  for (const p of processos) porNumero.set(soDigitos(p.numero), p);

  const linhas: {
    processoId: string;
    dataPublicacao: Date;
    dataDisponibilizacao: Date;
    conteudo: string;
    caderno: string | null;
    fonte: string;
    geraIntimacao: boolean;
    hashConteudo: string;
    linkOficial: string | null;
    tipoComunicacao: string | null;
  }[] = [];
  const noPainel: VarreduraOabResultado["noPainel"] = [];
  const foraAgrupado = new Map<
    string,
    VarreduraOabResultado["naoCasaram"][number]
  >();

  for (const c of comunicacoes) {
    const p = porNumero.get(c.numeroProcesso);
    if (!p) {
      const g = foraAgrupado.get(c.numeroProcesso);
      if (g) {
        g.comunicacoes++;
        if (c.dataDisponibilizacao > g.data) g.data = c.dataDisponibilizacao;
        for (const o of c.oabs) if (!g.oabs.includes(o)) g.oabs.push(o);
      } else {
        foraAgrupado.set(c.numeroProcesso, {
          numero: c.numeroComMascara,
          tribunal: c.tribunal,
          classe: c.classe,
          orgao: c.orgao,
          data: c.dataDisponibilizacao,
          tipoComunicacao: c.tipoComunicacao,
          oabs: [...c.oabs],
          comunicacoes: 1,
        });
      }
      continue;
    }
    const geraIntimacao =
      detectaIntimacao(c.texto) || /intima|cita/i.test(c.tipoComunicacao);
    noPainel.push({
      processoId: p.id,
      numero: p.numero,
      data: c.dataDisponibilizacao,
      tribunal: c.tribunal,
      tipoComunicacao: c.tipoComunicacao,
      geraIntimacao,
      resumo: resumoDe(c.texto),
    });
    linhas.push({
      processoId: p.id,
      dataPublicacao: dataPublicacaoDe(c.dataDisponibilizacao),
      dataDisponibilizacao: dataPublicacaoDe(c.dataDisponibilizacao),
      conteudo: c.texto,
      caderno: [c.tribunal, c.orgao].filter(Boolean).join(" · ") || null,
      fonte: FONTE_DJEN_OAB,
      geraIntimacao,
      hashConteudo: hashConteudo(c.texto),
      linkOficial: c.link,
      tipoComunicacao: c.tipoComunicacao || null,
    });
  }

  let gravadas = 0;
  if (gravar && linhas.length > 0) {
    const criadas = await prisma.publicacaoDJEN.createMany({
      data: linhas,
      skipDuplicates: true,
    });
    gravadas = criadas.count;
  }

  const maisRecentePrimeiro = (a: { data: string }, b: { data: string }) =>
    a.data < b.data ? 1 : a.data > b.data ? -1 : 0;
  noPainel.sort(maisRecentePrimeiro);
  const naoCasaram = Array.from(foraAgrupado.values()).sort(maisRecentePrimeiro);

  return {
    janela,
    porOab,
    comunicacoes: comunicacoes.length,
    casaram: linhas.length,
    gravadas,
    simulacao: !gravar,
    interrompidoPorTempo,
    noPainel,
    naoCasaram,
  };
}
