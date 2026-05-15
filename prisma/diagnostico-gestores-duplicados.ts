/**
 * Diagnostico (APENAS LEITURA): identifica possiveis gestores duplicados.
 *
 * Contexto: a importacao recente via DJEN criou gestores com municipio="A definir"
 * quando nao encontrou correspondencia exata por nome. Isso pode ter gerado
 * duplicatas (mesmo gestor com nome ligeiramente diferente).
 *
 * Heuristicas de similaridade:
 *   1. Mesmo primeiro nome + mesmo ultimo sobrenome
 *   2. Nome A contido em nome B (case insensitive)
 *   3. Nome B contido em nome A (case insensitive)
 *
 * Uso:
 *   npx tsx prisma/diagnostico-gestores-duplicados.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PARTICULAS = new Set([
  "de", "da", "do", "das", "dos", "e", "del", "della", "di", "du", "la", "le",
]);

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): string[] {
  return normalizar(s).split(" ").filter((t) => t && !PARTICULAS.has(t));
}

function primeiroNome(s: string): string {
  const t = tokens(s);
  return t[0] || "";
}

function ultimoSobrenome(s: string): string {
  const t = tokens(s);
  return t[t.length - 1] || "";
}

type GestorRow = {
  id: string;
  nome: string;
  municipio: string;
  cargo: string;
  _count: { processos: number; interessadoProcessosTce: number };
};

type Par = {
  a: GestorRow;
  b: GestorRow;
  motivo: string;
  classe: "SUSPEITO" | "POSSIVEL_HOMONIMO";
};

function classificar(a: GestorRow, b: GestorRow): Par | null {
  const nomeA = normalizar(a.nome);
  const nomeB = normalizar(b.nome);
  if (nomeA === nomeB) {
    return { a, b, motivo: "nomes identicos (apos normalizacao)", classe: "SUSPEITO" };
  }

  const tokensA = tokens(a.nome);
  const tokensB = tokens(b.nome);
  if (tokensA.length === 0 || tokensB.length === 0) return null;

  // Containment (sequence-based, palavras inteiras)
  const contemA = ` ${tokensA.join(" ")} `.includes(` ${tokensB.join(" ")} `);
  const contemB = ` ${tokensB.join(" ")} `.includes(` ${tokensA.join(" ")} `);
  if (contemA || contemB) {
    return {
      a,
      b,
      motivo: contemA
        ? `"${b.nome}" contido em "${a.nome}"`
        : `"${a.nome}" contido em "${b.nome}"`,
      classe: "SUSPEITO",
    };
  }

  const pnA = primeiroNome(a.nome);
  const pnB = primeiroNome(b.nome);
  const usA = ultimoSobrenome(a.nome);
  const usB = ultimoSobrenome(b.nome);

  if (pnA && pnA === pnB && usA && usA === usB) {
    // Se houver pelo menos 1 token do meio compartilhado, mais forte
    const meioA = new Set(tokensA.slice(1, -1));
    const meioB = new Set(tokensB.slice(1, -1));
    const compartilhamMeio = Array.from(meioA).some((t) => meioB.has(t));
    return {
      a,
      b,
      motivo: `mesmo primeiro nome "${pnA}" e mesmo ultimo sobrenome "${usA}"${
        compartilhamMeio ? " + nomes do meio em comum" : ""
      }`,
      classe: compartilhamMeio ? "SUSPEITO" : "POSSIVEL_HOMONIMO",
    };
  }

  return null;
}

async function main() {
  const gestores = await prisma.gestor.findMany({
    select: {
      id: true,
      nome: true,
      municipio: true,
      cargo: true,
      _count: {
        select: {
          processos: true,
          interessadoProcessosTce: true,
        },
      },
    },
    orderBy: { nome: "asc" },
  });

  const total = gestores.length;
  const aDefinir = gestores.filter(
    (g) => normalizar(g.municipio) === normalizar("A definir"),
  );
  const definidos = gestores.filter(
    (g) => normalizar(g.municipio) !== normalizar("A definir"),
  );

  console.log("=== RELATORIO DE GESTORES POSSIVELMENTE DUPLICADOS ===");
  console.log(`Total de gestores: ${total}`);
  console.log(
    `Gestores com municipio "A definir": ${aDefinir.length} (criados na ultima importacao)`,
  );
  console.log(`Gestores com municipio definido: ${definidos.length}`);
  console.log("");
  console.log("== PARES SUSPEITOS ==");
  console.log("");

  const pares: Par[] = [];
  const usadosDefinir = new Set<string>();

  for (const novo of aDefinir) {
    for (const antigo of definidos) {
      const par = classificar(antigo, novo);
      if (par) {
        pares.push(par);
        usadosDefinir.add(novo.id);
      }
    }
  }

  // Tambem detectar duplicatas entre os "A definir" (mesma importacao podem ter criado 2x)
  for (let i = 0; i < aDefinir.length; i++) {
    for (let j = i + 1; j < aDefinir.length; j++) {
      const par = classificar(aDefinir[i], aDefinir[j]);
      if (par) pares.push(par);
    }
  }

  // Ordenar: SUSPEITO primeiro, depois POSSIVEL_HOMONIMO
  pares.sort((x, y) => {
    if (x.classe !== y.classe) return x.classe === "SUSPEITO" ? -1 : 1;
    return x.a.nome.localeCompare(y.a.nome);
  });

  let totalProcessosRealoc = 0;
  pares.forEach((par, idx) => {
    const { a, b, motivo, classe } = par;
    const procsA = a._count.processos + a._count.interessadoProcessosTce;
    const procsB = b._count.processos + b._count.interessadoProcessosTce;
    const alvoFundir = normalizar(b.municipio) === normalizar("A definir") ? b : a;
    const alvoManter = alvoFundir.id === a.id ? b : a;
    const procsFundir =
      alvoFundir._count.processos + alvoFundir._count.interessadoProcessosTce;
    totalProcessosRealoc += procsFundir;

    console.log(`PAR ${idx + 1}: [${classe}]`);
    console.log(
      `  [A] id=${a.id} | ${a.nome} | Municipio: ${a.municipio} | Cargo: ${a.cargo} | Processos: ${procsA} (jud=${a._count.processos} tce=${a._count.interessadoProcessosTce})`,
    );
    console.log(
      `  [B] id=${b.id} | ${b.nome} | Municipio: ${b.municipio} | Cargo: ${b.cargo} | Processos: ${procsB} (jud=${b._count.processos} tce=${b._count.interessadoProcessosTce})`,
    );
    console.log(`  Motivo: ${motivo}`);
    const sufixo =
      alvoFundir.nome.length > alvoManter.nome.length
        ? `, atualizando nome de [${alvoManter.id === a.id ? "A" : "B"}] para "${alvoFundir.nome}"`
        : "";
    console.log(
      `  Acao sugerida: Fundir [${alvoFundir.id === a.id ? "A" : "B"}] em [${alvoManter.id === a.id ? "A" : "B"}]${sufixo}`,
    );
    console.log("");
  });

  console.log("== RESUMO ==");
  console.log(`Total de pares suspeitos encontrados: ${pares.length}`);
  console.log(
    `  - SUSPEITO (alta confianca): ${pares.filter((p) => p.classe === "SUSPEITO").length}`,
  );
  console.log(
    `  - POSSIVEL_HOMONIMO (revisar manualmente): ${pares.filter((p) => p.classe === "POSSIVEL_HOMONIMO").length}`,
  );
  console.log(`Processos que seriam realocados (somatorio): ${totalProcessosRealoc}`);
  console.log(
    `Gestores "A definir" sem nenhum candidato a duplicata: ${aDefinir.length - usadosDefinir.size}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
