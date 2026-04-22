import { PrismaClient, Role, TipoProcesso, Tribunal, Grau, Risco } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type Row = {
  numero: string;
  entidade: string;
  tipo: TipoProcesso;
  gestor: string;
  tribunal: Tribunal;
  risco: Risco;
  grau: Grau;
  fase: string;
};

const DADOS: Row[] = [
  { numero: "0001542-12.2026.8.17.2001", entidade: "Município de Arco Verde", tipo: TipoProcesso.IMPROBIDADE, gestor: "João Henrique Lima", tribunal: Tribunal.TJPE, risco: Risco.ALTO, grau: Grau.PRIMEIRO, fase: "contestacao_apresentada" },
  { numero: "0800234-44.2026.4.05.8300", entidade: "Auto Forte Serviços Ltda.", tipo: TipoProcesso.ACP, gestor: "Marcela Queiroz", tribunal: Tribunal.TRF5, risco: Risco.MEDIO, grau: Grau.PRIMEIRO, fase: "aguardando_contestacao" },
  { numero: "1004872-89.2026.4.01.3400", entidade: "Construtiva Engenharia S.A.", tipo: TipoProcesso.CRIMINAL, gestor: "Renato Farias", tribunal: Tribunal.TRF1, risco: Risco.ALTO, grau: Grau.SEGUNDO, fase: "recurso_interposto" },
  { numero: "0002876-55.2026.8.17.3001", entidade: "Instituto Horizonte Social", tipo: TipoProcesso.ACP, gestor: "Paula Menezes", tribunal: Tribunal.TJPE, risco: Risco.BAIXO, grau: Grau.PRIMEIRO, fase: "aguardando_contestacao" },
  { numero: "0801159-02.2026.4.05.8200", entidade: "Nova Via Ambiental Ltda.", tipo: TipoProcesso.IMPROBIDADE, gestor: "Eduardo Siqueira", tribunal: Tribunal.TRF5, risco: Risco.ALTO, grau: Grau.SEGUNDO, fase: "contrarrazoes_apres" },
  { numero: "1000521-77.2026.4.01.3900", entidade: "Clínica Vida Plena", tipo: TipoProcesso.ACP, gestor: "Helena Vasconcelos", tribunal: Tribunal.TRF1, risco: Risco.MEDIO, grau: Grau.PRIMEIRO, fase: "prazo_provas" },
  { numero: "0009981-41.2026.8.17.0001", entidade: "Município de Serra Azul", tipo: TipoProcesso.CRIMINAL, gestor: "Carlos André Pires", tribunal: Tribunal.TJPE, risco: Risco.ALTO, grau: Grau.SUPERIOR, fase: "admissibilidade_sup" },
  { numero: "0803398-61.2026.4.05.8500", entidade: "Grupo São Miguel Participações", tipo: TipoProcesso.ACP, gestor: "Lia Fontes", tribunal: Tribunal.TRF5, risco: Risco.BAIXO, grau: Grau.PRIMEIRO, fase: "audiencia_agendada" },
  { numero: "1003320-19.2026.4.01.3300", entidade: "Hospital Santa Aurora", tipo: TipoProcesso.IMPROBIDADE, gestor: "Bruno Tenório", tribunal: Tribunal.TRF1, risco: Risco.MEDIO, grau: Grau.SEGUNDO, fase: "contrarrazoes_apres" },
  { numero: "0012457-93.2026.8.17.4001", entidade: "Cooperativa Vale Verde", tipo: TipoProcesso.ACP, gestor: "Natália Cordeiro", tribunal: Tribunal.TJPE, risco: Risco.MEDIO, grau: Grau.PRIMEIRO, fase: "sentenca" },
  { numero: "0804412-23.2026.4.05.8400", entidade: "Município de Lagoa Branca", tipo: TipoProcesso.CRIMINAL, gestor: "Fábio Leal", tribunal: Tribunal.TRF5, risco: Risco.ALTO, grau: Grau.PRIMEIRO, fase: "contestacao_apresentada" },
  { numero: "1006784-05.2026.4.01.3200", entidade: "Bio Clean Soluções Ambientais", tipo: TipoProcesso.IMPROBIDADE, gestor: "Aline Barros", tribunal: Tribunal.TRF1, risco: Risco.BAIXO, grau: Grau.PRIMEIRO, fase: "aguardando_contestacao" },
  { numero: "0004510-66.2026.8.17.2501", entidade: "Fundação Esperança", tipo: TipoProcesso.ACP, gestor: "Ricardo Bezerra", tribunal: Tribunal.TJPE, risco: Risco.ALTO, grau: Grau.SEGUNDO, fase: "pauta_julgamento" },
  { numero: "0805099-31.2026.4.05.8100", entidade: "Agro Delta Comércio", tipo: TipoProcesso.CRIMINAL, gestor: "Sabrina Lemos", tribunal: Tribunal.TRF5, risco: Risco.MEDIO, grau: Grau.SEGUNDO, fase: "julgamento_ed_2grau" },
  { numero: "1009012-57.2026.4.01.3100", entidade: "Município de Pedra Clara", tipo: TipoProcesso.ACP, gestor: "Diego Alencar", tribunal: Tribunal.TRF1, risco: Risco.BAIXO, grau: Grau.PRIMEIRO, fase: "ag_alegacoes_finais" },
  { numero: "0007822-03.2026.8.17.1001", entidade: "Sertão Transportes Ltda.", tipo: TipoProcesso.IMPROBIDADE, gestor: "Camila Diniz", tribunal: Tribunal.TJPE, risco: Risco.ALTO, grau: Grau.SUPERIOR, fase: "julgamento_superior" },
  { numero: "0806201-88.2026.4.05.8000", entidade: "Construtora Atlas Nordeste", tipo: TipoProcesso.ACP, gestor: "Thiago Nóbrega", tribunal: Tribunal.TRF5, risco: Risco.MEDIO, grau: Grau.PRIMEIRO, fase: "audiencia_agendada" },
  { numero: "1011145-72.2026.4.01.3000", entidade: "Associação Mãos Unidas", tipo: TipoProcesso.CRIMINAL, gestor: "Verônica Souto", tribunal: Tribunal.TRF1, risco: Risco.BAIXO, grau: Grau.PRIMEIRO, fase: "aguardando_contestacao" },
  { numero: "0006635-29.2026.8.17.5001", entidade: "Município de Boa Esperança", tipo: TipoProcesso.ACP, gestor: "Felipe Gusmão", tribunal: Tribunal.TJPE, risco: Risco.ALTO, grau: Grau.PRIMEIRO, fase: "aguardando_contestacao" },
  { numero: "0807310-14.2026.4.05.8600", entidade: "Rede Mercantil do Nordeste", tipo: TipoProcesso.IMPROBIDADE, gestor: "Juliana Tavares", tribunal: Tribunal.TRF5, risco: Risco.MEDIO, grau: Grau.SEGUNDO, fase: "pauta_julgamento" },
  { numero: "1012289-46.2026.4.01.3500", entidade: "Laboratório Vida e Saúde", tipo: TipoProcesso.ACP, gestor: "Gustavo Barreto", tribunal: Tribunal.TRF1, risco: Risco.BAIXO, grau: Grau.PRIMEIRO, fase: "prazo_provas" },
  { numero: "0009120-80.2026.8.17.6001", entidade: "Porto Azul Logística", tipo: TipoProcesso.CRIMINAL, gestor: "Isabela Pimentel", tribunal: Tribunal.TJPE, risco: Risco.ALTO, grau: Grau.SEGUNDO, fase: "julgamento_2grau" },
  { numero: "0808427-59.2026.4.05.8700", entidade: "Instituto Viver Melhor", tipo: TipoProcesso.ACP, gestor: "Leonardo Mota", tribunal: Tribunal.TRF5, risco: Risco.MEDIO, grau: Grau.SUPERIOR, fase: "admissibilidade_sup" },
  { numero: "1013344-11.2026.4.01.3600", entidade: "Município de Riacho Fundo", tipo: TipoProcesso.IMPROBIDADE, gestor: "Patrícia Cunha", tribunal: Tribunal.TRF1, risco: Risco.ALTO, grau: Grau.PRIMEIRO, fase: "contestacao_apresentada" },
  { numero: "0010334-54.2026.8.17.7001", entidade: "Comércio Ferreira e Filhos", tipo: TipoProcesso.ACP, gestor: "André Luiz Cabral", tribunal: Tribunal.TJPE, risco: Risco.BAIXO, grau: Grau.PRIMEIRO, fase: "concluso_julgamento" },
  { numero: "0809531-07.2026.4.05.8800", entidade: "Santa Luzia Participações", tipo: TipoProcesso.CRIMINAL, gestor: "Mirela Cardoso", tribunal: Tribunal.TRF5, risco: Risco.MEDIO, grau: Grau.PRIMEIRO, fase: "aguardando_contestacao" },
  { numero: "1014478-68.2026.4.01.3700", entidade: "Município de Lagoa Serena", tipo: TipoProcesso.ACP, gestor: "Rafael Peixoto", tribunal: Tribunal.TRF1, risco: Risco.ALTO, grau: Grau.SEGUNDO, fase: "pauta_julgamento" },
  { numero: "0011449-21.2026.8.17.8001", entidade: "Verde Mar Engenharia Ambiental", tipo: TipoProcesso.IMPROBIDADE, gestor: "Fernanda Albuquerque", tribunal: Tribunal.TJPE, risco: Risco.MEDIO, grau: Grau.PRIMEIRO, fase: "alegacoes_finais_apres" },
  { numero: "0810642-43.2026.4.05.8900", entidade: "Fundação Novo Amanhã", tipo: TipoProcesso.ACP, gestor: "Otávio Meireles", tribunal: Tribunal.TRF5, risco: Risco.BAIXO, grau: Grau.SEGUNDO, fase: "julgamento_2grau" },
  { numero: "1015590-25.2026.4.01.3800", entidade: "Consórcio Integra Brasil", tipo: TipoProcesso.CRIMINAL, gestor: "Larissa Monteiro", tribunal: Tribunal.TRF1, risco: Risco.ALTO, grau: Grau.SUPERIOR, fase: "julgamento_superior" },
];

