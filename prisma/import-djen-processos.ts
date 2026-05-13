/**
 * Import idempotente de 106 processos ACI/ACP capturados via DJEN+DataJud.
 *
 * - Cria/encontra Gestor por nome+escritorio.
 * - Encontra User advogado por email.
 * - Faz upsert do Processo por numero (idempotente).
 * - Ativa MonitoramentoConfig (monitoramentoAtivo=true) -> cron pega DataJud+DJEN.
 *
 * Uso:
 *   1. Coloque o arquivo processos-import.json em prisma/data/processos-import.json
 *   2. npx tsx prisma/import-djen-processos.ts
 *   3. Para rodar em modo "dry-run" (so simula): npx tsx prisma/import-djen-processos.ts --dry
 */
import { PrismaClient, TipoProcesso, Tribunal, Grau, Risco, TipoInteressado } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry");

// Mapa de correcao de emails: o JSON traz emails antigos/errados,
// aqui normalizamos para os emails reais cadastrados no banco.
const EMAIL_MAP: Record<string, string> = {
  "filipe.campos@escritorio.com": "filipe@escritorio.com",
  "julio.rodrigues@escritorio.com": "julio@escritorio.com",
  "henrique.arruda@escritorio.com": "henrique@escritorio.com",
  "gabriel.moura@escritorio.com": "gabriel@escritorio.com",
  "julia.dubeux@escritorio.com": "julia@escritorio.com",
};

type ProcessoImport = {
  numero: string;
  tipo: keyof typeof TipoProcesso;
  tipoLivre: string | null;
  tribunal: keyof typeof Tribunal;
  tribunalOutro: string | null;
  juizo: string;
  grau: keyof typeof Grau;
  fase: string;
  risco: keyof typeof Risco;
  dataDistribuicao: string;
  objeto: string;
  advogadoEmail: string;
  advogadoNome: string;
  bancasSlug: string[];
  gestor: {
    nome: string;
    criar_se_falta: boolean;
    municipio?: string;
    cargo?: string;
    tipoInteressado?: string;
    observacoes?: string;
  };
  coAdvogadosOAB: string[];
  _meta: any;
};

async function resolveAdvogado(email: string, nome: string, escritorioId: string) {
  const emailNormalizado = EMAIL_MAP[email] ?? email;
  const user = await prisma.user.findUnique({ where: { email: emailNormalizado } });
  if (user) return user;
  throw new Error(
    `Advogado nao encontrado: ${nome} (email: ${emailNormalizado}). Rode create-user-paulo.ts/create-user-julia.ts primeiro.`,
  );
}

async function resolveGestor(g: ProcessoImport["gestor"], escritorioId: string) {
  // Tenta achar por nome+escritorio (case-insensitive)
  const existente = await prisma.gestor.findFirst({
    where: {
      escritorioId,
      nome: { equals: g.nome, mode: "insensitive" },
    },
  });
  if (existente) return existente;

  // Sempre cria automaticamente qualquer gestor ausente, sem exigir flag.
  const municipio = g.municipio || "A definir";

  if (DRY_RUN) {
    console.log(`  [CRIADO] Gestor: ${g.nome} (muni=${municipio})`);
    return { id: "<would-create>" } as any;
  }

  const criado = await prisma.gestor.create({
    data: {
      nome: g.nome,
      municipio,
      cargo: g.cargo || "A identificar",
      tipoInteressado:
        g.tipoInteressado === "PESSOA_JURIDICA"
          ? TipoInteressado.PESSOA_JURIDICA
          : TipoInteressado.PESSOA_FISICA,
      observacoes: g.observacoes || null,
      escritorioId,
    },
  });
  console.log(`+ Gestor criado: ${g.nome}`);
  return criado;
}

