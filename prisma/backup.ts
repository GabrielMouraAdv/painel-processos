/**
 * Backup completo de todas as tabelas do banco para arquivos JSON.
 * Saida: backup/<timestamp>/<tabela>.json
 *
 * Uso: tsx prisma/backup.ts
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

function timestampDir(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (
    value &&
    typeof value === "object" &&
    "constructor" in value &&
    (value as { constructor?: { name?: string } }).constructor?.name ===
      "Decimal"
  ) {
    return (value as { toString: () => string }).toString();
  }
  return value;
}

async function dump(
  outDir: string,
  name: string,
  fetcher: () => Promise<unknown[]>,
): Promise<number> {
  const rows = await fetcher();
  const filePath = path.join(outDir, `${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(rows, jsonReplacer, 2), "utf8");
  console.log(`  ${name}: ${rows.length} registro(s) -> ${filePath}`);
  return rows.length;
}

async function main() {
  const stamp = timestampDir();
  const baseDir = path.resolve(process.cwd(), "backup", stamp);
  fs.mkdirSync(baseDir, { recursive: true });

  console.log(`\n=== BACKUP ===`);
  console.log(`Diretorio: ${baseDir}\n`);

  const counts: Record<string, number> = {};

  counts.escritorio = await dump(baseDir, "escritorio", () =>
    prisma.escritorio.findMany(),
  );
  counts.user = await dump(baseDir, "user", () => prisma.user.findMany());

  counts.gestor = await dump(baseDir, "gestor", () => prisma.gestor.findMany());
  counts.gestorMunicipio = await dump(baseDir, "gestorMunicipio", () =>
    prisma.gestorMunicipio.findMany(),
  );
  counts.municipio = await dump(baseDir, "municipio", () =>
    prisma.municipio.findMany(),
  );
  counts.historicoGestao = await dump(baseDir, "historicoGestao", () =>
    prisma.historicoGestao.findMany(),
  );

  counts.processo = await dump(baseDir, "processo", () =>
    prisma.processo.findMany(),
  );
  counts.andamento = await dump(baseDir, "andamento", () =>
    prisma.andamento.findMany(),
  );
  counts.prazo = await dump(baseDir, "prazo", () => prisma.prazo.findMany());
  counts.documento = await dump(baseDir, "documento", () =>
    prisma.documento.findMany(),
  );

  counts.processoTce = await dump(baseDir, "processoTce", () =>
    prisma.processoTce.findMany(),
  );
  counts.andamentoTce = await dump(baseDir, "andamentoTce", () =>
    prisma.andamentoTce.findMany(),
  );
  counts.prazoTce = await dump(baseDir, "prazoTce", () =>
    prisma.prazoTce.findMany(),
  );
  counts.documentoTce = await dump(baseDir, "documentoTce", () =>
    prisma.documentoTce.findMany(),
  );
  counts.interessadoProcessoTce = await dump(
    baseDir,
    "interessadoProcessoTce",
    () => prisma.interessadoProcessoTce.findMany(),
  );

  counts.subprocessoTce = await dump(baseDir, "subprocessoTce", () =>
    prisma.subprocessoTce.findMany(),
  );
  counts.prazoSubprocessoTce = await dump(baseDir, "prazoSubprocessoTce", () =>
    prisma.prazoSubprocessoTce.findMany(),
  );
  counts.andamentoSubprocessoTce = await dump(
    baseDir,
    "andamentoSubprocessoTce",
    () => prisma.andamentoSubprocessoTce.findMany(),
  );
  counts.documentoSubprocessoTce = await dump(
    baseDir,
    "documentoSubprocessoTce",
    () => prisma.documentoSubprocessoTce.findMany(),
  );

  counts.sessaoPauta = await dump(baseDir, "sessaoPauta", () =>
    prisma.sessaoPauta.findMany(),
  );
  counts.itemPauta = await dump(baseDir, "itemPauta", () =>
    prisma.itemPauta.findMany(),
  );
  counts.sessaoJudicial = await dump(baseDir, "sessaoJudicial", () =>
    prisma.sessaoJudicial.findMany(),
  );
  counts.itemPautaJudicial = await dump(baseDir, "itemPautaJudicial", () =>
    prisma.itemPautaJudicial.findMany(),
  );

  counts.movimentacaoAutomatica = await dump(
    baseDir,
    "movimentacaoAutomatica",
    () => prisma.movimentacaoAutomatica.findMany(),
  );
  counts.publicacaoDJEN = await dump(baseDir, "publicacaoDJEN", () =>
    prisma.publicacaoDJEN.findMany(),
  );
  counts.monitoramentoConfig = await dump(baseDir, "monitoramentoConfig", () =>
    prisma.monitoramentoConfig.findMany(),
  );

  fs.writeFileSync(
    path.join(baseDir, "_summary.json"),
    JSON.stringify({ timestamp: stamp, counts }, null, 2),
    "utf8",
  );

  console.log(`\nBackup concluido. ${baseDir}`);
}

main()
  .catch((e) => {
    console.error("ERRO no backup:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
