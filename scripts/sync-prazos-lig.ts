/**
 * Sincroniza a planilha "Controle de Prazos TCE-Improbidade" (triagem LIG) com o banco
 * (PrazoLig, PublicacaoLig, ConferenciaLig, CienciaLig) e registra a execucao em SyncPrazosLig.
 *
 * A planilha e a fonte da verdade. Duas entradas possiveis:
 *   --google   le as 4 abas direto da API do Google Sheets com a conta de servico (sem copia
 *              intermediaria). A chave fica fora do repositorio; o .env do repo aponta para ela:
 *                GOOGLE_SA_KEY_FILE=C:\Users\gabri\.secrets\painel-sheets.json
 *              A planilha precisa estar compartilhada (leitor) com o e-mail da conta de servico.
 *   <arquivo>  JSON com a 1a linha de cada aba como cabecalho (teste ou leitura manual):
 *                { "prazos": [[...cabecalho], [...linha], ...], "publicacoes": [...], "conf": [...], "ciencia": [...] }
 *              Cada aba tambem pode vir como a resposta crua do get_values: { "values": [[...], ...] }.
 *
 * Regras:
 *   - Cabecalho diferente do esperado (aceita so complemento entre parenteses no fim, ex.:
 *     "No escopo (TCE/improbidade)"), aba ausente, Prazos ou Conferencia sem linhas, ou chave
 *     repetida: aborta sem gravar nada (com --gravar, registra o erro no log).
 *   - Upsert pela chave (ID; Pub ID; ID da mensagem; Nº do processo + Data de publicacao).
 *     So reescreve a linha que mudou; rodar de novo com o mesmo JSON nao duplica nada.
 *   - Linha que sumiu da planilha fica com ativoNaPlanilha=false (nao e apagada).
 *   - Tudo numa transacao so.
 *   - Datas d/m/aaaa ou dd/mm/aaaa viram data (meio-dia UTC); o texto original fica guardado
 *     ("—", "semana" etc. ficam so no texto).
 *   - Sem --gravar so simula (le o banco e mostra o que mudaria).
 *
 * Uso (na pasta do repo):
 *   npx tsx scripts/sync-prazos-lig.ts --google                  (simula)
 *   npx tsx scripts/sync-prazos-lig.ts --google --gravar
 *   npx tsx scripts/sync-prazos-lig.ts --google --salvar <copia.json>   (guarda o que foi lido)
 *   npx tsx scripts/sync-prazos-lig.ts <planilha.json> [--gravar]
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";

try {
  process.loadEnvFile(".env");
} catch {
  // sem .env: variaveis ja no ambiente
}

const prisma = new PrismaClient();

const PLANILHA_ID = "1gmngWNbTmbaBSsfCroWuWPcH2ThQvNLpqaiucSDbLzY";
const FAIXAS = {
  prazos: "Prazos!A1:V1000",
  publicacoes: "'Publicações'!A1:H1000",
  conf: "'Conferência LIG'!A1:K3000",
  ciencia: "'Sem prazo (ciência)'!A1:I1000",
} as const;

// ---------------------------------------------------------------------------
// Cabecalhos esperados (ordem das colunas da planilha)
// ---------------------------------------------------------------------------

const CAB_PRAZOS = [
  "ID", "Status", "Lançado no Legal One?", "Prazo interno", "Prazo fatal", "Peça / providência",
  "Prazo (dias) e contagem", "Fundamento", "Nº do processo", "Órgão / tribunal", "Cliente / ente",
  "Parte interessada", "Ato publicado (resumo)", "Diário e edição", "Data de publicação (LIG)",
  "1º dia do prazo", "Origem LIG (A advogados / B prefeituras)", "Nome pesquisado",
  "Observações / alertas", "Link do e-mail", "Publicação",
];
// Coluna V (opcional): a planilha chama de "Texto da publicação (clique na célula para ler tudo)".
const CAB_PRAZOS_OPCIONAL = ["Texto da publicação"];

const CAB_PUBLICACOES = [
  "Pub ID", "Nº do processo", "Diário e edição", "Data de publicação (LIG)", "Origem LIG",
  "Prazos ligados", "Texto da publicação", "Inteiro teor (PJe)",
];

const CAB_CONF = [
  "Data do diário", "Diário", "Assinatura", "ID da mensagem", "Total informado pela LIG",
  // "No escopo": a planilha usa "No escopo (TCE/improbidade)"
  "Publicações extraídas", "Bate?", "Excluídas (aposentadoria/pensão/reforma)", "No escopo",
  "Prazos gerados", "Conferido em",
];

const CAB_CIENCIA = [
  "Data de publicação (LIG)", "Nº do processo", "Órgão / tribunal", "Cliente / ente",
  "Ato publicado (resumo)", "Por que não gera prazo", "Origem LIG", "Nome pesquisado", "Link do e-mail",
];

// ---------------------------------------------------------------------------
// Leitura do JSON
// ---------------------------------------------------------------------------

class ErroValidacao extends Error {}

type Linha = Record<string, string>;
type Aba = { linhas: { n: number; r: Linha }[]; cabecalho: string[] };

const limpa = (v: unknown) => (v == null ? "" : String(v)).trim();

function lerAba(bruto: unknown, nome: string, esperado: string[], opcional: string[] = []): Aba {
  const valores = Array.isArray(bruto)
    ? bruto
    : bruto && typeof bruto === "object" && Array.isArray((bruto as { values?: unknown }).values)
      ? (bruto as { values: unknown[] }).values
      : null;
  if (!valores || valores.length === 0 || !Array.isArray(valores[0])) {
    throw new ErroValidacao(`aba "${nome}" ausente ou vazia (sem cabeçalho)`);
  }
  const cab = (valores[0] as unknown[]).map(limpa);
  while (cab.length && cab[cab.length - 1] === "") cab.pop();

  // Igual ao esperado, ou o esperado seguido de complemento entre parenteses:
  // "No escopo (TCE/improbidade)", "Texto da publicação (clique na célula para ler tudo)".
  const bate = (real: string | undefined, c: string) => real === c || (real ?? "").startsWith(c + " (");
  const okBase = esperado.every((c, i) => bate(cab[i], c));
  const extra = cab.slice(esperado.length);
  const okExtra = extra.length <= opcional.length && extra.every((c, i) => bate(c, opcional[i]));
  if (okBase && okExtra) [...esperado, ...opcional].forEach((c, i) => i < cab.length && (cab[i] = c));
  if (!okBase || !okExtra) {
    const dif = esperado
      .map((c, i) => (bate(cab[i], c) ? null : `col ${i + 1}: esperado "${c}", veio "${cab[i] ?? ""}"`))
      .filter(Boolean);
    if (!okExtra) dif.push(`colunas a mais: ${extra.map((c) => `"${c}"`).join(", ")}`);
    throw new ErroValidacao(`cabeçalho diferente na aba "${nome}": ${dif.join("; ")}`);
  }

  const linhas = (valores.slice(1) as unknown[])
    .map((r, i) => ({ n: i + 2, r: Array.isArray(r) ? r : [] }))
    .filter(({ r }) => r.some((c) => limpa(c) !== ""))
    .map(({ n, r }) => ({ n, r: Object.fromEntries(cab.map((c, i) => [c, limpa(r[i])])) as Linha }));
  return { linhas, cabecalho: cab };
}

// Leitura direta da API do Google Sheets com a conta de servico (JWT assinado aqui mesmo,
// sem biblioteca do Google). So escopo de leitura.
async function lerGoogle(): Promise<Record<string, unknown>> {
  const arq = process.env.GOOGLE_SA_KEY_FILE;
  if (!arq) throw new ErroValidacao("GOOGLE_SA_KEY_FILE não definido no .env (caminho da chave da conta de serviço)");
  let chave: { client_email?: string; private_key?: string };
  try {
    chave = JSON.parse(fs.readFileSync(arq, "utf8"));
  } catch (e) {
    throw new ErroValidacao(`não consegui ler a chave da conta de serviço em GOOGLE_SA_KEY_FILE: ${(e as Error).message}`);
  }
  if (!chave.client_email || !chave.private_key) throw new ErroValidacao("a chave da conta de serviço não tem client_email/private_key");

  const b64 = (o: object) => (Buffer.isBuffer(o) ? o : Buffer.from(JSON.stringify(o))).toString("base64url");
  const agora = Math.floor(Date.now() / 1000);
  const corpo = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: chave.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: agora,
    exp: agora + 600,
  })}`;
  const assinatura = crypto.createSign("RSA-SHA256").update(corpo).sign(chave.private_key);
  const tok = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${corpo}.${b64(assinatura)}` }),
  });
  const tokJson = (await tok.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!tokJson.access_token) throw new Error(`Google recusou a conta de serviço: ${tokJson.error ?? tok.status} ${tokJson.error_description ?? ""}`.trim());

  const nomes = Object.keys(FAIXAS) as (keyof typeof FAIXAS)[];
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${PLANILHA_ID}/values:batchGet`);
  for (const n of nomes) url.searchParams.append("ranges", FAIXAS[n]);
  url.searchParams.set("valueRenderOption", "FORMATTED_VALUE");
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${tokJson.access_token}` } });
  const json = (await resp.json()) as { valueRanges?: { values?: unknown[][] }[]; error?: { message?: string } };
  if (!resp.ok || !json.valueRanges) {
    const dica = resp.status === 403 ? " (a planilha foi compartilhada com o e-mail da conta de serviço?)" : "";
    throw new Error(`erro ao ler a planilha: ${resp.status} ${json.error?.message ?? ""}${dica}`);
  }
  return Object.fromEntries(nomes.map((n, i) => [n, json.valueRanges![i]?.values ?? []]));
}

// "3/11/2026" ou "03/11/2026" -> 2026-11-03T12:00Z; qualquer outra coisa -> null.
function data(s: string): Date | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], 12));
  return d.getUTCDate() === +m[1] && d.getUTCMonth() === +m[2] - 1 ? d : null;
}

function exigirChavesUnicas(nome: string, chaves: { chave: string; n: number }[]) {
  const vistos = new Map<string, number>();
  const rep: string[] = [];
  for (const { chave, n } of chaves) {
    if (vistos.has(chave)) rep.push(`"${chave}" (linhas ${vistos.get(chave)} e ${n})`);
    else vistos.set(chave, n);
  }
  if (rep.length) throw new ErroValidacao(`chave repetida na aba "${nome}": ${rep.join(", ")}`);
}

// ---------------------------------------------------------------------------
// Conversao linha da planilha -> registro do banco
// ---------------------------------------------------------------------------

function prazoDe(r: Linha, n: number) {
  return {
    idPlanilha: r["ID"],
    status: r["Status"],
    lancadoLegalOne: r["Lançado no Legal One?"],
    prazoInternoTexto: r["Prazo interno"],
    prazoInterno: data(r["Prazo interno"]),
    prazoFatalTexto: r["Prazo fatal"],
    prazoFatal: data(r["Prazo fatal"]),
    peca: r["Peça / providência"],
    prazoContagem: r["Prazo (dias) e contagem"],
    fundamento: r["Fundamento"],
    numeroProcesso: r["Nº do processo"],
    orgao: r["Órgão / tribunal"],
    cliente: r["Cliente / ente"],
    parteInteressada: r["Parte interessada"],
    atoPublicado: r["Ato publicado (resumo)"],
    diarioEdicao: r["Diário e edição"],
    dataPublicacaoTexto: r["Data de publicação (LIG)"],
    dataPublicacao: data(r["Data de publicação (LIG)"]),
    primeiroDiaTexto: r["1º dia do prazo"],
    primeiroDia: data(r["1º dia do prazo"]),
    origemLig: r["Origem LIG (A advogados / B prefeituras)"],
    nomePesquisado: r["Nome pesquisado"],
    observacoes: r["Observações / alertas"],
    linkEmail: r["Link do e-mail"],
    pubId: r["Publicação"],
    textoPublicacao: r["Texto da publicação"] ?? "",
    linhaPlanilha: n,
  };
}

function publicacaoDe(r: Linha, n: number) {
  return {
    pubId: r["Pub ID"],
    numeroProcesso: r["Nº do processo"],
    diarioEdicao: r["Diário e edição"],
    dataPublicacaoTexto: r["Data de publicação (LIG)"],
    dataPublicacao: data(r["Data de publicação (LIG)"]),
    origemLig: r["Origem LIG"],
    prazosLigados: r["Prazos ligados"],
    texto: r["Texto da publicação"],
    inteiroTeorUrl: r["Inteiro teor (PJe)"],
    linhaPlanilha: n,
  };
}

function conferenciaDe(r: Linha, n: number) {
  return {
    idMensagem: r["ID da mensagem"],
    dataDiarioTexto: r["Data do diário"],
    dataDiario: data(r["Data do diário"]),
    diario: r["Diário"],
    assinatura: r["Assinatura"],
    totalInformado: r["Total informado pela LIG"],
    publicacoesExtraidas: r["Publicações extraídas"],
    bate: r["Bate?"],
    excluidas: r["Excluídas (aposentadoria/pensão/reforma)"],
    noEscopo: r["No escopo"],
    prazosGerados: r["Prazos gerados"],
    conferidoEm: r["Conferido em"],
    linhaPlanilha: n,
  };
}

function cienciaDe(r: Linha, n: number) {
  return {
    numeroProcesso: r["Nº do processo"],
    dataPublicacaoTexto: r["Data de publicação (LIG)"],
    dataPublicacao: data(r["Data de publicação (LIG)"]),
    orgao: r["Órgão / tribunal"],
    cliente: r["Cliente / ente"],
    atoPublicado: r["Ato publicado (resumo)"],
    motivo: r["Por que não gera prazo"],
    origemLig: r["Origem LIG"],
    nomePesquisado: r["Nome pesquisado"],
    linkEmail: r["Link do e-mail"],
    linhaPlanilha: n,
  };
}

// ---------------------------------------------------------------------------
// Diferenca planilha x banco
// ---------------------------------------------------------------------------

type Registro = Record<string, unknown>;

const igual = (a: unknown, b: unknown) =>
  a instanceof Date || b instanceof Date
    ? (a as Date | null)?.getTime?.() === (b as Date | null)?.getTime?.()
    : a === b;

function mudou(novo: Registro, atual: Registro) {
  return !atual.ativoNaPlanilha || Object.keys(novo).some((k) => !igual(novo[k], atual[k]));
}

type Plano<T extends Registro> = {
  lidas: number;
  novos: T[];
  alterados: T[];
  inalterados: T[];
  inativar: Registro[];
  reativados: number;
};

function planejar<T extends Registro>(
  planilha: T[],
  banco: Registro[],
  chave: (r: Registro) => string,
): Plano<T> {
  const porChave = new Map(banco.map((b) => [chave(b), b]));
  const naPlanilha = new Set(planilha.map(chave));
  const p: Plano<T> = { lidas: planilha.length, novos: [], alterados: [], inalterados: [], inativar: [], reativados: 0 };
  for (const r of planilha) {
    const atual = porChave.get(chave(r));
    if (!atual) p.novos.push(r);
    else if (mudou(r, atual)) {
      p.alterados.push(r);
      if (!atual.ativoNaPlanilha) p.reativados++;
    } else p.inalterados.push(r);
  }
  p.inativar = banco.filter((b) => b.ativoNaPlanilha && !naPlanilha.has(chave(b)));
  return p;
}

const kPrazo = (r: Registro) => String(r.idPlanilha);
const kPub = (r: Registro) => String(r.pubId);
const kConf = (r: Registro) => String(r.idMensagem);
const kCiencia = (r: Registro) => `${r.numeroProcesso}|${r.dataPublicacaoTexto}`;

function resumo(nome: string, p: Plano<Registro>) {
  return `${nome.padEnd(12)} lidas ${String(p.lidas).padStart(4)} | novas ${p.novos.length} | alteradas ${p.alterados.length} (reativadas ${p.reativados}) | iguais ${p.inalterados.length} | saíram da planilha ${p.inativar.length}`;
}

// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const google = args.includes("--google");
  const iSalvar = args.indexOf("--salvar");
  const salvar = iSalvar >= 0 ? args[iSalvar + 1] : undefined;
  const arquivo = args.find((a, i) => !a.startsWith("--") && (iSalvar < 0 || i !== iSalvar + 1));
  const gravar = args.includes("--gravar");
  if (!google && !arquivo) {
    console.error("Uso: npx tsx scripts/sync-prazos-lig.ts --google [--gravar] [--salvar copia.json]");
    console.error("     npx tsx scripts/sync-prazos-lig.ts <planilha.json> [--gravar]");
    process.exit(2);
  }

  const iniciadoEm = new Date();
  const log = gravar
    ? await prisma.syncPrazosLig.create({
        data: { iniciadoEm, arquivo: google ? `google:${PLANILHA_ID}` : path.basename(arquivo!) },
      })
    : null;

  try {
    let json: Record<string, unknown>;
    if (google) {
      json = await lerGoogle();
      if (salvar) fs.writeFileSync(salvar, JSON.stringify(json));
    } else {
      try {
        json = JSON.parse(fs.readFileSync(arquivo!, "utf8"));
      } catch (e) {
        throw new ErroValidacao(`não consegui ler o JSON: ${(e as Error).message}`);
      }
    }

    const abaPrazos = lerAba(json.prazos, "Prazos", CAB_PRAZOS, CAB_PRAZOS_OPCIONAL);
    const abaPubs = lerAba(json.publicacoes, "Publicações", CAB_PUBLICACOES);
    const abaConf = lerAba(json.conf, "Conferência LIG", CAB_CONF);
    const abaCiencia = lerAba(json.ciencia, "Sem prazo (ciência)", CAB_CIENCIA);

    if (abaPrazos.linhas.length === 0) throw new ErroValidacao(`aba "Prazos" sem nenhuma linha`);
    if (abaConf.linhas.length === 0) throw new ErroValidacao(`aba "Conferência LIG" sem nenhuma linha`);

    const semChave: string[] = [];
    const comChave = (aba: Aba, nome: string, campos: string[]) =>
      aba.linhas.filter(({ n, r }) => {
        const ok = campos.every((c) => r[c] !== "");
        if (!ok) semChave.push(`${nome} linha ${n}`);
        return ok;
      });
    const lPrazos = comChave(abaPrazos, "Prazos", ["ID"]);
    const lPubs = comChave(abaPubs, "Publicações", ["Pub ID"]);
    const lConf = comChave(abaConf, "Conferência LIG", ["ID da mensagem"]);
    const lCiencia = comChave(abaCiencia, "Sem prazo (ciência)", ["Nº do processo", "Data de publicação (LIG)"]);

    const prazos = lPrazos.map(({ n, r }) => prazoDe(r, n));
    const pubs = lPubs.map(({ n, r }) => publicacaoDe(r, n));
    const confs = lConf.map(({ n, r }) => conferenciaDe(r, n));
    const ciencias = lCiencia.map(({ n, r }) => cienciaDe(r, n));

    exigirChavesUnicas("Prazos", prazos.map((r) => ({ chave: kPrazo(r), n: r.linhaPlanilha })));
    exigirChavesUnicas("Publicações", pubs.map((r) => ({ chave: kPub(r), n: r.linhaPlanilha })));
    exigirChavesUnicas("Conferência LIG", confs.map((r) => ({ chave: kConf(r), n: r.linhaPlanilha })));
    exigirChavesUnicas("Sem prazo (ciência)", ciencias.map((r) => ({ chave: kCiencia(r), n: r.linhaPlanilha })));

    const pubIds = new Set(pubs.map((p) => p.pubId));
    const semPublicacao = prazos.filter((p) => p.pubId && !pubIds.has(p.pubId)).map((p) => `${p.idPlanilha}→${p.pubId}`);
    const datasInvalidas = prazos
      .filter((p) => (p.prazoFatalTexto && !p.prazoFatal) || (p.prazoInternoTexto && !p.prazoInterno))
      .map((p) => `${p.idPlanilha} (interno "${p.prazoInternoTexto}", fatal "${p.prazoFatalTexto}")`);

    const [bPrazos, bPubs, bConf, bCiencia] = await Promise.all([
      prisma.prazoLig.findMany(),
      prisma.publicacaoLig.findMany(),
      prisma.conferenciaLig.findMany(),
      prisma.cienciaLig.findMany(),
    ]);
    const semMeta = (rows: Registro[]) =>
      rows.map(({ createdAt: _c, updatedAt: _u, sincronizadoEm: _s, ...r }) => r);

    const pPrazos = planejar(prazos, semMeta(bPrazos), kPrazo);
    const pPubs = planejar(pubs, semMeta(bPubs), kPub);
    const pConf = planejar(confs, semMeta(bConf), kConf);
    const pCiencia = planejar(ciencias, semMeta(bCiencia), kCiencia);

    console.log(gravar ? "GRAVANDO" : "SIMULAÇÃO (nada foi gravado; use --gravar)");
    console.log(resumo("Prazos", pPrazos));
    console.log(resumo("Publicações", pPubs));
    console.log(resumo("Conferência", pConf));
    console.log(resumo("Ciência", pCiencia));
    if (semChave.length) console.log(`Linhas sem chave (ignoradas): ${semChave.join(", ")}`);
    if (semPublicacao.length) console.log(`Prazos com Publicação inexistente na aba Publicações: ${semPublicacao.join(", ")}`);
    if (datasInvalidas.length) console.log(`Prazos com data que não é d/m/aaaa: ${datasInvalidas.join(", ")}`);

    const inativados =
      pPrazos.inativar.length + pPubs.inativar.length + pConf.inativar.length + pCiencia.inativar.length;

    if (!gravar) return;

    const agora = new Date();
    await prisma.$transaction(
      async (tx) => {
        const ativo = { ativoNaPlanilha: true, sincronizadoEm: agora };

        // novos
        if (pPrazos.novos.length) await tx.prazoLig.createMany({ data: pPrazos.novos.map((r) => ({ ...r, ...ativo })) });
        if (pPubs.novos.length) await tx.publicacaoLig.createMany({ data: pPubs.novos.map((r) => ({ ...r, ...ativo })) });
        if (pConf.novos.length) await tx.conferenciaLig.createMany({ data: pConf.novos.map((r) => ({ ...r, ...ativo })) });
        if (pCiencia.novos.length) await tx.cienciaLig.createMany({ data: pCiencia.novos.map((r) => ({ ...r, ...ativo })) });

        // alterados (inclui os que voltaram para a planilha)
        for (const r of pPrazos.alterados) await tx.prazoLig.update({ where: { idPlanilha: r.idPlanilha }, data: { ...r, ...ativo } });
        for (const r of pPubs.alterados) await tx.publicacaoLig.update({ where: { pubId: r.pubId }, data: { ...r, ...ativo } });
        for (const r of pConf.alterados) await tx.conferenciaLig.update({ where: { idMensagem: r.idMensagem }, data: { ...r, ...ativo } });
        for (const r of pCiencia.alterados)
          await tx.cienciaLig.update({
            where: { numeroProcesso_dataPublicacaoTexto: { numeroProcesso: r.numeroProcesso, dataPublicacaoTexto: r.dataPublicacaoTexto } },
            data: { ...r, ...ativo },
          });

        // iguais: so marca que foram vistos nesta sincronizacao
        if (pPrazos.inalterados.length)
          await tx.prazoLig.updateMany({ where: { idPlanilha: { in: pPrazos.inalterados.map((r) => r.idPlanilha) } }, data: { sincronizadoEm: agora } });
        if (pPubs.inalterados.length)
          await tx.publicacaoLig.updateMany({ where: { pubId: { in: pPubs.inalterados.map((r) => r.pubId) } }, data: { sincronizadoEm: agora } });
        if (pConf.inalterados.length)
          await tx.conferenciaLig.updateMany({ where: { idMensagem: { in: pConf.inalterados.map((r) => r.idMensagem) } }, data: { sincronizadoEm: agora } });
        if (pCiencia.inalterados.length)
          await tx.cienciaLig.updateMany({
            where: { OR: pCiencia.inalterados.map((r) => ({ numeroProcesso: r.numeroProcesso, dataPublicacaoTexto: r.dataPublicacaoTexto })) },
            data: { sincronizadoEm: agora },
          });

        // sairam da planilha
        if (pPrazos.inativar.length)
          await tx.prazoLig.updateMany({ where: { idPlanilha: { in: pPrazos.inativar.map(kPrazo) } }, data: { ativoNaPlanilha: false } });
        if (pPubs.inativar.length)
          await tx.publicacaoLig.updateMany({ where: { pubId: { in: pPubs.inativar.map(kPub) } }, data: { ativoNaPlanilha: false } });
        if (pConf.inativar.length)
          await tx.conferenciaLig.updateMany({ where: { idMensagem: { in: pConf.inativar.map(kConf) } }, data: { ativoNaPlanilha: false } });
        if (pCiencia.inativar.length)
          await tx.cienciaLig.updateMany({
            where: { OR: pCiencia.inativar.map((r) => ({ numeroProcesso: String(r.numeroProcesso), dataPublicacaoTexto: String(r.dataPublicacaoTexto) })) },
            data: { ativoNaPlanilha: false },
          });

        // conferencia: o que ficou ativo no banco tem que bater com o que foi lido
        const [cPrazos, cPubs, cConf, cCiencia] = await Promise.all([
          tx.prazoLig.count({ where: { ativoNaPlanilha: true } }),
          tx.publicacaoLig.count({ where: { ativoNaPlanilha: true } }),
          tx.conferenciaLig.count({ where: { ativoNaPlanilha: true } }),
          tx.cienciaLig.count({ where: { ativoNaPlanilha: true } }),
        ]);
        const esperado = [prazos.length, pubs.length, confs.length, ciencias.length];
        const obtido = [cPrazos, cPubs, cConf, cCiencia];
        if (esperado.some((v, i) => v !== obtido[i])) {
          throw new Error(`contagem não bate (lidas ${esperado.join("/")} × ativas no banco ${obtido.join("/")}); nada foi gravado`);
        }

        await tx.syncPrazosLig.update({
          where: { id: log!.id },
          data: {
            ok: true,
            concluidoEm: new Date(),
            linhasPrazos: prazos.length,
            linhasPublicacoes: pubs.length,
            linhasConferencia: confs.length,
            linhasCiencia: ciencias.length,
            inativados,
          },
        });
      },
      { timeout: 120_000, maxWait: 20_000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    console.log(
      `OK: ativas no banco = lidas (${prazos.length} prazos, ${pubs.length} publicações, ${confs.length} conferência, ${ciencias.length} ciência); ${inativados} saíram da planilha.`,
    );
  } catch (e) {
    const msg = (e as Error).message;
    console.error(`ABORTADO: ${msg}`);
    if (log) {
      await prisma.syncPrazosLig.update({ where: { id: log.id }, data: { ok: false, erro: msg, concluidoEm: new Date() } });
    }
    process.exitCode = 1;
  }
}

main().finally(() => prisma.$disconnect());