async function main() {
  if (DRY_RUN) {
    console.log("=== MODO DRY-RUN — nada sera gravado ===\n");
  }

  const escritorio = await prisma.escritorio.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (!escritorio) throw new Error("Nenhum escritorio encontrado.");
  console.log(`Escritorio: ${escritorio.nome} (id=${escritorio.id})\n`);

  const jsonPath = join(__dirname, "data", "processos-import.json");
  const processos: ProcessoImport[] = JSON.parse(readFileSync(jsonPath, "utf-8"));
  console.log(`Lidos ${processos.length} processos do JSON.\n`);

  const stats = {
    criados: 0,
    atualizados: 0,
    pulados: 0,
    erros: [] as { numero: string; erro: string }[],
  };

  for (const p of processos) {
    try {
      const advogado = await resolveAdvogado(
        p.advogadoEmail,
        p.advogadoNome,
        escritorio.id,
      );
      const gestor = await resolveGestor(p.gestor, escritorio.id);

      const tipo = TipoProcesso[p.tipo] ?? TipoProcesso.OUTRO;
      const tribunal = Tribunal[p.tribunal] ?? Tribunal.OUTRO;
      const grau = Grau[p.grau] ?? Grau.PRIMEIRO;
      const risco = Risco[p.risco] ?? Risco.MEDIO;

      // se tribunal=OUTRO e existe tribunalOutro, anexa ao juizo
      let juizo = p.juizo;
      if (tribunal === Tribunal.OUTRO && p.tribunalOutro) {
        juizo = `[${p.tribunalOutro}] ${juizo}`;
      }

      const dataDistribuicao = new Date(p.dataDistribuicao);

      if (DRY_RUN) {
        console.log(`[DRY] ${p.numero} | ${tipo} | ${tribunal} | adv=${p.advogadoNome} | gestor=${p.gestor.nome}`);
        continue;
      }

      const existente = await prisma.processo.findUnique({
        where: { numero: p.numero },
      });

      if (existente) {
        // Nao sobrescreve dados ja preenchidos manualmente — so atualiza bancasSlug
        // adicionando os novos slugs
        const novos = Array.from(
          new Set([...(existente.bancasSlug || []), ...p.bancasSlug]),
        );
        await prisma.processo.update({
          where: { id: existente.id },
          data: { bancasSlug: novos },
        });
        // garante monitoramento ativo
        await prisma.monitoramentoConfig.upsert({
          where: { processoId: existente.id },
          create: {
            processoId: existente.id,
            monitoramentoAtivo: true,
            totalVerificacoes: 0,
          },
          update: { monitoramentoAtivo: true },
        });
        stats.atualizados++;
        console.log(`~ ATUALIZADO ${p.numero}`);
      } else {
        const created = await prisma.processo.create({
          data: {
            numero: p.numero,
            tipo,
            tipoLivre: p.tipoLivre,
            tribunal,
            juizo: juizo.slice(0, 250),
            grau,
            fase: p.fase,
            risco,
            dataDistribuicao,
            objeto: p.objeto,
            bancasSlug: p.bancasSlug,
            memorialPronto: false,
            despachadoComRelator: false,
            memorialDispensado: false,
            despachoDispensado: false,
            julgado: false,
            gestorId: gestor.id,
            advogadoId: advogado.id,
            escritorioId: escritorio.id,
            monitoramento: {
              create: {
                monitoramentoAtivo: true,
                totalVerificacoes: 0,
              },
            },
          },
        });
        stats.criados++;
        console.log(`+ CRIADO ${p.numero} (id=${created.id})`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      stats.erros.push({ numero: p.numero, erro: msg });
      console.error(`! ERRO ${p.numero}: ${msg}`);
    }
  }

  console.log("\n=== RESULTADO ===");
  console.log(`Criados:     ${stats.criados}`);
  console.log(`Atualizados: ${stats.atualizados}`);
  console.log(`Erros:       ${stats.erros.length}`);
  if (stats.erros.length > 0) {
    console.log("\nErros detalhados:");
    for (const e of stats.erros) {
      console.log(`  ${e.numero}: ${e.erro}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
