import { PrismaClient, Role, TipoProcesso, Tribunal, Grau, Risco } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Limpando dados existentes...");
  await prisma.documento.deleteMany();
  await prisma.prazo.deleteMany();
  await prisma.andamento.deleteMany();
  await prisma.processo.deleteMany();
  await prisma.gestor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.escritorio.deleteMany();

  console.log("Criando escritorio...");
  const escritorio = await prisma.escritorio.create({
    data: {
      nome: "Escritorio Modelo Advocacia",
      cnpj: "12.345.678/0001-99",
    },
  });

  console.log("Criando usuario admin...");
  const senhaHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.create({
    data: {
      email: "admin@escritorio.com",
      nome: "Administrador",
      senha: senhaHash,
      role: Role.ADMIN,
      escritorioId: escritorio.id,
    },
  });

  console.log("Criando gestores...");
  const [gestor1, gestor2, gestor3] = await Promise.all([
    prisma.gestor.create({
      data: {
        nome: "Carlos Almeida",
        cpf: "123.456.789-01",
        municipio: "Recife",
        cargo: "Prefeito",
        observacoes: "Gestao 2021-2024",
        escritorioId: escritorio.id,
      },
    }),
    prisma.gestor.create({
      data: {
        nome: "Mariana Souza",
        cpf: "234.567.890-12",
        municipio: "Olinda",
        cargo: "Secretaria de Fazenda",
        observacoes: null,
        escritorioId: escritorio.id,
      },
    }),
    prisma.gestor.create({
      data: {
        nome: "Roberto Lima",
        cpf: "345.678.901-23",
        municipio: "Caruaru",
        cargo: "Vereador",
        observacoes: "Presidente da Camara em 2022",
        escritorioId: escritorio.id,
      },
    }),
  ]);

  console.log("Criando processos e andamentos...");

  const processosData = [
    {
      numero: "0001234-56.2023.8.17.0001",
      tipo: TipoProcesso.IMPROBIDADE,
      tribunal: Tribunal.TJPE,
      juizo: "1a Vara da Fazenda Publica de Recife",
      grau: Grau.PRIMEIRO,
      fase: "Instrucao",
      resultado: null,
      risco: Risco.ALTO,
      valor: 2_500_000,
      dataDistribuicao: new Date("2023-03-15"),
      objeto:
        "Acao de improbidade administrativa por suposta dispensa indevida de licitacao em contrato de obras publicas.",
      gestorId: gestor1.id,
      andamentos: [
        {
          data: new Date("2023-03-16"),
          grau: Grau.PRIMEIRO,
          fase: "Distribuicao",
          resultado: null,
          texto: "Processo distribuido para a 1a Vara da Fazenda Publica.",
        },
        {
          data: new Date("2023-05-02"),
          grau: Grau.PRIMEIRO,
          fase: "Contestacao",
          resultado: null,
          texto: "Apresentada contestacao com preliminares de inepcia da inicial.",
        },
        {
          data: new Date("2024-01-20"),
          grau: Grau.PRIMEIRO,
          fase: "Instrucao",
          resultado: null,
          texto: "Audiencia de instrucao designada para 20/04/2024.",
        },
      ],
    },
    {
      numero: "0005678-90.2022.4.05.8300",
      tipo: TipoProcesso.ACP,
      tribunal: Tribunal.TRF5,
      juizo: "4a Vara Federal de Pernambuco",
      grau: Grau.PRIMEIRO,
      fase: "Sentenca",
      resultado: "Procedencia parcial",
      risco: Risco.MEDIO,
      valor: 1_200_000,
      dataDistribuicao: new Date("2022-08-10"),
      objeto:
        "Acao civil publica ambiental questionando licenciamento de empreendimento em area de preservacao permanente.",
      gestorId: gestor2.id,
      andamentos: [
        {
          data: new Date("2022-08-11"),
          grau: Grau.PRIMEIRO,
          fase: "Distribuicao",
          resultado: null,
          texto: "Distribuido por sorteio.",
        },
        {
          data: new Date("2024-02-15"),
          grau: Grau.PRIMEIRO,
          fase: "Sentenca",
          resultado: "Procedencia parcial",
          texto: "Sentenca prolatada com procedencia parcial dos pedidos.",
        },
      ],
    },
    {
      numero: "0009999-11.2024.8.17.0003",
      tipo: TipoProcesso.CRIMINAL,
      tribunal: Tribunal.TJPE,
      juizo: "2a Vara Criminal de Caruaru",
      grau: Grau.PRIMEIRO,
      fase: "Denuncia recebida",
      resultado: null,
      risco: Risco.ALTO,
      valor: null,
      dataDistribuicao: new Date("2024-06-01"),
      objeto: "Denuncia por peculato relativa a desvio de recursos da Camara Municipal.",
      gestorId: gestor3.id,
      andamentos: [
        {
          data: new Date("2024-06-02"),
          grau: Grau.PRIMEIRO,
          fase: "Distribuicao",
          resultado: null,
          texto: "Processo distribuido.",
        },
        {
          data: new Date("2024-07-10"),
          grau: Grau.PRIMEIRO,
          fase: "Denuncia recebida",
          resultado: null,
          texto: "Denuncia recebida pelo juizo. Defesa previa apresentada no prazo legal.",
        },
      ],
    },
    {
      numero: "0002222-33.2021.4.05.8300",
      tipo: TipoProcesso.IMPROBIDADE,
      tribunal: Tribunal.TRF5,
      juizo: "TRF5 - 2a Turma",
      grau: Grau.SEGUNDO,
      fase: "Apelacao",
      resultado: null,
      risco: Risco.MEDIO,
      valor: 800_000,
      dataDistribuicao: new Date("2021-11-22"),
      objeto:
        "Apelacao contra sentenca de primeiro grau que condenou por ato de improbidade em contratacao de servicos.",
      gestorId: gestor1.id,
      andamentos: [
        {
          data: new Date("2021-11-23"),
          grau: Grau.PRIMEIRO,
          fase: "Distribuicao",
          resultado: null,
          texto: "Distribuido em primeiro grau.",
        },
        {
          data: new Date("2023-09-14"),
          grau: Grau.PRIMEIRO,
          fase: "Sentenca",
          resultado: "Procedencia",
          texto: "Sentenca de procedencia. Interposta apelacao tempestivamente.",
        },
        {
          data: new Date("2024-02-03"),
          grau: Grau.SEGUNDO,
          fase: "Apelacao",
          resultado: null,
          texto: "Autos remetidos ao TRF5 para julgamento da apelacao.",
        },
      ],
    },
    {
      numero: "0007777-88.2020.3.00.0000",
      tipo: TipoProcesso.IMPROBIDADE,
      tribunal: Tribunal.STJ,
      juizo: "STJ - 1a Turma",
      grau: Grau.SUPERIOR,
      fase: "Recurso especial",
      resultado: null,
      risco: Risco.BAIXO,
      valor: 3_500_000,
      dataDistribuicao: new Date("2020-05-30"),
      objeto:
        "Recurso especial contra acordao do TRF5 em acao de improbidade administrativa. Discussao sobre dolo especifico.",
      gestorId: gestor2.id,
      andamentos: [
        {
          data: new Date("2020-06-01"),
          grau: Grau.PRIMEIRO,
          fase: "Distribuicao",
          resultado: null,
          texto: "Processo de origem distribuido.",
        },
        {
          data: new Date("2023-11-20"),
          grau: Grau.SEGUNDO,
          fase: "Acordao",
          resultado: "Parcialmente provido",
          texto: "Acordao do TRF5 parcialmente provido. Interposto recurso especial.",
        },
        {
          data: new Date("2024-03-10"),
          grau: Grau.SUPERIOR,
          fase: "Recurso especial",
          resultado: null,
          texto: "Recurso especial admitido. Aguardando julgamento.",
        },
      ],
    },
  ];

  for (const data of processosData) {
    const { andamentos, ...processoFields } = data;
    const processo = await prisma.processo.create({
      data: {
        ...processoFields,
        advogadoId: admin.id,
        escritorioId: escritorio.id,
      },
    });

    await prisma.andamento.createMany({
      data: andamentos.map((a) => ({
        ...a,
        processoId: processo.id,
        autorId: admin.id,
      })),
    });
  }

  console.log("Seed concluido com sucesso.");
  console.log(`Escritorio: ${escritorio.nome}`);
  console.log(`Admin: ${admin.email} / admin123`);
  console.log(`Gestores: ${gestor1.nome}, ${gestor2.nome}, ${gestor3.nome}`);
  console.log(`Processos criados: ${processosData.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
