/**
 * Ajustes aprovados pelo Gabriel em 15/10/2026, antes da carga dos 5 municipios:
 *  1) cria 4 recursos que existem no e-TCEPE e faltavam no painel, vinculados ao pai;
 *  2) corrige o tipo do 24100407-0 (e recursos) de Auditoria Especial para Auto de Infracao.
 *
 * Uso:
 *   npx tsx scripts/ajustes-carga-5-municipios.ts                        (simulacao)
 *   npx tsx scripts/ajustes-carga-5-municipios.ts --gravar <desfazer.json>
 *   npx tsx scripts/ajustes-carga-5-municipios.ts --desfazer <desfazer.json>
 */
import { PrismaClient, type TipoProcessoTce, type TipoRecursoTce } from "@prisma/client";
import { readFileSync, writeFileSync } from "fs";

import { TCE_RECURSO_FASE_INICIAL } from "../lib/tce-config";

const prisma = new PrismaClient();
const GABRIEL_ID = "cmob0aygv0001khuojjubwb0i";

const RECURSOS_NOVOS = ["21100061-9RO001", "24100106-7ED001", "24100667-3RO001", "23100768-1ED001"];
const TIPO_CORRIGIR = { numeros: ["24100407-0", "24100407-0RO001", "24100407-0ED001"], de: "AUDITORIA_ESPECIAL", para: "AUTO_INFRACAO" } as const;

const SUFIXO: Record<string, { tipo: TipoRecursoTce; nome: string }> = {
  RO: { tipo: "RECURSO_ORDINARIO", nome: "Recurso Ordinario" },
  ED: { tipo: "EMBARGOS_DECLARACAO", nome: "Embargos de Declaracao" },
};

type Desfazer = { recursosCriados: { id: string; numero: string }[]; tiposAlterados: { id: string; numero: string; tipoAntes: string }[] };

async function main() {
  const iDesfazer = process.argv.indexOf("--desfazer");
  if (iDesfazer > -1) {
    const d: Desfazer = JSON.parse(readFileSync(process.argv[iDesfazer + 1], "utf-8"));
    for (const t of d.tiposAlterados) await prisma.processoTce.update({ where: { id: t.id }, data: { tipo: t.tipoAntes as TipoProcessoTce } });
    for (const r of d.recursosCriados) {
      await prisma.andamentoTce.deleteMany({ where: { processoId: r.id } });
      await prisma.processoTce.delete({ where: { id: r.id } });
    }
    console.log(`desfeito: ${d.tiposAlterados.length} tipos, ${d.recursosCriados.length} recursos`);
    return;
  }

  const iGravar = process.argv.indexOf("--gravar");
  const gravar = iGravar > -1;
  const desfazer: Desfazer = { recursosCriados: [], tiposAlterados: [] };

  for (const numero of RECURSOS_NOVOS) {
    const m = /^(.+?)(RO|ED)(\d{3})$/.exec(numero)!;
    const [, numPai, suf] = m;
    if (await prisma.processoTce.findFirst({ where: { numero }, select: { id: true } })) { console.log(`PULADO ${numero}: ja existe`); continue; }
    const pai = await prisma.processoTce.findFirst({
      where: { numero: numPai },
      select: { id: true, tipo: true, municipioId: true, relator: true, camara: true, exercicio: true, bancasSlug: true, escritorioId: true },
    });
    if (!pai) { console.log(`ERRO ${numero}: processo de origem ${numPai} nao existe`); continue; }
    const rec = SUFIXO[suf];
    console.log(`CRIAR ${numero} (${rec.nome}) vinculado a ${numPai} | tipo ${pai.tipo} | relator ${pai.relator ?? "-"} | ${pai.camara}`);
    if (!gravar) continue;
    const c = await prisma.processoTce.create({
      data: {
        numero, tipo: pai.tipo, municipioId: pai.municipioId, relator: pai.relator, camara: pai.camara,
        exercicio: pai.exercicio, bancasSlug: pai.bancasSlug, escritorioId: pai.escritorioId,
        faseAtual: TCE_RECURSO_FASE_INICIAL[rec.tipo],
        objeto: `Recurso - ${rec.nome}. Existente no e-TCEPE e ausente no painel; criado na carga de 15/10/2026.`,
        ehRecurso: true, tipoRecurso: rec.tipo, processoOrigemId: pai.id,
      },
      select: { id: true },
    });
    desfazer.recursosCriados.push({ id: c.id, numero });
  }

  for (const numero of TIPO_CORRIGIR.numeros) {
    const p = await prisma.processoTce.findFirst({ where: { numero }, select: { id: true, tipo: true } });
    if (!p) { console.log(`ERRO ${numero}: nao existe`); continue; }
    if (p.tipo !== TIPO_CORRIGIR.de) { console.log(`PULADO ${numero}: tipo atual ${p.tipo}`); continue; }
    console.log(`TIPO ${numero}: ${p.tipo} -> ${TIPO_CORRIGIR.para}`);
    if (!gravar) continue;
    await prisma.processoTce.update({ where: { id: p.id }, data: { tipo: TIPO_CORRIGIR.para } });
    desfazer.tiposAlterados.push({ id: p.id, numero, tipoAntes: p.tipo });
  }

  if (!gravar) { console.log("SIMULACAO: nada foi gravado."); return; }
  const arq = process.argv[iGravar + 1];
  if (!arq) throw new Error("Informe o arquivo de desfazer depois de --gravar");
  writeFileSync(arq, JSON.stringify(desfazer, null, 1), "utf-8");
  await prisma.logAuditoria.create({
    data: {
      userId: GABRIEL_ID, acao: "AJUSTES_CARGA_TCE", entidade: "ProcessoTce",
      descricao: `Ajustes da carga dos 5 municipios: ${desfazer.recursosCriados.length} recursos criados e ${desfazer.tiposAlterados.length} tipos corrigidos para Auto de Infracao.`,
      detalhes: JSON.stringify(desfazer),
    },
  });
  console.log(`GRAVADO. Desfazer: ${arq}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
