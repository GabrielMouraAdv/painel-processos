import { BANCAS } from "@/lib/bancas";

// Cliente minimal da Anthropic Messages API via fetch. Nao usa SDK
// (mantemos o bundle do server pequeno e evitamos dependencia extra).
// Modelo: Claude Haiku 4.5 — barato, rapido e suficiente para
// interpretar comandos curtos em portugues.

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5";
const ANTHROPIC_VERSION = "2023-06-01";

export type IntencaoAcao =
  | "cadastrar_compromisso"
  | "cadastrar_prazo"
  | "consultar"
  | "outro";

export type IntencaoTipo =
  | "ESCRITORIO"
  | "PROFISSIONAL_PRIVADO"
  | "PESSOAL"
  | "PRAZO_TCE"
  | "PRAZO_JUDICIAL";

export type ProcessoVinculadoIA = {
  id: string;
  numero: string;
  tipo: "tce" | "judicial";
} | null;

export type DadosIntencao = {
  titulo: string;
  descricao?: string | null;
  dataInicio: string | null; // ISO string
  dataFim: string | null;
  diaInteiro: boolean;
  local: string | null;
  processoVinculado: ProcessoVinculadoIA;
  escritorioResponsavel: string | null;
  advogadoResponsavel: string | null;
};

export type IntencaoIA = {
  acao: IntencaoAcao;
  tipo: IntencaoTipo | null;
  dados: DadosIntencao;
  confidence: number;
  mensagemConfirmacao: string;
  duvidas: string[];
};

export type ContextoUsuario = {
  agoraIso: string;
  nomeUsuario: string;
  podeUsarPrivadas: boolean;
  processos: {
    id: string;
    numero: string;
    tipo: "tce" | "judicial";
    descricao: string;
  }[];
  bancasUsuarioSlug: string[] | null; // null = todas
};

function bancasContextoTexto(): string {
  return BANCAS.map(
    (b) => `${b.sigla} (slug: ${b.slug}) — ${b.nome}`,
  ).join("\n");
}

function montarSystemPrompt(ctx: ContextoUsuario): string {
  const processosTxt =
    ctx.processos.length === 0
      ? "(usuario nao tem processos cadastrados)"
      : ctx.processos
          .map(
            (p) =>
              `- id=${p.id} | ${p.tipo.toUpperCase()} | numero=${p.numero} | ${p.descricao}`,
          )
          .join("\n");

  return `Voce e a IA da secretaria pessoal do "Painel Processos", um sistema juridico para advogados que atuam no TCE-PE e na Justica Estadual de Pernambuco.

Sua unica tarefa: interpretar a mensagem do usuario e devolver um JSON estruturado no formato definido abaixo, em PORTUGUES, SEM acentos especiais nas chaves.

Data e hora atuais: ${ctx.agoraIso}
Fuso horario do usuario: America/Recife
Nome do usuario: ${ctx.nomeUsuario}
Usuario pode usar categorias privadas (PROFISSIONAL_PRIVADO/PESSOAL): ${ctx.podeUsarPrivadas ? "SIM" : "NAO"}

Processos disponiveis do usuario (use o id quando souber qual e):
${processosTxt}

Bancas (escritorios responsaveis) que voce pode atribuir:
${bancasContextoTexto()}

REGRAS DE CLASSIFICACAO:

- acao = "cadastrar_compromisso" quando o usuario quer marcar uma reuniao, audiencia, viagem, compromisso pessoal, etc.
- acao = "cadastrar_prazo" quando ele cita explicitamente um prazo processual (defesa, memorial, embargos, recurso, contrarrazoes, etc) ligado a um processo identificavel.
- acao = "consultar" quando ele apenas pergunta algo (ex.: "o que tenho amanha"). Nao cadastre nada nesse caso.
- acao = "outro" quando a mensagem for ambigua ou nao se encaixar nos casos acima.

REGRAS DE CATEGORIA (campo tipo) para acao=cadastrar_compromisso:
- ESCRITORIO: tudo que envolve processo, cliente, audiencia, reuniao do escritorio (default).
- PROFISSIONAL_PRIVADO: trabalho privado fora do escritorio principal, ex.: "ALEPE", "consultoria", "freelance", "Camara Municipal".
- PESSOAL: assuntos pessoais (medico, dentista, academia, medicamento, familia).
- Se o usuario NAO pode usar privadas (${ctx.podeUsarPrivadas ? "SIM/permitido" : "NAO/proibido"}) e o texto parece privado/pessoal, AINDA ASSIM classifique como ESCRITORIO e marque na lista de duvidas que "essa categoria foi forcada para ESCRITORIO por permissao".

REGRAS para acao=cadastrar_prazo:
- tipo = PRAZO_TCE se o processo identificado e do tipo "tce" no contexto.
- tipo = PRAZO_JUDICIAL se for "judicial".
- E OBRIGATORIO ter processoVinculado preenchido. Se nao conseguir identificar com certeza qual processo, NAO escolha um chute: marque uma duvida no array "duvidas" com a pergunta especifica (ex.: "Qual processo? Voce tem 3 processos de Manari: 25100291-3, 24100339-8, 23100412-7").

DATAS E HORAS:
- Resolva datas relativas ("amanha", "sexta", "proxima semana", "em 5 dias").
- Para prazos, conte dias UTEIS apenas quando o usuario disser "X dias uteis"; caso contrario, conte dias corridos.
- Se o usuario disser apenas hora (ex.: "14h"), use a data de hoje (ou amanha se a hora ja passou).
- Se o usuario nao mencionar hora, considere diaInteiro=true e dataInicio meia-noite local.
- Sempre devolva dataInicio e dataFim em ISO 8601 com timezone -03:00 quando houver hora.
- Sempre que tiver data + hora + duracao, calcule dataFim. Default de duracao para compromissos: 1 hora.

PROCESSO VINCULADO:
- Se o texto cita numero ("processo 25100291"), localize na lista de processos pelo numero ou prefixo.
- Se cita municipio ou descricao (ex.: "processo de Manari"), tente identificar pelo campo "descricao" dos processos. Se houver multiplos candidatos, escolha NENHUM e adicione duvida.
- Se nao houver processo associado (ex.: "reuniao com cliente"), processoVinculado=null.

ESCRITORIO RESPONSAVEL:
- Se o processo vinculado for de uma banca claramente identificavel (ex.: "processo de Manari da banca Filipe Campos"), preencha com o slug da banca.
- Se houver duvida, deixe null.

NIVEL DE CONFIANCA (confidence):
- 0.9+ : tem todos os dados necessarios sem ambiguidade.
- 0.6-0.89 : tem o essencial mas algum detalhe foi inferido.
- < 0.6 : ha duvidas — popule o array "duvidas".

DUVIDAS:
- Cada item do array deve ser uma pergunta direta e curta em portugues. Maximo 2 duvidas.
- Se houver duvidas, mensagemConfirmacao pode resumir o que ja foi entendido + a primeira duvida.

mensagemConfirmacao:
- Texto curto em portugues, no maximo 6 linhas, usando emojis simples.
- Mostre titulo, data, hora, processo (se houver) e categoria.
- Termine com "Confirma? Responda SIM, EDITAR ou NAO."

FORMATO DA SAIDA:
Devolva EXCLUSIVAMENTE um JSON valido, sem texto antes ou depois, sem markdown, com esta forma:

{
  "acao": "cadastrar_compromisso" | "cadastrar_prazo" | "consultar" | "outro",
  "tipo": "ESCRITORIO" | "PROFISSIONAL_PRIVADO" | "PESSOAL" | "PRAZO_TCE" | "PRAZO_JUDICIAL" | null,
  "dados": {
    "titulo": string,
    "descricao": string | null,
    "dataInicio": ISO string | null,
    "dataFim": ISO string | null,
    "diaInteiro": boolean,
    "local": string | null,
    "processoVinculado": { "id": string, "numero": string, "tipo": "tce"|"judicial" } | null,
    "escritorioResponsavel": string | null,
    "advogadoResponsavel": string | null
  },
  "confidence": 0..1,
  "mensagemConfirmacao": string,
  "duvidas": string[]
}`;
}

