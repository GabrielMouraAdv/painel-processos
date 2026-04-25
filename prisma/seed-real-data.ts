/**
 * Seed dos municipios e gestores reais do escritorio.
 *
 * Pre-requisito: cleanup-data ja rodado (banco limpo).
 * Uso: tsx prisma/seed-real-data.ts
 */
import { PrismaClient, TipoInteressado } from "@prisma/client";

const prisma = new PrismaClient();

const MUNICIPIOS_PE: { nome: string; obs?: string }[] = [
  { nome: "Altinho" },
  { nome: "Arcoverde" },
  { nome: "Brejo da Madre de Deus" },
  { nome: "Cabo de Santo Agostinho" },
  { nome: "Cachoeirinha" },
  { nome: "Cabrobo" },
  { nome: "Canhotinho" },
  { nome: "Caruaru" },
  { nome: "Catende" },
  { nome: "Dormentes" },
  { nome: "Ipojuca" },
  { nome: "Inaja" },
  { nome: "Ingazeira" },
  { nome: "Itamaraca" },
  { nome: "Lajedo" },
  { nome: "Manari" },
  { nome: "Olinda" },
  { nome: "Oroco" },
  { nome: "Pedra" },
  { nome: "Petrolina" },
  { nome: "Quipapa" },
  { nome: "Salgueiro" },
  { nome: "Sao Caetano" },
  { nome: "Sao Joaquim do Monte" },
  { nome: "Tamandare" },
  { nome: "Venturosa" },
  { nome: "Garanhuns" },
  { nome: "Agrestina" },
  { nome: "Maraial" },
  { nome: "Agua Preta" },
  { nome: "Betania" },
  { nome: "Camara de Canhotinho", obs: "Camara Municipal" },
  { nome: "Camara de Petrolina", obs: "Camara Municipal" },
];

type GestorPf = { nome: string; cargo: string; municipio: string };

const GESTORES_PF: GestorPf[] = [
  { nome: "Adalberto", cargo: "Engenheiro Contratado Municipio", municipio: "Maraial" },
  { nome: "Alvaro Porto", cargo: "Ex-Prefeito / Deputado Estadual", municipio: "Canhotinho" },
  { nome: "Alventino Lima", cargo: "Empresario", municipio: "" },
  { nome: "Armando Souto", cargo: "Ex-Prefeito", municipio: "Agua Preta" },
  { nome: "Carlos Alberto Arruda", cargo: "Ex-Prefeito", municipio: "Cachoeirinha" },
  { nome: "Felipe Porto", cargo: "Ex-Prefeito / Secretario de Turismo do Recife", municipio: "Canhotinho" },
  { nome: "Gilvan Albuquerque", cargo: "Ex-Prefeito / Vice-Prefeito", municipio: "Manari" },
  { nome: "Isaias Regis", cargo: "Ex-Prefeito / Deputado Estadual", municipio: "Garanhuns" },
  { nome: "Ivaldo de Almeida", cargo: "Ex-Prefeito", municipio: "Cachoeirinha" },
  { nome: "Josibias Cavalcanti", cargo: "Ex-Prefeito", municipio: "Catende" },
  { nome: "Joao Tenorio", cargo: "Ex-Prefeito / Deputado Estadual", municipio: "Sao Joaquim do Monte" },
  { nome: "Leonardo Xavier", cargo: "Ex-Prefeito", municipio: "Inaja" },
  { nome: "Lino Olegario", cargo: "Ex-Prefeito", municipio: "Ingazeira" },
  { nome: "Marcilio", cargo: "Ex-Prefeito", municipio: "Cabrobo" },
  { nome: "Mario Gomes Flor", cargo: "Ex-Prefeito", municipio: "Betania" },
  { nome: "Orlando Jose", cargo: "Ex-Prefeito de Manari", municipio: "Altinho" },
  { nome: "Otaviano Martins", cargo: "Ex-Prefeito", municipio: "Manari" },
  { nome: "Paulo Batista", cargo: "Ex-Prefeito", municipio: "Itamaraca" },
  { nome: "Roberto Asfora", cargo: "Prefeito", municipio: "Brejo da Madre de Deus" },
  { nome: "Sandra Paes", cargo: "Prefeita", municipio: "Canhotinho" },
  { nome: "Sueli Almeida", cargo: "Ex-Secretaria de Educacao", municipio: "Catende" },
  { nome: "Thiago Lucena Nunes", cargo: "Ex-Prefeito", municipio: "Agrestina" },
  { nome: "Carlos Santana", cargo: "Prefeito", municipio: "Ipojuca" },
  { nome: "Lupercio Carlos", cargo: "Ex-Prefeito", municipio: "Olinda" },
  { nome: "Zeca Cavalcanti", cargo: "Prefeito", municipio: "Arcoverde" },
  { nome: "Nerianny Cavalcanti", cargo: "Secretaria de Turismo", municipio: "Arcoverde" },
  { nome: "Gislaide Oliveira", cargo: "Secretaria de Educacao", municipio: "Arcoverde" },
  { nome: "Marcio Omena", cargo: "Pregoeiro", municipio: "Manari" },
  { nome: "Germano", cargo: "Servidor", municipio: "Manari" },
  { nome: "Fabio Lisandro", cargo: "Prefeito", municipio: "Salgueiro" },
  { nome: "Mirella Almeida", cargo: "Prefeita", municipio: "Olinda" },
  { nome: "George Gueber", cargo: "Ex-Prefeito", municipio: "Oroco" },
  { nome: "Lula Cabral", cargo: "Prefeito", municipio: "Cabo de Santo Agostinho" },
];

