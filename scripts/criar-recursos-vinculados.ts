/**
 * Cria recursos que existem no e-TCEPE e faltam no painel, vinculados ao processo
 * de origem (mesmo tipo, municipio, relator, camara, exercicio e bancas do pai).
 * Regra aprovada pelo Gabriel em 15/10/2026 (cargas por municipio).
 *
 * Uso:
 *   npx tsx scripts/criar-recursos-vinculados.ts <numeros separados por virgula>                       (simulacao)
 *   npx tsx scripts/criar-recursos-vinculados.ts <numeros> --gravar <desfazer.json>
 *   npx tsx scripts/criar-recursos-vinculados.ts --desfazer <desfazer.json>
 */
import { PrismaClient, type TipoRecursoTce } from "@prisma/client";
import { readFileSync, writeFileSync } from "fs";

import { TCE_RECURSO_FASE_INICIAL } from "../lib/tce-config";

const prisma = new PrismaClient();
const GABRIEL_ID = "cmob0aygv0001khuojjubwb0i";

// Sufixos usados nas listas do TCE-PE.
const SUFIXO: Record<string, { tipo: TipoRecursoTce; nome: string }> = {
  RO: { tipo: "RECURSO_ORDINARIO", nome: "Recurso Ordinario" },
  ED: { tipo: "EMBARGOS_DECLARACAO", nome: "Embargos de Declaracao" },
  AG: { tipo: "AGRAVO", nome: "Agravo" },
  AR: { tipo: "AGRAVO_REGIMENTAL", nome: "Agravo Regimental" },
  PS: { tipo: "PEDIDO_SUSPENSAO_CAUTELAR", nome: "Pedido de Suspensao" },
  PR: { tipo: "PEDIDO_RESCISAO_RECURSO", nome: "Pedido de Rescisao" },
};

async function main() {
  const iDesfazer = process.argv.indexOf("--desfazer");
  if (iDesfazer > -1) {
    const d: { id: string; numero: string }[] = JSON.parse(readFileSync(process.argv[iDesfazer + 1], "utf-8"));
    for (const r of d) {
      await prisma.andamentoTce.deleteMany({ where: { processoId: r.id } });
      await prisma.processoTce.delete({ where: { id: r.id } });
    }
    console.log(`desfeito: ${d.length} recursos`);
    return;
  }

  const numeros = (process.argv[2] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const iGravar = process.argv.indexOf("--gravar");
  const gravar = iGravar > -1;
  const criados: { id: string; numero: string }[] = [];

  for (const numero of numeros) {
    const m = /^(.+?)(RO|ED|AG|AR|PS|PR)(\d{3})$/.exec(numero);
    if (!m) { console.log(`ERRO ${numero}: sufixo de recurso nao reconhecido`); continue; }
    const [, numPai, suf] = m;
    if (await prisma.processoTce.findFirst({ where: { numero }, select: { id: true } })) { console.log(`PULADO ${numero}: ja existe`); continue; }
    const pai = await prisma.processoTce.findFirst({
      where: { numero: numPai },
      select: { id: true, tipo: true, municipioId: true, relator: true, camara: true, exercicio: true, bancasSlug: true, escritorioId: true, municipio: { select: { nome: true } } },
    });
    if (!pai) { console.log(`ERRO ${numero}: processo de origem ${numPai} nao existe no painel`); continue; }
    const rec = SUFIXO[suf];
    console.log(`CRIAR ${numero} (${rec.nome}) vinculado a ${numPai} | ${pai.municipio?.nome ?? "-"} | ${pai.tipo} | relator ${pai.relator ?? "-"}`);
    if (!gravar) continue;
    const c = await prisma.processoTce.create({
      data: {
        numero, tipo: pai.tipo, municipioId: pai.municipioId, relator: pai.relator, camara: pai.camara,
        exercicio: pai.exercicio, bancasSlug: pai.bancasSlug, escritorioId: pai.escritorioId,
        faseAtual: TCE_RECURSO_FASE_INICIAL[rec.tipo],
        objeto: `Recurso - ${rec.nome}. Existente no e-TCEPE e ausente no painel; criado na carga por municipio.`,
        ehRecurso: true, tipoRecurso: rec.tipo, processoOrigemId: pai.id,
      },
      select: { id: true },
    });
    criados.push({ id: c.id, numero });
  }

  if (!gravar) { console.log("SIMULACAO: nada foi gravado."); return; }
  const arq = process.argv[iGravar + 1];
  if (!arq) throw new Error("Informe o arquivo de desfazer depois de --gravar");
  writeFileSync(arq, JSON.stringify(criados, null, 1), "utf-8");
  await prisma.logAuditoria.create({
    data: {
      userId: GABRIEL_ID, acao: "CRIAR_RECURSOS_VINCULADOS", entidade: "ProcessoTce",
      descricao: `Criados ${criados.length} recursos vinculados (existentes no e-TCEPE e ausentes no painel).`,
      detalhes: JSON.stringify(criados.map((c) => c.numero)),
    },
  });
  console.log(`GRAVADO. Desfazer: ${arq}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
