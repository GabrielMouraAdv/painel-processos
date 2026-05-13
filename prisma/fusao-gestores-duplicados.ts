/**
 * Fusao de 11 gestores duplicados identificados pelo diagnostico-gestores-duplicados.ts.
 *
 * Regra (para cada par):
 *   - Move TODOS os processos do gestor "Novo" (municipio "A definir") para o "Existente"
 *   - Renomeia o "Existente" com o nome COMPLETO informado abaixo
 *   - Mantem municipio/cargo/observacoes/etc do "Existente"; copia do "Novo"
 *     apenas campos que estejam null/vazios no "Existente"
 *   - Deleta o gestor "Novo"
 *
 * Cada par roda em uma transaction (atomico).
 *
 * Uso:
 *   npx tsx prisma/fusao-gestores-duplicados.ts --dry   (simula)
 *   npx tsx prisma/fusao-gestores-duplicados.ts         (executa de verdade)
 */
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry");

type Par = {
  n: number;
  existenteId: string;
  novoId: string;
  novoNomeFinal: string;
};

const PARES: Par[] = [
  { n: 1,  existenteId: "cmoeq8vgt0023khc82pn716jq", novoId: "cmp4hlwsw001vkhc0zm5pjvsu", novoNomeFinal: "José Alventino Lima Filho" },
  { n: 2,  existenteId: "cmoeq8w290029khc80cal0zij", novoId: "cmp4hnbab0058khc0loycgc21", novoNomeFinal: "Carlos Alberto Arruda Bezerra" },
  { n: 3,  existenteId: "cmoeq8wgx002dkhc8c696pcio", novoId: "cmp4hq7dy00aokhc0qx9uehap", novoNomeFinal: "Felipe Porto De Barros Wanderley Lima" },
  { n: 4,  existenteId: "cmoeq96w2004xkhc8d30g8w8g", novoId: "cmp4hlmox0015khc0zra0lusi", novoNomeFinal: "Germano Soares Valença" },
  { n: 5,  existenteId: "cmoeq8wv9002hkhc8x3u5cukx", novoId: "cmp4hl7q50001khc0fw3tohd5", novoNomeFinal: "Gilvan de Albuquerque Araújo" },
  { n: 6,  existenteId: "cmoeq8yiv002xkhc8wz755t73", novoId: "cmp4hphf70091khc0au0cq77o", novoNomeFinal: "João Tenório Vaz Cavalcanti Júnior" },
  { n: 7,  existenteId: "cmoeq8yx20031khc8xhv30kje", novoId: "cmp4hndxq005dkhc0wuycwzxj", novoNomeFinal: "Leonardo Xavier Martins" },
  { n: 8,  existenteId: "cmoeq91ht003pkhc8d3so0pbb", novoId: "cmp4hntzb006ikhc0mact1lrs", novoNomeFinal: "Paulo Batista Andrade" },
  { n: 9,  existenteId: "cmoeq8vny0025khc81wivra6p", novoId: "cmp4hn8nh0053khc0ogxam2zp", novoNomeFinal: "Armando Almeida Souto" },
  { n: 10, existenteId: "cmoeq8y4i002tkhc8xfqa7uhg", novoId: "cmp4hnips005okhc0bv57ms13", novoNomeFinal: "Josibias Darcy de Castro Cavalcanti" },
  { n: 11, existenteId: "cmoeq923q003tkhc8dddb4cgc", novoId: "cmp4hlzxu0025khc0xbl50m1y", novoNomeFinal: "Roberto Abraham Abrahamian Asfora" },
];

function eVazio(v: string | null | undefined): boolean {
  return v === null || v === undefined || v.trim() === "";
}

async function pegarUserAuditoria(escritorioId: string): Promise<string | null> {
  const admin = await prisma.user.findFirst({
    where: { escritorioId, role: "ADMIN" },
    select: { id: true },
  });
  if (admin) return admin.id;
  const qualquer = await prisma.user.findFirst({
    where: { escritorioId },
    select: { id: true },
  });
  return qualquer?.id ?? null;
}

