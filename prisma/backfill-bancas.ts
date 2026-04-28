// Backfill de bancaSlug em User e bancasSlug em Processo (Judicial).
// Roda apos a migration `add_banca_user_e_processo`.
//   npx tsx prisma/backfill-bancas.ts
//
// Vinculo entre email -> bancaSlug. Tudo idempotente (so seta se ainda esta null/vazio).

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const USER_BANCA: { email: string; bancaSlug: string | null }[] = [
  { email: "admin@escritorio.com", bancaSlug: null },
  { email: "gabriel@escritorio.com", bancaSlug: "gabriel-moura" },
  { email: "mateus@escritorio.com", bancaSlug: null },
  { email: "filipe@escritorio.com", bancaSlug: "filipe-campos" },
  { email: "julio@escritorio.com", bancaSlug: "porto-rodrigues" },
  { email: "carlos@escritorio.com", bancaSlug: "porto-rodrigues" },
  { email: "henrique@escritorio.com", bancaSlug: "henrique" },
  { email: "heloisa.cavalcanti@escritorio.com", bancaSlug: "heloisa" },
];

async function main() {
  console.log("=== ETAPA 1: backfill User.bancaSlug ===");
  let userUpdates = 0;
  for (const m of USER_BANCA) {
    const u = await prisma.user.findUnique({ where: { email: m.email } });
    if (!u) {
      console.log(`  [skip] ${m.email} nao existe`);
      continue;
    }
    await prisma.user.update({
      where: { id: u.id },
      data: { bancaSlug: m.bancaSlug },
    });
    userUpdates++;
    console.log(`  [ok] ${m.email} -> ${m.bancaSlug ?? "(null)"}`);
  }

  console.log("\n=== ETAPA 2: backfill Processo.bancasSlug (Judicial) ===");
  // Para cada Processo com bancasSlug vazio, pega advogado.bancaSlug
  const processos = await prisma.processo.findMany({
    where: { bancasSlug: { isEmpty: true } },
    select: { id: true, numero: true, advogadoId: true },
  });
  console.log(`  ${processos.length} processos com bancasSlug vazio`);

  const advogadosIds = Array.from(new Set(processos.map((p) => p.advogadoId)));
  const advogados = await prisma.user.findMany({
    where: { id: { in: advogadosIds } },
    select: { id: true, email: true, bancaSlug: true },
  });
  const bancaByAdvId = new Map(
    advogados.map((a) => [a.id, a.bancaSlug ?? null]),
  );

  let backfilled = 0;
  let semBanca = 0;
  for (const p of processos) {
    const banca = bancaByAdvId.get(p.advogadoId);
    if (!banca) {
      semBanca++;
      continue; // advogado sem banca -> processo fica com bancasSlug = []
    }
    await prisma.processo.update({
      where: { id: p.id },
      data: { bancasSlug: [banca] },
    });
    backfilled++;
  }

  console.log(`  Backfilled: ${backfilled}`);
  console.log(
    `  Sem banca (advogado.bancaSlug=null) — bancasSlug fica []: ${semBanca}`,
  );

  console.log("\n=== Distribuicao final Processo (Judicial) ===");
  const slugs = [
    "filipe-campos",
    "porto-rodrigues",
    "gabriel-moura",
    "paulo-maciel",
    "heloisa",
    "henrique",
  ];
  for (const slug of slugs) {
    const c = await prisma.processo.count({
      where: { bancasSlug: { has: slug } },
    });
    console.log(`  ${slug.padEnd(20)} ${c}`);
  }
  const semBancaCount = await prisma.processo.count({
    where: { bancasSlug: { isEmpty: true } },
  });
  console.log(`  ${"(sem banca)".padEnd(20)} ${semBancaCount}`);

  console.log(`\nUser updates: ${userUpdates}`);
  console.log("OK.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
