import Anthropic from "@anthropic-ai/sdk";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Leitura por IA SO das deliberacoes de merito novas (acordao, parecer previo,
 * decisao) detectadas pelo coletor do e-TCEPE. O texto vem da API publica do
 * Portal da Jurisprudencia do TCE-PE (sem captcha). Acordaos recem-publicados
 * podem demorar a ser indexados: sem texto, o evento fica pendente e e tentado
 * de novo na rodada seguinte (ate 60 dias).
 *
 * O resultado fica em EventoEtce.analiseIa para conferencia; nada e gravado
 * no ProcessoTce durante a comparacao com a planilha.
 */

const JURIS =
  "https://portal.tcepe.tc.br/jurisprudencia/services/jurisprudencia/api/publico/deliberacoes";
const MODELO = process.env.ETCE_IA_MODEL ?? "claude-haiku-5-5";
const MAX_CHARS = 60_000;
const JANELA_DIAS = 60;

type RegistroJuris = {
  numeroProcessoProcesso?: string;
  nomeTipoDocumento?: string;
  dataJulgamentoProcesso?: string;
  descricaoParecerProcesso?: string;
  nomeOrgaoJulgador?: string;
};

export type AnaliseDeliberacao = {
  tipo: string;
  resultado: string;
  penalidade: string | null;
  valorMulta: number | null;
  valorDevolucao: number | null;
  responsaveis: string[];
  determinacoes: string | null;
  resumo: string;
  fonte: { dataJulgamento: string | null; tipoDocumento: string | null; caracteres: number };
};

async function inteiroTeor(numeroBase: string, dataIso: string | null): Promise<RegistroJuris | null> {
  const qs = new URLSearchParams({
    page: "0",
    size: "20",
    sort: "dataJulgamentoProcesso,desc",
    "numeroProcesso.equals": numeroBase,
    "acordao.equals": "true",
    "decisao.equals": "true",
    "parecerPrevio.equals": "true",
    "inteiroTeor.equals": "false",
    "todasBaseExprExata.equals": "false",
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90_000);
  try {
    const resp = await fetch(`${JURIS}?${qs}`, { signal: ctrl.signal, cache: "no-store" });
    if (!resp.ok) throw new Error(`jurisprudencia HTTP ${resp.status}`);
    const lista = (await resp.json()) as RegistroJuris[];
    const comTexto = lista.filter((r) => (r.descricaoParecerProcesso ?? "").length > 200);
    if (!comTexto.length) return null;
    // Mesmo dia de julgamento primeiro; senao o mais recente.
    return comTexto.find((r) => dataIso && r.dataJulgamentoProcesso?.startsWith(dataIso)) ?? comTexto[0];
  } finally {
    clearTimeout(timer);
  }
}

const PROMPT = `Você lê deliberações do Tribunal de Contas do Estado de Pernambuco para um advogado de defesa.
Extraia SOMENTE o que está no texto, sem inferir. Responda APENAS com um JSON válido, sem comentários:
{
 "tipo": "Acórdão | Parecer Prévio | Decisão | outro",
 "resultado": "como o dispositivo decide (ex.: 'regular com ressalvas', 'irregular', 'cautelar referendada', 'recurso provido em parte', 'parecer pela rejeição das contas')",
 "penalidade": "multa, imputação de débito, inabilitação etc., ou null",
 "valorMulta": número em reais ou null (soma, se houver mais de uma),
 "valorDevolucao": número em reais ou null,
 "responsaveis": ["nomes dos responsabilizados no dispositivo"],
 "determinacoes": "determinações/recomendações em uma frase, ou null",
 "resumo": "duas frases objetivas sobre o que foi decidido"
}`;

function textoLimpo(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function analisar(texto: string): Promise<Omit<AnaliseDeliberacao, "fonte">> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY nao configurada");
  const client = new Anthropic({ apiKey });
  // O dispositivo fica no fim: se o texto for longo, manter inicio e fim.
  const corpo =
    texto.length > MAX_CHARS
      ? `${texto.slice(0, MAX_CHARS * 0.3)}\n[...]\n${texto.slice(-MAX_CHARS * 0.7)}`
      : texto;
  const msg = await client.messages.create({
    model: MODELO,
    max_tokens: 1200,
    system: PROMPT,
    messages: [{ role: "user", content: corpo }],
  });
  const saida = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  const json = saida.slice(saida.indexOf("{"), saida.lastIndexOf("}") + 1);
  return JSON.parse(json);
}

/** Analisa as deliberacoes de merito pendentes ate o prazo. */
export async function analisarDeliberacoesPendentes(opts: {
  gravar: boolean;
  deadline: number;
  limite?: number;
}): Promise<{ analisadas: number; semTexto: number; erros: { id: string; erro: string }[] }> {
  const desde = new Date(Date.now() - JANELA_DIAS * 86_400_000);
  const pendentes = await prisma.eventoEtce.findMany({
    where: {
      tipo: "DELIBERACAO",
      categoria: "DELIBERACAO_MERITO",
      linhaDeBase: false,
      analisadoEm: null,
      detectadoEm: { gte: desde },
    },
    orderBy: { detectadoEm: "asc" },
    take: opts.limite ?? 10,
  });
  let analisadas = 0;
  let semTexto = 0;
  const erros: { id: string; erro: string }[] = [];
  for (const ev of pendentes) {
    if (Date.now() > opts.deadline) break;
    try {
      const dataIso = ev.data ? ev.data.toISOString().slice(0, 10) : null;
      const reg = await inteiroTeor(ev.numeroBase, dataIso);
      if (!reg) {
        semTexto++;
        if (opts.gravar) {
          await prisma.eventoEtce.update({
            where: { id: ev.id },
            data: { analiseErro: "inteiro teor ainda nao indexado na jurisprudencia" },
          });
        }
        continue;
      }
      const texto = textoLimpo(reg.descricaoParecerProcesso ?? "");
      const base = await analisar(texto);
      const analise: AnaliseDeliberacao = {
        ...base,
        fonte: {
          dataJulgamento: reg.dataJulgamentoProcesso ?? null,
          tipoDocumento: reg.nomeTipoDocumento ?? null,
          caracteres: texto.length,
        },
      };
      analisadas++;
      if (opts.gravar) {
        await prisma.eventoEtce.update({
          where: { id: ev.id },
          data: {
            analiseIa: analise as unknown as Prisma.InputJsonValue,
            analisadoEm: new Date(),
            analiseErro: null,
          },
        });
      }
    } catch (err) {
      const erro = err instanceof Error ? err.message : String(err);
      erros.push({ id: ev.id, erro });
      if (opts.gravar) {
        await prisma.eventoEtce.update({ where: { id: ev.id }, data: { analiseErro: erro } });
      }
    }
  }
  return { analisadas, semTexto, erros };
}