function gerarCpf(i: number): string {
  const n = String(i).padStart(3, "0");
  return `000.000.${n}-00`;
}

function municipioDe(entidade: string, tribunal: Tribunal): string {
  const match = entidade.match(/Munic[íi]pio de (.+)/);
  if (match) return match[1].trim();
  if (tribunal === Tribunal.TJPE || tribunal === Tribunal.TRF5) return "Recife";
  if (tribunal === Tribunal.TRF1) return "Brasília";
  return "Recife";
}

function cargoDe(entidade: string): string {
  if (entidade.startsWith("Município")) return "Prefeito";
  if (/Fundação|Cooperativa|Associação/.test(entidade)) return "Presidente";
  if (/Instituto|Consórcio/.test(entidade)) return "Diretor executivo";
  if (/Hospital|Clínica|Laboratório/.test(entidade)) return "Diretor";
  if (/Grupo|Rede|Comércio/.test(entidade)) return "Sócio administrador";
  return "Administrador";
}

function juizoDe(tribunal: Tribunal, grau: Grau, tipo: TipoProcesso, i: number): string {
  const vara = (i % 5) + 1;
  const camara = (i % 8) + 1;
  if (grau === Grau.SUPERIOR) {
    return `STJ - ${(i % 6) + 1}a Turma`;
  }
  if (grau === Grau.SEGUNDO) {
    if (tribunal === Tribunal.TJPE) {
      return `TJPE - ${camara}a Câmara ${tipo === TipoProcesso.CRIMINAL ? "Criminal" : "de Direito Público"}`;
    }
    return `${tribunal} - ${camara}a Turma`;
  }
  // PRIMEIRO
  if (tribunal === Tribunal.TJPE) {
    if (tipo === TipoProcesso.CRIMINAL) return `${vara}a Vara Criminal de Recife`;
    return `${vara}a Vara da Fazenda Pública de Recife`;
  }
  if (tribunal === Tribunal.TRF5) {
    return `${vara}a Vara Federal de Pernambuco`;
  }
  if (tribunal === Tribunal.TRF1) {
    return `${vara}a Vara Federal do Distrito Federal`;
  }
  return `${vara}a Vara`;
}