const GESTORES_PJ: { nome: string; cargo: string }[] = [
  { nome: "Liber", cargo: "Empresa" },
  { nome: "Novatec", cargo: "Empresa" },
  { nome: "MedicalMais", cargo: "Empresa" },
  { nome: "Nova Mente", cargo: "Empresa" },
  { nome: "Planalto Pajeu", cargo: "Empresa" },
];

async function main() {
  const escritorio = await prisma.escritorio.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (!escritorio) {
    throw new Error("Nenhum escritorio encontrado.");
  }
  console.log(`Escritorio: ${escritorio.nome} (${escritorio.id})\n`);

  // 1) Municipios
  console.log("=== MUNICIPIOS ===");
  const muniByName = new Map<string, string>();
  for (const m of MUNICIPIOS_PE) {
    const existing = await prisma.municipio.findFirst({
      where: { nome: m.nome, escritorioId: escritorio.id },
    });
    if (existing) {
      console.log(`  [skip] ${m.nome} ja existe`);
      muniByName.set(m.nome, existing.id);
      continue;
    }
    const created = await prisma.municipio.create({
      data: {
        nome: m.nome,
        uf: "PE",
        observacoes: m.obs ?? null,
        escritorioId: escritorio.id,
      },
    });
    muniByName.set(m.nome, created.id);
    console.log(`  [ok]  ${m.nome}${m.obs ? ` (${m.obs})` : ""}`);
  }

  // 2) Gestores PF
  console.log("\n=== GESTORES PESSOA FISICA ===");
  for (const g of GESTORES_PF) {
    const created = await prisma.gestor.create({
      data: {
        nome: g.nome,
        cargo: g.cargo,
        municipio: g.municipio,
        tipoInteressado: TipoInteressado.PESSOA_FISICA,
        escritorioId: escritorio.id,
      },
    });
    if (g.municipio && muniByName.has(g.municipio)) {
      await prisma.gestorMunicipio.create({
        data: {
          gestorId: created.id,
          municipioId: muniByName.get(g.municipio)!,
        },
      });
      console.log(`  [ok]  ${g.nome} - ${g.cargo} (${g.municipio})`);
    } else if (g.municipio) {
      console.log(`  [warn] ${g.nome}: municipio "${g.municipio}" nao encontrado na lista de Municipio`);
    } else {
      console.log(`  [ok]  ${g.nome} - ${g.cargo} (sem municipio)`);
    }
  }

  // 3) Gestores PJ
  console.log("\n=== GESTORES PESSOA JURIDICA ===");
  for (const g of GESTORES_PJ) {
    await prisma.gestor.create({
      data: {
        nome: g.nome,
        cargo: g.cargo,
        municipio: "",
        tipoInteressado: TipoInteressado.PESSOA_JURIDICA,
        escritorioId: escritorio.id,
      },
    });
    console.log(`  [ok]  ${g.nome} - ${g.cargo}`);
  }

  // 4) Resumo
  const totalMunicipios = await prisma.municipio.count({
    where: { escritorioId: escritorio.id },
  });
  const totalPf = await prisma.gestor.count({
    where: {
      escritorioId: escritorio.id,
      tipoInteressado: TipoInteressado.PESSOA_FISICA,
    },
  });
  const totalPj = await prisma.gestor.count({
    where: {
      escritorioId: escritorio.id,
      tipoInteressado: TipoInteressado.PESSOA_JURIDICA,
    },
  });
  const totalVinculos = await prisma.gestorMunicipio.count();

  console.log("\n=== RESUMO ===");
  console.log(`  Municipios cadastrados:        ${totalMunicipios}`);
  console.log(`  Gestores PF:                   ${totalPf}`);
  console.log(`  Gestores PJ:                   ${totalPj}`);
  console.log(`  Total de gestores:             ${totalPf + totalPj}`);
  console.log(`  Vinculos Gestor-Municipio:     ${totalVinculos}`);
  console.log(`  TOTAL GERAL (registros novos): ${totalMunicipios + totalPf + totalPj + totalVinculos}`);
}

main()
  .catch((e) => {
    console.error("ERRO:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
