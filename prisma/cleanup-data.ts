/**
 * Limpa apenas DADOS VINCULADOS A PROCESSOS.
 *
 * NAO apaga: User, Escritorio.
 * Apaga: tudo relacionado a processos judiciais e do TCE, incluindo
 * gestores, municipios, sessoes de pauta, monitoramento e publicacoes.
 *
 * Uso: tsx prisma/cleanup-data.ts
 *
 * IMPORTANTE: rode `tsx prisma/backup.ts` ANTES.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function deleteAndCount<T>(
  name: string,
  fn: () => Promise<{ count: number }>,
): Promise<{ name: string; count: number }> {
  const r = await fn();
  console.log(`  ${name.padEnd(28)} ${r.count}`);
  return { name, count: r.count };
}

async function main() {
  console.log("\n=== LIMPEZA DE DADOS DE PROCESSOS ===\n");
  const usersAntes = await prisma.user.count();
  console.log(`Usuarios atuais (preservados): ${usersAntes}\n`);

  const counts: { name: string; count: number }[] = [];

  // 1) Itens de pauta (FK para Processo/ProcessoTce sem cascade)
  counts.push(
    await deleteAndCount("ItemPautaJudicial", () =>
      prisma.itemPautaJudicial.deleteMany({}),
    ),
  );
  counts.push(
    await deleteAndCount("ItemPauta", () => prisma.itemPauta.deleteMany({})),
  );

  // 2) Sessoes de pauta
  counts.push(
    await deleteAndCount("SessaoJudicial", () =>
      prisma.sessaoJudicial.deleteMany({}),
    ),
  );
  counts.push(
    await deleteAndCount("SessaoPauta", () =>
      prisma.sessaoPauta.deleteMany({}),
    ),
  );

  // 3) Monitoramento e publicacoes (FK para Processo, mas com cascade — deletamos antes por garantia)
  counts.push(
    await deleteAndCount("MovimentacaoAutomatica", () =>
      prisma.movimentacaoAutomatica.deleteMany({}),
    ),
  );
  counts.push(
    await deleteAndCount("PublicacaoDJEN", () =>
      prisma.publicacaoDJEN.deleteMany({}),
    ),
  );
  counts.push(
    await deleteAndCount("MonitoramentoConfig", () =>
      prisma.monitoramentoConfig.deleteMany({}),
    ),
  );

  // 4) Subprocessos TCE (filhos primeiro)
  counts.push(
    await deleteAndCount("PrazoSubprocessoTce", () =>
      prisma.prazoSubprocessoTce.deleteMany({}),
    ),
  );
  counts.push(
    await deleteAndCount("AndamentoSubprocessoTce", () =>
      prisma.andamentoSubprocessoTce.deleteMany({}),
    ),
  );
  counts.push(
    await deleteAndCount("DocumentoSubprocessoTce", () =>
      prisma.documentoSubprocessoTce.deleteMany({}),
    ),
  );
  counts.push(
    await deleteAndCount("SubprocessoTce", () =>
      prisma.subprocessoTce.deleteMany({}),
    ),
  );

  // 5) Filhos de ProcessoTce
  counts.push(
    await deleteAndCount("InteressadoProcessoTce", () =>
      prisma.interessadoProcessoTce.deleteMany({}),
    ),
  );
  counts.push(
    await deleteAndCount("PrazoTce", () => prisma.prazoTce.deleteMany({})),
  );
  counts.push(
    await deleteAndCount("AndamentoTce", () =>
      prisma.andamentoTce.deleteMany({}),
    ),
  );
  counts.push(
    await deleteAndCount("DocumentoTce", () =>
      prisma.documentoTce.deleteMany({}),
    ),
  );

  // 6) ProcessoTce
  counts.push(
    await deleteAndCount("ProcessoTce", () =>
      prisma.processoTce.deleteMany({}),
    ),
  );

  // 7) Filhos de Processo (judicial)
  counts.push(
    await deleteAndCount("Prazo", () => prisma.prazo.deleteMany({})),
  );
  counts.push(
    await deleteAndCount("Andamento", () => prisma.andamento.deleteMany({})),
  );
  counts.push(
    await deleteAndCount("Documento", () => prisma.documento.deleteMany({})),
  );

  // 8) Processo (judicial)
  counts.push(
    await deleteAndCount("Processo", () => prisma.processo.deleteMany({})),
  );

  // 9) Gestao / Municipios (filhos com FK sem cascade primeiro)
  counts.push(
    await deleteAndCount("HistoricoGestao", () =>
      prisma.historicoGestao.deleteMany({}),
    ),
  );
  counts.push(
    await deleteAndCount("GestorMunicipio", () =>
      prisma.gestorMunicipio.deleteMany({}),
    ),
  );
  counts.push(
    await deleteAndCount("Gestor", () => prisma.gestor.deleteMany({})),
  );
  counts.push(
    await deleteAndCount("Municipio", () => prisma.municipio.deleteMany({})),
  );

  console.log("\n=== RESUMO ===");
  let total = 0;
  for (const c of counts) {
    total += c.count;
  }
  console.log(`Total apagado: ${total} registros`);

  const usersDepois = await prisma.user.count();
  const escritorios = await prisma.escritorio.count();
  console.log(`\nPreservados:`);
  console.log(`  User: ${usersDepois}`);
  console.log(`  Escritorio: ${escritorios}`);

  if (usersAntes !== usersDepois) {
    throw new Error(
      `ALERTA: numero de usuarios mudou (${usersAntes} -> ${usersDepois}).`,
    );
  }

  console.log("\nUsuarios:");
  const users = await prisma.user.findMany({
    select: { nome: true, email: true, role: true },
    orderBy: { nome: "asc" },
  });
  for (const u of users) {
    console.log(`  - ${u.nome} (${u.email}) [${u.role}]`);
  }
}

main()
  .catch((e) => {
    console.error("ERRO na limpeza:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