function objetoDe(tipo: TipoProcesso, entidade: string): string {
  switch (tipo) {
    case TipoProcesso.IMPROBIDADE:
      return `Ação de improbidade administrativa envolvendo ${entidade}. Apura-se suposta violação dos princípios da Administração Pública, com pedido de aplicação das sanções do art. 12 da Lei 8.429/92.`;
    case TipoProcesso.ACP:
      return `Ação civil pública proposta em face de ${entidade}, questionando conduta com potencial impacto coletivo e pedindo obrigação de fazer/não fazer e reparação de danos.`;
    case TipoProcesso.CRIMINAL:
      return `Ação penal em face de representantes de ${entidade}, imputando prática de crimes contra a administração pública e o patrimônio.`;
  }
}

function valorDe(risco: Risco, tipo: TipoProcesso, i: number): number | null {
  if (tipo === TipoProcesso.CRIMINAL) return null;
  const base = risco === Risco.ALTO ? 1_500_000 : risco === Risco.MEDIO ? 500_000 : 120_000;
  return base + i * 12500;
}

type AndamentoTemplate = { fase: string; resultado: string | null; texto: string };

function historicoDe(fase: string): AndamentoTemplate[] {
  switch (fase) {
    case "contestacao_apresentada":
      return [
        { fase: "Distribuicao", resultado: null, texto: "Processo distribuido por sorteio." },
        { fase: "Citacao", resultado: null, texto: "Citacao cumprida; parte re ciente dos termos da inicial." },
        { fase: "Contestacao", resultado: null, texto: "Contestacao apresentada tempestivamente, com preliminares e merito." },
      ];
    case "aguardando_contestacao":
      return [
        { fase: "Distribuicao", resultado: null, texto: "Processo distribuido e autuado." },
        { fase: "Citacao", resultado: null, texto: "Mandado de citacao expedido; aguardando fluencia do prazo de defesa." },
      ];
    case "recurso_interposto":
      return [
        { fase: "Sentenca", resultado: "Parcial procedencia", texto: "Sentenca prolatada com acolhimento parcial dos pedidos iniciais." },
        { fase: "Recurso", resultado: null, texto: "Interposto recurso de apelacao no prazo legal, com pedido de efeito suspensivo." },
      ];
    case "contrarrazoes_apres":
      return [
        { fase: "Sentenca", resultado: "Procedencia", texto: "Sentenca de procedencia em primeiro grau." },
        { fase: "Apelacao", resultado: null, texto: "Apelacao interposta pela parte contraria." },
        { fase: "Contrarrazoes", resultado: null, texto: "Contrarrazoes apresentadas no prazo legal, rebatendo os argumentos recursais." },
      ];
    case "prazo_provas":
      return [
        { fase: "Distribuicao", resultado: null, texto: "Processo distribuido." },
        { fase: "Saneador", resultado: null, texto: "Decisao saneadora publicada delimitando os pontos controvertidos." },
        { fase: "Provas", resultado: null, texto: "Aberto prazo comum para especificacao das provas a serem produzidas." },
      ];
    case "admissibilidade_sup":
      return [
        { fase: "Acordao", resultado: "Improvimento parcial", texto: "Acordao publicado em segundo grau." },
        { fase: "Recurso especial", resultado: null, texto: "Recurso especial interposto com fundamento no art. 105, III, da CF." },
        { fase: "Admissibilidade", resultado: null, texto: "Autos conclusos para juizo de admissibilidade no tribunal superior." },
      ];
    case "audiencia_agendada":
      return [
        { fase: "Distribuicao", resultado: null, texto: "Processo distribuido e autuado regularmente." },
        { fase: "Contestacao", resultado: null, texto: "Contestacao recebida; juntada aos autos." },
        { fase: "Audiencia", resultado: null, texto: "Audiencia de instrucao e julgamento designada." },
      ];
    case "sentenca":
      return [
        { fase: "Instrucao", resultado: null, texto: "Instrucao encerrada apos oitiva das testemunhas." },
        { fase: "Conclusao", resultado: null, texto: "Autos conclusos para sentenca." },
        { fase: "Sentenca", resultado: "Procedencia parcial", texto: "Sentenca prolatada com procedencia parcial dos pedidos." },
      ];
    case "julgamento_ed_2grau":
      return [
        { fase: "Acordao", resultado: "Desprovimento", texto: "Acordao publicado negando provimento ao recurso." },
        { fase: "Embargos", resultado: null, texto: "Opostos embargos de declaracao apontando omissoes." },
        { fase: "Pauta", resultado: null, texto: "Embargos de declaracao incluidos em pauta para julgamento." },
      ];
    case "ag_alegacoes_finais":
      return [
        { fase: "Saneador", resultado: null, texto: "Decisao saneadora publicada." },
        { fase: "Instrucao", resultado: null, texto: "Audiencia de instrucao realizada com oitiva de testemunhas." },
        { fase: "Alegacoes finais", resultado: null, texto: "Aberto prazo comum para alegacoes finais." },
      ];
    case "julgamento_superior":
      return [
        { fase: "Admissibilidade", resultado: "Admitido", texto: "Recurso especial admitido no tribunal de origem." },
        { fase: "Pauta", resultado: null, texto: "Processo incluido em pauta de julgamento no tribunal superior." },
        { fase: "Julgamento", resultado: null, texto: "Julgamento iniciado; proferido voto do relator." },
      ];
    case "pauta_julgamento":
      return [
        { fase: "Acordao", resultado: null, texto: "Autos remetidos ao tribunal apos recurso." },
        { fase: "Distribuicao", resultado: null, texto: "Processo distribuido no segundo grau." },
        { fase: "Pauta", resultado: null, texto: "Processo incluido em pauta de julgamento." },
      ];
    case "julgamento_2grau":
      return [
        { fase: "Apelacao", resultado: null, texto: "Apelacao interposta." },
        { fase: "Contrarrazoes", resultado: null, texto: "Contrarrazoes apresentadas." },
        { fase: "Julgamento", resultado: "Parcialmente provido", texto: "Julgamento realizado em segundo grau com acordao publicado." },
      ];
    case "alegacoes_finais_apres":
      return [
        { fase: "Instrucao", resultado: null, texto: "Audiencia de instrucao encerrada." },
        { fase: "Alegacoes finais", resultado: null, texto: "Aberto prazo para alegacoes finais." },
        { fase: "Alegacoes finais apresentadas", resultado: null, texto: "Alegacoes finais protocoladas tempestivamente." },
      ];
    case "concluso_julgamento":
      return [
        { fase: "Instrucao", resultado: null, texto: "Instrucao encerrada." },
        { fase: "Alegacoes finais", resultado: null, texto: "Alegacoes finais apresentadas pelas partes." },
        { fase: "Conclusao", resultado: null, texto: "Autos conclusos para julgamento." },
      ];
    default:
      return [
        { fase: "Distribuicao", resultado: null, texto: "Processo distribuido." },
        { fase: fase, resultado: null, texto: `Andamento referente a fase ${fase}.` },
      ];
  }
}