async function processarPar(par: Par) {
  const sep = "=".repeat(72);
  console.log(`\n${sep}\nPAR ${par.n}: ${par.novoNomeFinal}\n${sep}`);

  const existente = await prisma.gestor.findUnique({
    where: { id: par.existenteId },
    include: {
      _count: { select: { processos: true, interessadoProcessosTce: true } },
    },
  });
  const novo = await prisma.gestor.findUnique({
    where: { id: par.novoId },
    include: {
      _count: {
        select: {
          processos: true,
          interessadoProcessosTce: true,
          historicoGestoes: true,
          municipiosAtuacao: true,
        },
      },
    },
  });

  if (!existente) {
    console.log(`  [SKIP] gestor existente ${par.existenteId} nao encontrado (ja fundido?)`);
    return;
  }
  if (!novo) {
    console.log(`  [SKIP] gestor novo ${par.novoId} nao encontrado (ja fundido?)`);
    return;
  }

  console.log(`  Existente: ${existente.nome} | municipio="${existente.municipio}" | cargo="${existente.cargo}" | procsJud=${existente._count.processos} procsTce=${existente._count.interessadoProcessosTce}`);
  console.log(`  Novo:      ${novo.nome} | municipio="${novo.municipio}" | cargo="${novo.cargo}" | procsJud=${novo._count.processos} procsTce=${novo._count.interessadoProcessosTce} historico=${novo._count.historicoGestoes} municipiosAtuacao=${novo._count.municipiosAtuacao}`);

  // Calcular campos a copiar do novo para o existente quando o existente tiver vazio
  const patch: Prisma.GestorUpdateInput = { nome: par.novoNomeFinal };
  const camposCopiaveis: (keyof typeof existente & keyof typeof novo)[] = [
    "cpf", "email", "telefone", "observacoes", "razaoSocial",
    "nomeFantasia", "cnpj", "ramoAtividade",
  ];
  for (const campo of camposCopiaveis) {
    if (eVazio(existente[campo] as string | null) && !eVazio(novo[campo] as string | null)) {
      (patch as Record<string, unknown>)[campo] = novo[campo];
      console.log(`    + copiando "${campo}" do novo: ${String(novo[campo])}`);
    }
  }

  // Processos judiciais a mover
  const procsJud = await prisma.processo.findMany({
    where: { gestorId: novo.id },
    select: { id: true, numero: true },
  });
  console.log(`  -> processos judiciais a mover (${procsJud.length}):`);
  procsJud.forEach((p) => console.log(`       ${p.numero} (id=${p.id})`));

  // Interessados TCE a mover
  const interessadosTce = await prisma.interessadoProcessoTce.findMany({
    where: { gestorId: novo.id },
    select: { id: true, processoId: true },
  });
  if (interessadosTce.length > 0) {
    console.log(`  -> interessados TCE a mover (${interessadosTce.length}):`);
    interessadosTce.forEach((i) => console.log(`       processoTce=${i.processoId}`));
  }

  // Historicos de gestao
  const historicos = await prisma.historicoGestao.findMany({
    where: { gestorId: novo.id },
    select: { id: true, municipioId: true, cargo: true },
  });
  if (historicos.length > 0) {
    console.log(`  -> historicoGestao a mover (${historicos.length})`);
  }

  // Vinculacoes a Municipios (cuidado com unique [gestorId, municipioId])
  const vincMunicipios = await prisma.gestorMunicipio.findMany({
    where: { gestorId: novo.id },
    select: { id: true, municipioId: true },
  });
  if (vincMunicipios.length > 0) {
    console.log(`  -> gestorMunicipio a mover/dedupe (${vincMunicipios.length})`);
  }

  if (DRY) {
    console.log("  [DRY] nada foi alterado");
    return;
  }

  // === Executa a fusao em transaction ===
  await prisma.$transaction(async (tx) => {
    if (procsJud.length > 0) {
      await tx.processo.updateMany({
        where: { gestorId: novo.id },
        data: { gestorId: existente.id },
      });
    }
    if (interessadosTce.length > 0) {
      await tx.interessadoProcessoTce.updateMany({
        where: { gestorId: novo.id },
        data: { gestorId: existente.id },
      });
    }
    if (historicos.length > 0) {
      await tx.historicoGestao.updateMany({
        where: { gestorId: novo.id },
        data: { gestorId: existente.id },
      });
    }
    // GestorMunicipio: dedupe antes de remapear (unique [gestorId, municipioId])
    for (const vm of vincMunicipios) {
      const jaExiste = await tx.gestorMunicipio.findUnique({
        where: { gestorId_municipioId: { gestorId: existente.id, municipioId: vm.municipioId } },
      });
      if (jaExiste) {
        await tx.gestorMunicipio.delete({ where: { id: vm.id } });
      } else {
        await tx.gestorMunicipio.update({
          where: { id: vm.id },
          data: { gestorId: existente.id },
        });
      }
    }

    await tx.gestor.update({ where: { id: existente.id }, data: patch });
    await tx.gestor.delete({ where: { id: novo.id } });

    const userId = await pegarUserAuditoria(existente.escritorioId);
    if (userId) {
      await tx.logAuditoria.create({
        data: {
          userId,
          acao: "MERGE",
          entidade: "Gestor",
          entidadeId: existente.id,
          descricao: `Fusao de gestor duplicado: "${novo.nome}" (${novo.id}) fundido em "${existente.nome}" (${existente.id}), renomeado para "${par.novoNomeFinal}"`,
          detalhes: JSON.stringify({
            par: par.n,
            mantido: { id: existente.id, nomeAntes: existente.nome, nomeDepois: par.novoNomeFinal, municipio: existente.municipio },
            deletado: { id: novo.id, nome: novo.nome, municipio: novo.municipio },
            processosMovidos: procsJud.length,
            interessadosTceMovidos: interessadosTce.length,
            historicoMovido: historicos.length,
            vincMunicipiosMovidos: vincMunicipios.length,
            camposCopiados: Object.keys(patch).filter((k) => k !== "nome"),
          }),
        },
      });
    }
  });

  console.log(`  [OK] PAR ${par.n} concluido`);
}

async function main() {
  if (DRY) {
    console.log("=== DRY-RUN — nenhuma alteracao sera feita. Rode sem --dry para executar. ===");
  } else {
    console.log("=== EXECUTANDO FUSAO REAL ===");
  }

  let processados = 0;
  for (const par of PARES) {
    try {
      await processarPar(par);
      processados++;
    } catch (e) {
      console.error(`\n[ERRO] PAR ${par.n} falhou:`, e);
      throw e;
    }
  }

  console.log(`\n=== ${DRY ? "DRY-RUN" : "FUSAO"} concluida: ${processados}/${PARES.length} pares processados ===`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
