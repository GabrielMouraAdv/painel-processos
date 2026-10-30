/**
 * Lista do ciclo semanal de conferencia dos processos TCE ativos no e-TCEPE
 * (rotina_atualizacao_processos_ativos_tce.md, data-base 30/10/2026).
 *
 * Ativo = qualquer uma das hipoteses:
 *   1. pendente de julgamento (nao julgado, sem transito, fora de arquivado/sobrestado);
 *   2. recurso pendente de julgamento (registro de recurso nao julgado);
 *   3. julgado (processo ou recurso) ha JANELA_DIAS dias ou menos;
 *   4. julgado sem transito certificado e sem dispensa de contrarrazoes lancada;
 *   5. cautelar sem decisao, ou decidida sem transito (referendo/recurso em aberto).
 * Ordem: cautelares primeiro, depois recursos pendentes, pendentes, julgados recentes e
 * prazo recursal; dentro do grupo, o andamento mais antigo primeiro (quem esta ha mais
 * tempo sem conferencia).
 *
 * Uso:
 *   npx tsx scripts/ciclo-processos-ativos.ts <saida.json> [--janela 90] [--so-cautelares] [--limite N]
 */
import { writeFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const saida = args[0];
const iJan = args.indexOf("--janela");
const JANELA_DIAS = iJan >= 0 ? Number(args[iJan + 1]) : 90;
const SO_CAUTELARES = args.includes("--so-cautelares");
const iLim = args.indexOf("--limite");
const LIMITE = iLim >= 0 ? Number(args[iLim + 1]) : null;

const FORA = ["arquivado", "sobrestado"];
const TRANSITADO = ["transitado", "transitado_cautelar"];
const ORDEM: Record<string, number> = { cautelar: 0, recurso_pendente: 1, pendente: 2, julgado_recente: 3, prazo_recursal: 4 };
const dia = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);

async function main() {
  if (!saida) throw new Error("Uso: ciclo-processos-ativos.ts <saida.json> [--janela 90] [--so-cautelares] [--limite N]");
  const corte = new Date(Date.now() - JANELA_DIAS * 86_400_000);
  const ps = await prisma.processoTce.findMany({
    where: { faseAtual: { notIn: FORA } },
    select: {
      id: true, numero: true, tipo: true, ehRecurso: true, julgado: true, dataJulgamento: true, dataTransito: true,
      faseAtual: true, contrarrazoesNtDispensadas: true, contrarrazoesMpcoDispensadas: true, relator: true, camara: true,
      municipio: { select: { nome: true } },
      processoOrigem: { select: { numero: true, dataTransito: true, faseAtual: true } },
      andamentos: { orderBy: { data: "desc" }, take: 1, select: { data: true, fase: true } },
    },
  });

  const lista = [];
  for (const p of ps) {
    // Recurso sem transito proprio, mas com o processo principal ja transitado: encerrado.
    const origemTransitou = !!p.processoOrigem && (!!p.processoOrigem.dataTransito || TRANSITADO.includes(p.processoOrigem.faseAtual));
    const transitado = !!p.dataTransito || TRANSITADO.includes(p.faseAtual) || (p.ehRecurso && p.julgado && origemTransitou);
    let grupo: string | null = null;
    let motivo = "";
    if (p.tipo === "MEDIDA_CAUTELAR" && !transitado) {
      grupo = "cautelar";
      motivo = p.julgado ? "cautelar decidida, sem trânsito (referendo/recurso)" : "cautelar sem decisão";
    } else if (!p.julgado && !transitado) {
      grupo = p.ehRecurso ? "recurso_pendente" : "pendente";
      motivo = p.ehRecurso ? "recurso pendente de julgamento" : "pendente de julgamento";
    } else if (p.julgado && p.dataJulgamento && p.dataJulgamento >= corte) {
      grupo = "julgado_recente";
      motivo = `julgado em ${dia(p.dataJulgamento)} (janela de ${JANELA_DIAS} dias)`;
    } else if (p.julgado && !transitado && !p.contrarrazoesNtDispensadas && !p.contrarrazoesMpcoDispensadas) {
      grupo = "prazo_recursal";
      motivo = "julgado sem trânsito e sem dispensa de contrarrazões";
    }
    if (!grupo) continue;
    if (SO_CAUTELARES && grupo !== "cautelar") continue;
    lista.push({
      numero: p.numero, grupo, motivo,
      // No e-TCEPE o recurso e conferido na aba Recursos do processo principal.
      conferirEm: p.processoOrigem?.numero ?? p.numero.replace(/[A-Z]{2,3}\d{3}$/, ""), tipo: p.tipo, orgao: p.municipio?.nome ?? null,
      relator: p.relator, camara: p.camara, faseAtual: p.faseAtual,
      ultimoAndamento: dia(p.andamentos[0]?.data), ultimaFase: p.andamentos[0]?.fase ?? null,
    });
  }
  lista.sort((a, b) =>
    ORDEM[a.grupo] - ORDEM[b.grupo] || (a.ultimoAndamento ?? "0000").localeCompare(b.ultimoAndamento ?? "0000"),
  );
  // Uma conferencia por processo principal, na ordem do registro mais urgente dele.
  const principais: { numero: string; grupos: string[]; registros: string[] }[] = [];
  const idx = new Map<string, number>();
  for (const x of lista) {
    const k = x.conferirEm;
    if (!idx.has(k)) { idx.set(k, principais.length); principais.push({ numero: k, grupos: [], registros: [] }); }
    const pr = principais[idx.get(k)!];
    if (!pr.grupos.includes(x.grupo)) pr.grupos.push(x.grupo);
    pr.registros.push(x.numero);
  }
  const conferir = LIMITE ? principais.slice(0, LIMITE) : principais;
  writeFileSync(saida, JSON.stringify({ geradoEm: new Date().toISOString(), janelaDias: JANELA_DIAS, totalRegistros: lista.length, totalPrincipais: principais.length, conferir, registros: lista }, null, 1), "utf-8");
  const cont: Record<string, number> = {};
  for (const x of lista) cont[x.grupo] = (cont[x.grupo] ?? 0) + 1;
  console.log(`${lista.length} registros ativos ${JSON.stringify(cont)} · ${principais.length} processos principais a conferir${LIMITE ? ` (lista limitada a ${conferir.length})` : ""} -> ${saida}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
