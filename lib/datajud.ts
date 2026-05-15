import { prisma } from "./prisma";
import {
  buscarPublicacaoNoDJEN,
  ehProcessoTrabalhista,
  montarUpdateDjen,
} from "./djen-client";

export const DATAJUD_API_URL = "https://api-publica.datajud.cnj.jus.br";

export const DATAJUD_API_KEY = process.env.DATAJUD_API_KEY ?? "";

export const TRIBUNAL_ENDPOINTS: Record<string, string> = {
  TJPE: "api_publica_tjpe",
  TRF5: "api_publica_trf5",
  TRF1: "api_publica_trf1",
  STJ: "api_publica_stj",
  STF: "api_publica_stf",
};

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
      // No Datajud, `nome` traz o valor humano do complemento (ex.: "Mandado",
      // "Acordao") e `descricao` traz o rotulo do campo (ex.: "tipo_de_documento").
      // Queremos o valor; usamos `descricao` so como fallback ou quando `nome`
      // veio em formato raw (snake_case minusculo).
      const nome = typeof c?.nome === "string" ? c.nome.trim() : "";
      const descricao =
        typeof c?.descricao === "string" ? c.descricao.trim() : "";
      const pareceRaw = nome.length > 0 && /^[a-z][a-z0-9_]*$/.test(nome);
      const valor = pareceRaw ? descricao || nome : nome || descricao;
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
  const endpoint = endpointPorTribunal(tribunal);
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

    const trabalhista = ehProcessoTrabalhista(processo.numero);

    for (const mov of resultado.movimentos) {
      if (!mov.nome || !mov.dataHora) continue;
      const data = new Date(mov.dataHora);
      if (Number.isNaN(data.getTime())) continue;

      let criada: { id: string } | null = null;
      try {
        criada = await prisma.movimentacaoAutomatica.create({
          data: {
            processoId: processo.id,
            codigoMovimento: mov.codigo,
            nomeMovimento: mov.nome,
            dataMovimento: data,
            complementos: mov.complementos.length
              ? mov.complementos.join(" | ")
              : null,
            fonte: "DATAJUD",
          },
          select: { id: true },
        });
        novas++;
      } catch {
        // duplicada pela unique constraint (processoId, dataMovimento, nomeMovimento)
      }

      // Para movimentacoes novas em processos NAO trabalhistas, busca inteiro
      // teor no DJEN. Falhas/timeouts nao quebram o cron.
      // DJEN rate-limita em 20 req/min — espacamos 3s entre chamadas para
      // ficar abaixo do limite e evitar 429s em rajada.
      if (criada && !trabalhista) {
        try {
          const djen = await buscarPublicacaoNoDJEN(processo.numero, data);
          const update = montarUpdateDjen(djen);
          await prisma.movimentacaoAutomatica.update({
            where: { id: criada.id },
            data: update,
          });
        } catch (err) {
          console.warn(
            `[djen] erro ao salvar inteiro teor para mov ${criada.id}: ${errorMessage(err)}`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 3_000));

        // TODO(telegram): quando o bot enviar resumo de nova movimentacao, se
        // `update.conteudoIntegral` estiver disponivel, incluir um trecho do
        // texto integral na mensagem. A logica de envio vivera no fluxo do
        // telegram (lib/telegram.ts) e devera consultar a coluna
        // conteudoIntegral da MovimentacaoAutomatica recem-criada.
      }
    }

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