export async function interpretarMensagem(
  texto: string,
  ctx: ContextoUsuario,
): Promise<IntencaoIA> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY nao configurada");
  }
  const system = montarSystemPrompt(ctx);

  const res = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      temperature: 0,
      system,
      messages: [
        {
          role: "user",
          content: texto,
        },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(
      `Anthropic API erro ${res.status}: ${t.slice(0, 200)}`,
    );
  }

  const body = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const textoSaida = (body.content ?? [])
    .filter((c) => c.type === "text" && typeof c.text === "string")
    .map((c) => c.text as string)
    .join("\n")
    .trim();

  if (!textoSaida) {
    throw new Error("Resposta vazia da IA");
  }

  // Remove cerca markdown se a IA escorregar e devolver ```json ... ```.
  let jsonTxt = textoSaida;
  const cerca = jsonTxt.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (cerca) jsonTxt = cerca[1].trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonTxt);
  } catch (err) {
    throw new Error(
      `Resposta da IA nao e JSON valido: ${(err as Error).message}. Texto: ${textoSaida.slice(0, 300)}`,
    );
  }

  // Saneamento leve do shape — defaults para garantir tipos.
  const intencao = parsed as Partial<IntencaoIA>;
  const dados = (intencao.dados ?? {}) as Partial<DadosIntencao>;

  const out: IntencaoIA = {
    acao: (intencao.acao as IntencaoAcao) ?? "outro",
    tipo: (intencao.tipo as IntencaoTipo | null) ?? null,
    dados: {
      titulo: typeof dados.titulo === "string" ? dados.titulo : "",
      descricao: dados.descricao ?? null,
      dataInicio:
        typeof dados.dataInicio === "string" ? dados.dataInicio : null,
      dataFim: typeof dados.dataFim === "string" ? dados.dataFim : null,
      diaInteiro: Boolean(dados.diaInteiro),
      local: dados.local ?? null,
      processoVinculado: dados.processoVinculado ?? null,
      escritorioResponsavel: dados.escritorioResponsavel ?? null,
      advogadoResponsavel: dados.advogadoResponsavel ?? null,
    },
    confidence:
      typeof intencao.confidence === "number"
        ? Math.max(0, Math.min(1, intencao.confidence))
        : 0,
    mensagemConfirmacao:
      typeof intencao.mensagemConfirmacao === "string"
        ? intencao.mensagemConfirmacao
        : "",
    duvidas: Array.isArray(intencao.duvidas)
      ? intencao.duvidas.filter((d): d is string => typeof d === "string")
      : [],
  };
  return out;
}
