import {
  PrismaClient,
  Role,
  TipoProcesso,
  Tribunal,
  Grau,
  Risco,
  TipoProcessoTce,
  CamaraTce,
} from "@prisma/client";
import bcrypt from "bcryptjs";

import { fasesDoTipo, prazoAutomaticoDaFase } from "../lib/tce-config";

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
  await prisma.itemPauta.deleteMany();
  await prisma.sessaoPauta.deleteMany();
  await prisma.prazoTce.deleteMany();
  await prisma.andamentoTce.deleteMany();
  await prisma.interessadoProcessoTce.deleteMany();
  await prisma.processoTce.deleteMany();
  await prisma.historicoGestao.deleteMany();
  await prisma.municipio.deleteMany();
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

  console.log("Garantindo advogados...");
  const advogadosBase: { nome: string; email: string }[] = [
    { nome: "Gabriel Moura", email: "gabriel.moura@escritorio.com" },
    { nome: "Henrique Arruda", email: "henrique.arruda@escritorio.com" },
    { nome: "Heloisa Cavalcanti", email: "heloisa.cavalcanti@escritorio.com" },
    { nome: "Mateus Lisboa", email: "mateus.lisboa@escritorio.com" },
    { nome: "Filipe Campos", email: "filipe.campos@escritorio.com" },
    { nome: "Carlos Porto", email: "carlos.porto@escritorio.com" },
    { nome: "Julio Rodrigues", email: "julio.rodrigues@escritorio.com" },
  ];
  const senhaAdv = await bcrypt.hash("adv123", 10);
  const advogados = await Promise.all(
    advogadosBase.map((a) =>
      prisma.user.upsert({
        where: { email: a.email },
        update: {
          nome: a.nome,
          senha: senhaAdv,
          role: Role.ADVOGADO,
          escritorioId: escritorio.id,
        },
        create: {
          email: a.email,
          nome: a.nome,
          senha: senhaAdv,
          role: Role.ADVOGADO,
          escritorioId: escritorio.id,
        },
      }),
    ),
  );

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

  for (let idx = 0; idx < prazosConfig.length; idx++) {
    const p = prazosConfig[idx];
    const matching = processosCriados.filter((pc) => pc.fase === p.origem);
    const processoId = (matching[0] ?? processosCriados[0]).id;
    const adv = advogados[idx % advogados.length];
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
        advogadoRespId: adv.id,
      },
    });
  }

  console.log("Criando 10 gestores adicionais para TCE...");
  const gestoresTceData: { nome: string; cargo: string; municipio: string }[] = [
    { nome: "Jose Ribamar Andrade", cargo: "Prefeito", municipio: "Barra do Jacare" },
    { nome: "Marta Albuquerque Pinho", cargo: "Ex-Prefeita", municipio: "Serra Dourada" },
    { nome: "Antonio Carvalho Sa", cargo: "Prefeito", municipio: "Pocao de Cima" },
    { nome: "Clara Beltrao Rego", cargo: "Secretaria de Saude", municipio: "Serra Dourada" },
    { nome: "Ricardo Azevedo Lopes", cargo: "Ordenador de Despesas", municipio: "Pocao de Cima" },
    { nome: "Beatriz Ferraz Lins", cargo: "Prefeita", municipio: "Campo do Horizonte" },
    { nome: "Elton Marinho Correia", cargo: "Controlador Municipal", municipio: "Barra do Jacare" },
    { nome: "Silvana Oliveira Tavares", cargo: "Secretaria de Educacao", municipio: "Campo do Horizonte" },
    { nome: "Paulo Menezes Coelho", cargo: "Presidente da Camara", municipio: "Olho d'Agua das Minas" },
    { nome: "Rosana Torres Siqueira", cargo: "Ex-Prefeita", municipio: "Olho d'Agua das Minas" },
  ];

  const gestoresTce = await Promise.all(
    gestoresTceData.map((g, i) =>
      prisma.gestor.create({
        data: {
          nome: g.nome,
          cpf: `111.222.${String(i + 1).padStart(3, "0")}-00`,
          municipio: g.municipio,
          cargo: g.cargo,
          observacoes: `Interessado em processos do TCE - ${g.municipio}`,
          escritorioId: escritorio.id,
        },
      }),
    ),
  );

  console.log("Criando 5 municipios...");
  const municipiosData: {
    nome: string;
    uf: string;
    cnpjPrefeitura: string;
    observacoes: string;
  }[] = [
    {
      nome: "Barra do Jacare",
      uf: "PE",
      cnpjPrefeitura: "10.111.222/0001-10",
      observacoes: "Interior do agreste, populacao estimada 28 mil habitantes.",
    },
    {
      nome: "Serra Dourada",
      uf: "PE",
      cnpjPrefeitura: "10.222.333/0001-20",
      observacoes: "Regiao do sertao central, auditoria recorrente do TCE.",
    },
    {
      nome: "Pocao de Cima",
      uf: "PE",
      cnpjPrefeitura: "10.333.444/0001-30",
      observacoes: "Municipio em regime de emergencia financeira em 2025.",
    },
    {
      nome: "Campo do Horizonte",
      uf: "PE",
      cnpjPrefeitura: "10.444.555/0001-40",
      observacoes: "Economia agricola; auditorias em folha de pagamento.",
    },
    {
      nome: "Olho d'Agua das Minas",
      uf: "PE",
      cnpjPrefeitura: "10.555.666/0001-50",
      observacoes: "Alta rotatividade de gestores nos ultimos anos.",
    },
  ];

  const municipios = await Promise.all(
    municipiosData.map((m) =>
      prisma.municipio.create({
        data: {
          nome: m.nome,
          uf: m.uf,
          cnpjPrefeitura: m.cnpjPrefeitura,
          observacoes: m.observacoes,
          escritorioId: escritorio.id,
        },
      }),
    ),
  );

  const municipioByNome = new Map(municipios.map((m) => [m.nome, m]));
  const gestorByMunicipio = new Map<string, typeof gestoresTce>();
  for (const g of gestoresTce) {
    const lista = gestorByMunicipio.get(g.municipio) ?? [];
    lista.push(g);
    gestorByMunicipio.set(g.municipio, lista);
  }

  console.log("Criando historico de gestao dos municipios...");
  for (const m of municipios) {
    const vinculos = gestorByMunicipio.get(m.nome) ?? [];
    for (let idx = 0; idx < vinculos.length; idx++) {
      const g = vinculos[idx];
      const anoInicio = 2021 + idx;
      const dataInicio = new Date(Date.UTC(anoInicio, 0, 1));
      const encerrado = idx < vinculos.length - 1;
      await prisma.historicoGestao.create({
        data: {
          municipioId: m.id,
          gestorId: g.id,
          cargo: g.cargo,
          dataInicio,
          dataFim: encerrado ? new Date(Date.UTC(anoInicio + 1, 11, 31)) : null,
        },
      });
    }
  }

  console.log("Criando 15 processos TCE...");
  type TceRow = {
    numero: string;
    tipo: TipoProcessoTce;
    municipio: string;
    relator: string | null;
    camara: CamaraTce;
    fase: string;
    exercicio: string | null;
    valor: number | null;
    objeto: string;
    conselheiroSubstituto?: string;
    notaTecnica?: boolean;
    parecerMpco?: boolean;
    despachadoComRelator?: boolean;
    memorialPronto?: boolean;
  };

  const TCE_ROWS: TceRow[] = [
    {
      numero: "TCE-PE 24.0001-5",
      tipo: "PRESTACAO_CONTAS_GOVERNO",
      municipio: "Barra do Jacare",
      relator: "Ranilson Ramos",
      camara: "PRIMEIRA",
      fase: "defesa_previa",
      exercicio: "2023",
      valor: 182_400_000,
      objeto:
        "Prestacao de contas anual de governo do chefe do Executivo municipal referente ao exercicio de 2023.",
      notaTecnica: true,
    },
    {
      numero: "TCE-PE 24.0015-2",
      tipo: "PRESTACAO_CONTAS_GESTAO",
      municipio: "Serra Dourada",
      relator: "Eduardo Porto",
      camara: "SEGUNDA",
      fase: "defesa_apresentada",
      exercicio: "2023",
      valor: 45_200_000,
      objeto:
        "Prestacao de contas de gestao da Secretaria Municipal de Saude, exercicio 2023.",
      notaTecnica: true,
      parecerMpco: true,
    },
    {
      numero: "TCE-PE 24.0034-9",
      tipo: "AUDITORIA_ESPECIAL",
      municipio: "Pocao de Cima",
      relator: "Marcos Loreto",
      camara: "SEGUNDA",
      fase: "acordao_1",
      exercicio: "2022",
      valor: 9_800_000,
      objeto:
        "Auditoria especial sobre execucao de contratos de coleta de residuos solidos.",
      notaTecnica: true,
      parecerMpco: true,
      despachadoComRelator: true,
      memorialPronto: true,
    },
    {
      numero: "TCE-PE 24.0047-7",
      tipo: "RGF",
      municipio: "Campo do Horizonte",
      relator: "Rodrigo Novaes",
      camara: "PRIMEIRA",
      fase: "defesa_previa",
      exercicio: "2024",
      valor: null,
      objeto:
        "Analise do Relatorio de Gestao Fiscal do 2o quadrimestre de 2024.",
    },
    {
      numero: "TCE-PE 24.0059-1",
      tipo: "AUTO_INFRACAO",
      municipio: "Olho d'Agua das Minas",
      relator: "Valdecir Pascoal",
      camara: "SEGUNDA",
      fase: "embargos_1",
      exercicio: "2023",
      valor: 2_400_000,
      objeto:
        "Auto de infracao lavrado em razao de contratacoes diretas sem licitacao.",
      notaTecnica: true,
      memorialPronto: true,
    },
    {
      numero: "TCE-PE 24.0071-3",
      tipo: "MEDIDA_CAUTELAR",
      municipio: "Pocao de Cima",
      relator: "Dirceu Rodolfo",
      camara: "PRIMEIRA",
      fase: "manifestacao_previa",
      exercicio: "2025",
      valor: 1_800_000,
      objeto:
        "Medida cautelar para suspensao de pregao eletronico com indicios de direcionamento.",
      conselheiroSubstituto: "Alda Magalhaes",
    },
    {
      numero: "TCE-PE 24.0083-8",
      tipo: "MEDIDA_CAUTELAR",
      municipio: "Serra Dourada",
      relator: "Eduardo Porto",
      camara: "SEGUNDA",
      fase: "decisao_monocratica",
      exercicio: "2025",
      valor: 3_600_000,
      objeto:
        "Medida cautelar determinando retencao de pagamentos em contrato de obra.",
      conselheiroSubstituto: "Marcos Flavio",
    },
    {
      numero: "TCE-PE 24.0099-4",
      tipo: "PRESTACAO_CONTAS_GOVERNO",
      municipio: "Campo do Horizonte",
      relator: "Carlos Neves",
      camara: "PLENO",
      fase: "recurso_ordinario",
      exercicio: "2022",
      valor: 220_000_000,
      objeto:
        "Recurso ordinario contra parecer previo pela rejeicao das contas anuais.",
      notaTecnica: true,
      parecerMpco: true,
      despachadoComRelator: true,
    },
    {
      numero: "TCE-PE 24.0108-6",
      tipo: "PRESTACAO_CONTAS_GESTAO",
      municipio: "Barra do Jacare",
      relator: "Ranilson Ramos",
      camara: "PRIMEIRA",
      fase: "acordao_embargos_1",
      exercicio: "2022",
      valor: 58_900_000,
      objeto:
        "Prestacao de contas de gestao da Secretaria de Obras, com apontamentos de sobrepreco.",
      notaTecnica: true,
      parecerMpco: true,
      memorialPronto: true,
    },
    {
      numero: "TCE-PE 24.0121-0",
      tipo: "AUDITORIA_ESPECIAL",
      municipio: "Serra Dourada",
      relator: "Marcos Loreto",
      camara: "SEGUNDA",
      fase: "acordao_ro",
      exercicio: "2021",
      valor: 12_500_000,
      objeto:
        "Auditoria especial em folha de pagamento com identificacao de acumulo indevido de cargos.",
      notaTecnica: true,
      parecerMpco: true,
    },
    {
      numero: "TCE-PE 24.0135-7",
      tipo: "RGF",
      municipio: "Olho d'Agua das Minas",
      relator: "Rodrigo Novaes",
      camara: "PRIMEIRA",
      fase: "defesa_apresentada",
      exercicio: "2024",
      valor: null,
      objeto:
        "Relatorio de Gestao Fiscal do 3o quadrimestre de 2024 com alerta de limite prudencial.",
      notaTecnica: true,
    },
    {
      numero: "TCE-PE 24.0152-4",
      tipo: "AUTO_INFRACAO",
      municipio: "Campo do Horizonte",
      relator: "Valdecir Pascoal",
      camara: "SEGUNDA",
      fase: "defesa_previa",
      exercicio: "2024",
      valor: 1_250_000,
      objeto:
        "Auto de infracao pela ausencia de publicacao de relatorios bimestrais.",
    },
    {
      numero: "TCE-PE 24.0164-9",
      tipo: "PRESTACAO_CONTAS_GOVERNO",
      municipio: "Olho d'Agua das Minas",
      relator: "Carlos Neves",
      camara: "PLENO",
      fase: "transitado",
      exercicio: "2021",
      valor: 149_800_000,
      objeto:
        "Prestacao de contas de governo transitada em julgado com recomendacoes.",
      notaTecnica: true,
      parecerMpco: true,
      despachadoComRelator: true,
      memorialPronto: true,
    },
    {
      numero: "TCE-PE 24.0178-2",
      tipo: "MEDIDA_CAUTELAR",
      municipio: "Campo do Horizonte",
      relator: "Dirceu Rodolfo",
      camara: "PRIMEIRA",
      fase: "agravo_regimental",
      exercicio: "2024",
      valor: 4_200_000,
      objeto:
        "Agravo regimental contra decisao monocratica que suspendeu contrato emergencial.",
      conselheiroSubstituto: "Luiz Arcoverde",
    },
    {
      numero: "TCE-PE 24.0191-5",
      tipo: "AUDITORIA_ESPECIAL",
      municipio: "Barra do Jacare",
      relator: "Eduardo Porto",
      camara: "SEGUNDA",
      fase: "acordao_embargos_ro",
      exercicio: "2022",
      valor: 7_800_000,
      objeto:
        "Auditoria especial em convenio firmado com OSCIP, com glosa de valores.",
      notaTecnica: true,
      parecerMpco: true,
      despachadoComRelator: true,
      memorialPronto: true,
    },
  ];

  const hojeTce = new Date("2026-04-23T00:00:00Z");

  for (let i = 0; i < TCE_ROWS.length; i++) {
    const row = TCE_ROWS[i];
    const municipio = municipioByNome.get(row.municipio);
    if (!municipio) continue;

    const dataAutuacao = addDias(hojeTce, -(60 + i * 9));
    const dataIntimacao = addDias(dataAutuacao, 15);

    const processoTce = await prisma.processoTce.create({
      data: {
        numero: row.numero,
        tipo: row.tipo,
        municipioId: municipio.id,
        relator: row.relator,
        camara: row.camara,
        faseAtual: row.fase,
        conselheiroSubstituto: row.conselheiroSubstituto,
        notaTecnica: row.notaTecnica ?? false,
        parecerMpco: row.parecerMpco ?? false,
        despachadoComRelator: row.despachadoComRelator ?? false,
        memorialPronto: row.memorialPronto ?? false,
        exercicio: row.exercicio,
        valorAutuado: row.valor,
        objeto: row.objeto,
        dataAutuacao,
        dataIntimacao,
        escritorioId: escritorio.id,
      },
    });

    const vinculadosMunicipio = gestorByMunicipio.get(row.municipio) ?? [];
    for (const gestorInt of vinculadosMunicipio.slice(0, 2)) {
      await prisma.interessadoProcessoTce.create({
        data: {
          processoId: processoTce.id,
          gestorId: gestorInt.id,
          cargo: gestorInt.cargo,
        },
      });
    }

    const fases = fasesDoTipo(row.tipo);
    const faseAtualIdx = fases.findIndex((f) => f.key === row.fase);
    const historico = fases.slice(0, Math.max(1, faseAtualIdx + 1));
    for (let h = 0; h < historico.length; h++) {
      await prisma.andamentoTce.create({
        data: {
          processoId: processoTce.id,
          data: addDias(dataAutuacao, h * 14 + 3),
          fase: historico[h].key,
          descricao: `Andamento registrado - ${historico[h].label}.`,
          autorId: admin.id,
        },
      });
    }

    const prazoConfig = prazoAutomaticoDaFase(row.tipo, row.fase);
    if (prazoConfig) {
      const diasCorridos = Math.round(prazoConfig.diasUteis * 1.4);
      const vencimento = addDias(dataIntimacao, diasCorridos);
      const jaVenceu = vencimento < hojeTce;
      const advTce = advogados[i % advogados.length];
      await prisma.prazoTce.create({
        data: {
          processoId: processoTce.id,
          tipo: prazoConfig.tipo,
          dataIntimacao,
          dataVencimento: vencimento,
          diasUteis: prazoConfig.diasUteis,
          prorrogavel: prazoConfig.prorrogavel,
          cumprido: jaVenceu,
          advogadoRespId: advTce.id,
          observacoes: `Prazo gerado automaticamente da fase ${row.fase}.`,
        },
      });
    }
  }

  console.log("Criando 8 sessoes de pauta TCE em 3 semanas...");
  const processosTceExistentes = await prisma.processoTce.findMany({
    where: { escritorioId: escritorio.id },
    select: { id: true, numero: true, municipio: { select: { nome: true } } },
  });
  const processoPorNumero = new Map(
    processosTceExistentes.map((p) => [p.numero, p]),
  );

  type ItemSeed = {
    numeroProcesso: string;
    tituloProcesso?: string;
    municipio: string;
    exercicio?: string;
    relator: string;
    advogadoResp: string;
    situacao?: string;
    observacoes?: string;
    prognostico?: string;
    providencia?: string;
    retiradoDePauta?: boolean;
    pedidoVistas?: boolean;
    conselheiroVistas?: string;
    vincularProcessoTce?: boolean;
  };

  type SessaoSeed = {
    data: string;
    camara: CamaraTce;
    observacoesGerais?: string;
    itens: ItemSeed[];
  };

  const SESSOES: SessaoSeed[] = [
    // Semana 06/04 a 09/04/2026
    {
      data: "2026-04-07",
      camara: CamaraTce.PRIMEIRA,
      observacoesGerais: "Sessao ordinaria da 1a Camara.",
      itens: [
        {
          numeroProcesso: "TCE-PE 24.0001-5",
          tituloProcesso: "PCG Barra do Jacare 2023",
          municipio: "Barra do Jacare",
          exercicio: "2023",
          relator: "Ranilson Ramos",
          advogadoResp: "Gabriel Moura",
          situacao: "Defesa previa apresentada; aguardando julgamento.",
          prognostico: "Regularidade com ressalvas",
          providencia: "Sustentacao oral confirmada.",
          vincularProcessoTce: true,
        },
        {
          numeroProcesso: "TCE-PE 24.0108-6",
          tituloProcesso: "PCG Barra do Jacare Secretaria de Obras",
          municipio: "Barra do Jacare",
          exercicio: "2022",
          relator: "Ranilson Ramos",
          advogadoResp: "Henrique Arruda",
          situacao: "Memorial juntado na vespera.",
          observacoes: "Acordao ja com embargos de declaracao pendentes.",
          prognostico: "Julgamento remarcado possivel",
          vincularProcessoTce: true,
        },
        {
          numeroProcesso: "TCE-PE 24.0210-3",
          municipio: "Lagoa de Dentro",
          exercicio: "2024",
          relator: "Rodrigo Novaes",
          advogadoResp: "Heloisa Cavalcanti",
          prognostico: "Irregularidade parcial",
        },
      ],
    },
    {
      data: "2026-04-08",
      camara: CamaraTce.PLENO,
      observacoesGerais: "Sessao do Pleno - processos de maior complexidade.",
      itens: [
        {
          numeroProcesso: "TCE-PE 24.0099-4",
          tituloProcesso: "Recurso ordinario Campo do Horizonte",
          municipio: "Campo do Horizonte",
          exercicio: "2022",
          relator: "Carlos Neves",
          advogadoResp: "Mateus Lisboa",
          situacao: "Aguardando leitura do voto do relator.",
          prognostico: "Provimento parcial",
          providencia: "Memorial adicional entregue em 06/04.",
          vincularProcessoTce: true,
        },
        {
          numeroProcesso: "TCE-PE 24.0164-9",
          tituloProcesso: "PCG Olho d'Agua das Minas 2021",
          municipio: "Olho d'Agua das Minas",
          exercicio: "2021",
          relator: "Carlos Neves",
          advogadoResp: "Filipe Campos",
          situacao: "Transitado, recurso contra acordao recente.",
          pedidoVistas: true,
          conselheiroVistas: "Marcos Loreto",
          vincularProcessoTce: true,
        },
        {
          numeroProcesso: "TCE-PE 23.0887-1",
          municipio: "Serra Dourada",
          exercicio: "2020",
          relator: "Eduardo Porto",
          advogadoResp: "Carlos Porto",
          retiradoDePauta: true,
          observacoes: "Retirado por pedido do relator.",
        },
      ],
    },
    {
      data: "2026-04-09",
      camara: CamaraTce.SEGUNDA,
      itens: [
        {
          numeroProcesso: "TCE-PE 24.0015-2",
          tituloProcesso: "PCG Gestao Saude Serra Dourada",
          municipio: "Serra Dourada",
          exercicio: "2023",
          relator: "Eduardo Porto",
          advogadoResp: "Julio Rodrigues",
          situacao: "Defesa apresentada; parecer MPCO favoravel.",
          prognostico: "Regularidade com ressalvas",
          providencia: "Contrarrazoes protocoladas.",
          vincularProcessoTce: true,
        },
        {
          numeroProcesso: "TCE-PE 24.0034-9",
          tituloProcesso: "Auditoria Pocao de Cima - residuos solidos",
          municipio: "Pocao de Cima",
          exercicio: "2022",
          relator: "Marcos Loreto",
          advogadoResp: "Gabriel Moura",
          situacao: "Acordao proferido; aguardando embargos.",
          observacoes: "Memorial pronto, despacho com o relator realizado.",
          vincularProcessoTce: true,
        },
        {
          numeroProcesso: "TCE-PE 24.0121-0",
          tituloProcesso: "Auditoria folha Serra Dourada",
          municipio: "Serra Dourada",
          exercicio: "2021",
          relator: "Marcos Loreto",
          advogadoResp: "Heloisa Cavalcanti",
          vincularProcessoTce: true,
        },
        {
          numeroProcesso: "TCE-PE 24.0059-1",
          tituloProcesso: "Auto de infracao Olho d'Agua",
          municipio: "Olho d'Agua das Minas",
          exercicio: "2023",
          relator: "Valdecir Pascoal",
          advogadoResp: "Henrique Arruda",
          situacao: "Embargos em julgamento.",
          prognostico: "Acolhimento parcial dos embargos",
          vincularProcessoTce: true,
        },
      ],
    },
    // Semana 13/04 a 16/04/2026
    {
      data: "2026-04-13",
      camara: CamaraTce.PRIMEIRA,
      itens: [
        {
          numeroProcesso: "TCE-PE 24.0047-7",
          tituloProcesso: "RGF Campo do Horizonte 2Q 2024",
          municipio: "Campo do Horizonte",
          exercicio: "2024",
          relator: "Rodrigo Novaes",
          advogadoResp: "Mateus Lisboa",
          prognostico: "Regularidade",
          vincularProcessoTce: true,
        },
        {
          numeroProcesso: "TCE-PE 24.0071-3",
          tituloProcesso: "Cautelar Pocao de Cima - pregao eletronico",
          municipio: "Pocao de Cima",
          exercicio: "2025",
          relator: "Dirceu Rodolfo",
          advogadoResp: "Filipe Campos",
          situacao: "Manifestacao previa apresentada; aguardando decisao.",
          observacoes: "Pedido de tutela de urgencia feito em plantao.",
          vincularProcessoTce: true,
        },
        {
          numeroProcesso: "TCE-PE 24.0178-2",
          tituloProcesso: "Agravo regimental Campo do Horizonte",
          municipio: "Campo do Horizonte",
          exercicio: "2024",
          relator: "Dirceu Rodolfo",
          advogadoResp: "Carlos Porto",
          prognostico: "Desprovimento",
          pedidoVistas: true,
          conselheiroVistas: "Ranilson Ramos",
          vincularProcessoTce: true,
        },
      ],
    },
    {
      data: "2026-04-16",
      camara: CamaraTce.PLENO,
      observacoesGerais: "Sessao reduzida - apenas 1 item.",
      itens: [
        {
          numeroProcesso: "TCE-PE 22.4512-0",
          tituloProcesso: "Consulta formulada por prefeito sobre folha",
          municipio: "Barra do Jacare",
          relator: "Carlos Neves",
          advogadoResp: "Julio Rodrigues",
          situacao: "Consulta respondida pela area tecnica.",
          prognostico: "Resposta por acordao normativo",
        },
      ],
    },
    {
      data: "2026-04-16",
      camara: CamaraTce.SEGUNDA,
      itens: [
        {
          numeroProcesso: "TCE-PE 24.0191-5",
          tituloProcesso: "Auditoria convenio OSCIP Barra do Jacare",
          municipio: "Barra do Jacare",
          exercicio: "2022",
          relator: "Eduardo Porto",
          advogadoResp: "Heloisa Cavalcanti",
          situacao: "Acordao dos embargos pos-RO; aguardando leitura.",
          prognostico: "Manutencao da glosa",
          providencia: "Sustentacao oral.",
          vincularProcessoTce: true,
        },
      ],
    },
    // Semana 22/04 a 23/04/2026
    {
      data: "2026-04-22",
      camara: CamaraTce.PLENO,
      observacoesGerais: "Sessao extensa no Pleno.",
      itens: [
        {
          numeroProcesso: "TCE-PE 23.9982-4",
          tituloProcesso: "Recurso ordinario Serra Dourada 2019",
          municipio: "Serra Dourada",
          exercicio: "2019",
          relator: "Carlos Neves",
          advogadoResp: "Gabriel Moura",
          prognostico: "Provimento parcial",
          providencia: "Memorial entregue 20/04.",
        },
        {
          numeroProcesso: "TCE-PE 24.0083-8",
          tituloProcesso: "Cautelar Serra Dourada - retencao de pagamentos",
          municipio: "Serra Dourada",
          exercicio: "2025",
          relator: "Eduardo Porto",
          advogadoResp: "Mateus Lisboa",
          situacao: "Decisao monocratica em referendo do Pleno.",
          vincularProcessoTce: true,
        },
        {
          numeroProcesso: "TCE-PE 24.0152-4",
          tituloProcesso: "Auto de infracao Campo do Horizonte",
          municipio: "Campo do Horizonte",
          exercicio: "2024",
          relator: "Valdecir Pascoal",
          advogadoResp: "Filipe Campos",
          retiradoDePauta: true,
          observacoes: "Retirado apos pedido de prorrogacao da defesa.",
          vincularProcessoTce: true,
        },
        {
          numeroProcesso: "TCE-PE 22.7711-8",
          municipio: "Olho d'Agua das Minas",
          exercicio: "2020",
          relator: "Carlos Neves",
          advogadoResp: "Henrique Arruda",
          pedidoVistas: true,
          conselheiroVistas: "Dirceu Rodolfo",
        },
      ],
    },
    {
      data: "2026-04-23",
      camara: CamaraTce.SEGUNDA,
      itens: [
        {
          numeroProcesso: "TCE-PE 24.0135-7",
          tituloProcesso: "RGF Olho d'Agua das Minas 3Q 2024",
          municipio: "Olho d'Agua das Minas",
          exercicio: "2024",
          relator: "Rodrigo Novaes",
          advogadoResp: "Julio Rodrigues",
          situacao: "Alerta de limite prudencial; defesa apresentada.",
          prognostico: "Regularidade com ressalvas",
          vincularProcessoTce: true,
        },
      ],
    },
  ];

  for (const sessao of SESSOES) {
    const sessaoCriada = await prisma.sessaoPauta.create({
      data: {
        data: new Date(`${sessao.data}T00:00:00Z`),
        camara: sessao.camara,
        observacoesGerais: sessao.observacoesGerais ?? null,
        escritorioId: escritorio.id,
      },
    });
    for (let ordem = 0; ordem < sessao.itens.length; ordem++) {
      const item = sessao.itens[ordem];
      const processoVinculado = item.vincularProcessoTce
        ? processoPorNumero.get(item.numeroProcesso)
        : undefined;
      await prisma.itemPauta.create({
        data: {
          sessaoId: sessaoCriada.id,
          numeroProcesso: item.numeroProcesso,
          tituloProcesso: item.tituloProcesso ?? null,
          municipio: item.municipio,
          exercicio: item.exercicio ?? null,
          relator: item.relator,
          advogadoResp: item.advogadoResp,
          situacao: item.situacao ?? null,
          observacoes: item.observacoes ?? null,
          prognostico: item.prognostico ?? null,
          providencia: item.providencia ?? null,
          retiradoDePauta: item.retiradoDePauta ?? false,
          pedidoVistas: item.pedidoVistas ?? false,
          conselheiroVistas: item.conselheiroVistas ?? null,
          processoTceId: processoVinculado?.id ?? null,
          ordem,
        },
      });
    }
  }

  const totais = await Promise.all([
    prisma.escritorio.count(),
    prisma.user.count(),
    prisma.gestor.count(),
    prisma.processo.count(),
    prisma.andamento.count(),
    prisma.prazo.count(),
    prisma.municipio.count(),
    prisma.processoTce.count(),
    prisma.andamentoTce.count(),
    prisma.prazoTce.count(),
    prisma.sessaoPauta.count(),
    prisma.itemPauta.count(),
  ]);

  console.log("Seed concluido.");
  console.log(`Admin: ${admin.email} / admin123 (escritorio: ${escritorio.nome})`);
  console.log(
    `Judicial -> escritorios: ${totais[0]}, users: ${totais[1]}, gestores: ${totais[2]}, processos: ${totais[3]}, andamentos: ${totais[4]}, prazos: ${totais[5]}`,
  );
  console.log(
    `TCE -> municipios: ${totais[6]}, processos: ${totais[7]}, andamentos: ${totais[8]}, prazos: ${totais[9]}, sessoes pauta: ${totais[10]}, itens pauta: ${totais[11]}`,
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