function addDias(data: Date, dias: number): Date {
  const d = new Date(data);
  d.setDate(d.getDate() + dias);
  return d;
}

async function main() {
  console.log("Limpando gestores, processos, andamentos, prazos e documentos...");
  await prisma.documento.deleteMany();
  await prisma.prazo.deleteMany();
  await prisma.andamento.deleteMany();
  await prisma.processo.deleteMany();
  await prisma.gestor.deleteMany();

  console.log("Garantindo escritorio e admin...");
  const escritorio = await prisma.escritorio.upsert({
    where: { cnpj: "12.345.678/0001-99" },
    update: {},
    create: {
      nome: "Escritorio Modelo Advocacia",
      cnpj: "12.345.678/0001-99",
    },
  });

  const senhaHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@escritorio.com" },
    update: {},
    create: {
      email: "admin@escritorio.com",
      nome: "Administrador",
      senha: senhaHash,
      role: Role.ADMIN,
      escritorioId: escritorio.id,
    },
  });

  console.log("Criando 30 gestores...");
  const gestores = await Promise.all(
    DADOS.map((row, i) =>
      prisma.gestor.create({
        data: {
          nome: row.gestor,
          cpf: gerarCpf(i + 1),
          municipio: municipioDe(row.entidade, row.tribunal),
          cargo: cargoDe(row.entidade),
          observacoes: row.entidade,
          escritorioId: escritorio.id,
        },
      }),
    ),
  );

  console.log("Criando 30 processos com andamentos...");
  const processosCriados: { id: string; fase: string }[] = [];

  for (let i = 0; i < DADOS.length; i++) {
    const row = DADOS[i];
    const gestor = gestores[i];
    // Distribuicao entre 2025-08-01 e 2026-02-28 (antes de hoje 2026-04-22)
    const mesBase = 7 + (i % 7); // 7 = agosto
    const ano = mesBase >= 12 ? 2026 : 2025;
    const mes = mesBase >= 12 ? mesBase - 12 : mesBase;
    const dia = ((i * 3) % 27) + 1;
    const dataDistribuicao = new Date(Date.UTC(ano, mes, dia));

    const processo = await prisma.processo.create({
      data: {
        numero: row.numero,
        tipo: row.tipo,
        tribunal: row.tribunal,
        juizo: juizoDe(row.tribunal, row.grau, row.tipo, i),
        grau: row.grau,
        fase: row.fase,
        resultado: null,
        risco: row.risco,
        valor: valorDe(row.risco, row.tipo, i),
        dataDistribuicao,
        objeto: objetoDe(row.tipo, row.entidade),
        gestorId: gestor.id,
        advogadoId: admin.id,
        escritorioId: escritorio.id,
      },
    });

    const historico = historicoDe(row.fase);
    const espacamento = Math.max(20, Math.floor(200 / historico.length));
    await prisma.andamento.createMany({
      data: historico.map((a, idx) => ({
        processoId: processo.id,
        data: addDias(dataDistribuicao, idx * espacamento + 5),
        grau: row.grau,
        fase: a.fase,
        resultado: a.resultado,
        texto: a.texto,
        autorId: admin.id,
      })),
    });

    processosCriados.push({ id: processo.id, fase: row.fase });
  }

  console.log("Criando prazos nos proximos 30 dias...");
  const hoje = new Date("2026-04-22T00:00:00Z");
  const prazosConfig: { tipo: string; dias: number; hora: string; origem: string; observacoes: string }[] = [
    { tipo: "Contestacao", dias: 3, hora: "17:00", origem: "aguardando_contestacao", observacoes: "Prazo de 30 dias para apresentacao de contestacao." },
    { tipo: "Especificacao de provas", dias: 5, hora: "17:00", origem: "prazo_provas", observacoes: "Prazo comum para especificacao de provas a produzir." },
    { tipo: "Audiencia de instrucao", dias: 8, hora: "14:00", origem: "audiencia_agendada", observacoes: "Audiencia designada pelo juizo." },
    { tipo: "Alegacoes finais", dias: 12, hora: "18:00", origem: "ag_alegacoes_finais", observacoes: "Prazo de 15 dias para alegacoes finais." },
    { tipo: "Contrarrazoes", dias: 15, hora: "18:00", origem: "contrarrazoes_apres", observacoes: "Prazo para apresentacao de contrarrazoes recursais." },
    { tipo: "Sustentacao oral", dias: 18, hora: "10:00", origem: "pauta_julgamento", observacoes: "Sustentacao oral na sessao de julgamento." },
    { tipo: "Memoriais", dias: 21, hora: "17:00", origem: "julgamento_superior", observacoes: "Memoriais a serem protocolados antes da sessao de julgamento." },
    { tipo: "Embargos de declaracao", dias: 24, hora: "18:00", origem: "julgamento_2grau", observacoes: "Prazo para oposicao de embargos de declaracao." },
    { tipo: "Manifestacao sobre laudo", dias: 28, hora: "17:00", origem: "prazo_provas", observacoes: "Manifestacao sobre laudo pericial." },
  ];

  for (const p of prazosConfig) {
    const matching = processosCriados.filter((pc) => pc.fase === p.origem);
    const processoId = (matching[0] ?? processosCriados[0]).id;
    await prisma.prazo.create({
      data: {
        processoId,
        tipo: p.tipo,
        data: addDias(hoje, p.dias),
        hora: p.hora,
        observacoes: p.observacoes,
        cumprido: false,
        geradoAuto: true,
        origemFase: p.origem,
      },
    });
  }

  const totais = await Promise.all([
    prisma.escritorio.count(),
    prisma.user.count(),
    prisma.gestor.count(),
    prisma.processo.count(),
    prisma.andamento.count(),
    prisma.prazo.count(),
  ]);

  console.log("Seed concluido.");
  console.log(`Admin: ${admin.email} / admin123 (escritorio: ${escritorio.nome})`);
  console.log(
    `Totais -> escritorios: ${totais[0]}, users: ${totais[1]}, gestores: ${totais[2]}, processos: ${totais[3]}, andamentos: ${totais[4]}, prazos: ${totais[5]}`,
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
