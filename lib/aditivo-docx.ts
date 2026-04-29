// Server-only: gera o .docx de Solicitacao de Aditivo Contratual
// usando o timbre (cabecalho/rodape/fonte/assinatura) do escritorio emissor.
//
// Imagens opcionais:
//   public/escritorios/<slug>/cabecalho.png  -> logo no cabecalho
//   public/escritorios/<slug>/rodape.png     -> logo no rodape
// Se nao existirem, geramos o documento sem imagens e logamos o caminho
// esperado no console do servidor.

import fs from "node:fs";
import path from "node:path";

import type { TipoAditivo } from "@prisma/client";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeightRule,
  ImageRun,
  LevelFormat,
  Packer,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  convertInchesToTwip,
  convertMillimetersToTwip,
} from "docx";

import {
  TIPO_ADITIVO_LABELS,
  formatBRL,
  NOMES_MESES_COMPLETO,
} from "@/lib/financeiro";
import {
  resolveEmissor,
  type AdvogadoEmissor,
  type EscritorioEmissor,
} from "@/lib/escritorios-emissores";

export type AditivoDocxInput = {
  contrato: {
    numeroContrato: string | null;
    objetoDoContrato: string | null;
    valorMensal: number;
    dataInicio: Date;
    dataFim: Date | null;
    municipio: { nome: string; uf: string } | null;
    orgaoContratante: string | null;
    cnpjContratante: string | null;
    representanteContratante: string | null;
    cargoRepresentante: string | null;
  };
  tipo: TipoAditivo;
  justificativa: string;
  fundamento: string;
  escritorioSlug: string;
  advogadoIdx: number;
};

function publicEscritorioFile(slug: string, fileName: string): string {
  return path.join(process.cwd(), "public", "escritorios", slug, fileName);
}

function safeReadFile(absPath: string): Buffer | null {
  try {
    if (!fs.existsSync(absPath)) {
      console.warn(
        "[aditivo-docx] imagem nao encontrada (continuando sem):",
        absPath,
      );
      return null;
    }
    return fs.readFileSync(absPath);
  } catch (err) {
    console.warn("[aditivo-docx] erro ao ler imagem:", absPath, err);
    return null;
  }
}

function lineSpacing(esp: number): number {
  // 240 = espacamento 1,0 no docx
  return Math.round(esp * 240);
}

function p(
  text: string,
  opts: {
    bold?: boolean;
    size?: number;
    align?: keyof typeof AlignmentType;
    font: string;
    espacamento: number;
    indent?: boolean;
  },
): Paragraph {
  return new Paragraph({
    alignment: opts.align ? AlignmentType[opts.align] : AlignmentType.JUSTIFIED,
    spacing: {
      line: lineSpacing(opts.espacamento),
      after: 120,
    },
    indent: opts.indent
      ? { firstLine: convertMillimetersToTwip(15) }
      : undefined,
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        font: opts.font,
        size: (opts.size ?? 24), // 24 = 12pt
      }),
    ],
  });
}

function heading(
  text: string,
  opts: { font: string; espacamento: number; size?: number },
): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: {
      line: lineSpacing(opts.espacamento),
      before: 240,
      after: 120,
    },
    children: [
      new TextRun({
        text,
        bold: true,
        font: opts.font,
        size: opts.size ?? 26, // 13pt
      }),
    ],
  });
}

function tituloDocumento(
  text: string,
  opts: { font: string; espacamento: number },
): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: {
      line: lineSpacing(opts.espacamento),
      before: 240,
      after: 240,
    },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        font: opts.font,
        size: 30, // 15pt
      }),
    ],
  });
}

function formatBR(d: Date): string {
  const dia = String(d.getUTCDate()).padStart(2, "0");
  const mes = NOMES_MESES_COMPLETO[d.getUTCMonth()];
  const ano = d.getUTCFullYear();
  return `${dia} de ${mes} de ${ano}`;
}

function buildHeader(
  escritorio: EscritorioEmissor,
): Header {
  const headerImg = safeReadFile(
    publicEscritorioFile(escritorio.slug, "cabecalho.png"),
  );
  const fallbackImg = headerImg
    ? null
    : safeReadFile(publicEscritorioFile(escritorio.slug, "header.png"));
  const img = headerImg ?? fallbackImg;

  if (img) {
    return new Header({
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: img,
              transformation: { width: 520, height: 90 },
              type: "png",
            }),
          ],
        }),
      ],
    });
  }

  // Sem imagem: usa nome do escritorio em texto
  console.warn(
    `[aditivo-docx] adicione imagem em public/escritorios/${escritorio.slug}/cabecalho.png para timbre completo.`,
  );
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: escritorio.nome.toUpperCase(),
            bold: true,
            font: escritorio.fonteDocx,
            size: 28,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: {
          bottom: { color: "1e3a5f", size: 8, style: BorderStyle.SINGLE },
        },
        children: [new TextRun({ text: "" })],
      }),
    ],
  });
}

function buildFooter(
  escritorio: EscritorioEmissor,
): Footer {
  const linhas: string[] = [];
  if (escritorio.endereco) linhas.push(escritorio.endereco);
  const contato: string[] = [];
  if (escritorio.telefone) contato.push(escritorio.telefone);
  if (escritorio.email) contato.push(escritorio.email);
  if (contato.length > 0) linhas.push(contato.join(" | "));

  const oabs = escritorio.advogados.map((a) => `${a.nome} - ${a.oab}`).join(" / ");
  if (oabs) linhas.push(oabs);

  const footerImg = safeReadFile(
    publicEscritorioFile(escritorio.slug, "rodape.png"),
  );
  const fallbackImg = footerImg
    ? null
    : safeReadFile(publicEscritorioFile(escritorio.slug, "footer.png"));
  const img = footerImg ?? fallbackImg;

  const children: Paragraph[] = [];

  if (img) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            data: img,
            transformation: { width: 520, height: 50 },
            type: "png",
          }),
        ],
      }),
    );
  }

  for (const linha of linhas) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: linha,
            font: escritorio.fonteDocx,
            size: 18, // 9pt
            color: "555555",
          }),
        ],
      }),
    );
  }

  if (children.length === 0) {
    // Sempre devolve algo para o Footer nao quebrar
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "" })],
      }),
    );
  }

  return new Footer({ children });
}

function buildContratoTable(
  contrato: AditivoDocxInput["contrato"],
  font: string,
): Table {
  const linhas: Array<[string, string]> = [
    ["Numero do contrato", contrato.numeroContrato ?? "(nao informado)"],
    [
      "Contratante",
      [
        contrato.orgaoContratante,
        contrato.municipio ? `${contrato.municipio.nome}/${contrato.municipio.uf}` : null,
      ]
        .filter(Boolean)
        .join(" - ") || "(nao informado)",
    ],
    ["CNPJ", contrato.cnpjContratante ?? "(nao informado)"],
    [
      "Representante",
      [contrato.representanteContratante, contrato.cargoRepresentante]
        .filter(Boolean)
        .join(", ") || "(nao informado)",
    ],
    ["Valor mensal", formatBRL(contrato.valorMensal)],
    [
      "Vigencia",
      `${formatBR(contrato.dataInicio)} a ${
        contrato.dataFim ? formatBR(contrato.dataFim) : "indeterminado"
      }`,
    ],
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: linhas.map(
      ([k, v]) =>
        new TableRow({
          height: { value: convertMillimetersToTwip(7), rule: HeightRule.ATLEAST },
          children: [
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: k, bold: true, font, size: 22 }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 70, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: v, font, size: 22 })],
                }),
              ],
            }),
          ],
        }),
    ),
  });
}

export async function gerarAditivoDocx(
  input: AditivoDocxInput,
): Promise<{ buffer: Buffer; nomeArquivo: string }> {
  const emissor = resolveEmissor(input.escritorioSlug, input.advogadoIdx);
  if (!emissor) {
    throw new Error(`Escritorio emissor invalido: ${input.escritorioSlug}`);
  }
  const { escritorio, advogado }: { escritorio: EscritorioEmissor; advogado: AdvogadoEmissor } =
    emissor;
  const font = escritorio.fonteDocx;
  const esp = escritorio.espacamentoDocx;

  const tipoLabel = TIPO_ADITIVO_LABELS[input.tipo];

  const cidade = input.contrato.municipio
    ? `${input.contrato.municipio.nome}/${input.contrato.municipio.uf}`
    : "Recife/PE";
  const dataExtenso = formatBR(new Date());

  const objeto =
    input.contrato.objetoDoContrato?.trim() ||
    "(objeto do contrato nao informado no cadastro do contrato)";

  const children: Array<Paragraph | Table> = [];

  // Cabecalho do destinatario
  children.push(
    p(`A ${input.contrato.orgaoContratante ?? "PREFEITURA MUNICIPAL"}`, {
      align: "LEFT",
      bold: true,
      font,
      espacamento: esp,
    }),
  );
  if (input.contrato.representanteContratante) {
    children.push(
      p(
        `Aos cuidados de ${input.contrato.representanteContratante}${
          input.contrato.cargoRepresentante
            ? ` (${input.contrato.cargoRepresentante})`
            : ""
        }`,
        { align: "LEFT", font, espacamento: esp },
      ),
    );
  }
  children.push(
    p(cidade, { align: "LEFT", font, espacamento: esp }),
  );

  // Titulo
  children.push(
    tituloDocumento(`Solicitacao de Aditivo Contratual - ${tipoLabel}`, {
      font,
      espacamento: esp,
    }),
  );

  children.push(
    p(`${cidade}, ${dataExtenso}.`, {
      align: "RIGHT",
      font,
      espacamento: esp,
    }),
  );

  children.push(
    p(
      `${escritorio.nome}, por seu(s) advogado(s) infra-assinado(s), vem, respeitosamente, a presenca de Vossa Senhoria solicitar a celebracao de termo aditivo ao contrato de prestacao de servicos juridicos, a luz dos fatos e fundamentos a seguir expostos.`,
      { font, espacamento: esp, indent: true },
    ),
  );

  // Secao I - Do contrato original
  children.push(
    heading("I - DO CONTRATO ORIGINAL", { font, espacamento: esp }),
  );
  children.push(buildContratoTable(input.contrato, font));
  children.push(
    p("", { align: "LEFT", font, espacamento: esp }),
  );
  children.push(
    p("Objeto do contrato:", { bold: true, align: "LEFT", font, espacamento: esp }),
  );
  children.push(p(objeto, { font, espacamento: esp, indent: true }));

  // Secao II - Da justificativa
  children.push(
    heading("II - DA JUSTIFICATIVA", { font, espacamento: esp }),
  );
  for (const linha of input.justificativa.split(/\n+/)) {
    if (linha.trim()) {
      children.push(p(linha.trim(), { font, espacamento: esp, indent: true }));
    }
  }

  // Secao III - Do fundamento
  children.push(
    heading("III - DO FUNDAMENTO LEGAL", { font, espacamento: esp }),
  );
  for (const linha of input.fundamento.split(/\n+/)) {
    if (linha.trim()) {
      children.push(p(linha.trim(), { font, espacamento: esp, indent: true }));
    }
  }

  // Secao IV - Pedido
  children.push(
    heading("IV - DO PEDIDO", { font, espacamento: esp }),
  );
  children.push(
    p(
      `Diante do exposto, requer-se a celebracao de termo aditivo ao contrato em referencia, na modalidade ${tipoLabel.toLowerCase()}, nos termos da justificativa e fundamento acima expostos.`,
      { font, espacamento: esp, indent: true },
    ),
  );
  children.push(
    p("Termos em que pede deferimento.", {
      font,
      espacamento: esp,
      indent: true,
    }),
  );

  // Assinatura
  children.push(
    p("", { align: "CENTER", font, espacamento: esp }),
  );
  children.push(
    p(`${cidade}, ${dataExtenso}.`, {
      align: "CENTER",
      font,
      espacamento: esp,
    }),
  );
  children.push(
    p("", { align: "CENTER", font, espacamento: esp }),
  );
  children.push(
    p("_______________________________________________", {
      align: "CENTER",
      font,
      espacamento: esp,
    }),
  );
  children.push(
    p(advogado.nome, {
      align: "CENTER",
      bold: true,
      font,
      espacamento: esp,
    }),
  );
  children.push(
    p(advogado.oab, {
      align: "CENTER",
      font,
      espacamento: esp,
    }),
  );
  children.push(
    p(escritorio.nome, {
      align: "CENTER",
      font,
      espacamento: esp,
    }),
  );

  const doc = new Document({
    creator: escritorio.nome,
    title: `Solicitacao de Aditivo - ${tipoLabel}`,
    description: "Solicitacao de aditivo contratual",
    styles: {
      default: {
        document: {
          run: { font, size: 24 },
          paragraph: {
            spacing: { line: lineSpacing(esp), after: 120 },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.PORTRAIT },
            margin: {
              top: convertMillimetersToTwip(25),
              bottom: convertMillimetersToTwip(25),
              left: convertMillimetersToTwip(25),
              right: convertMillimetersToTwip(25),
              header: convertMillimetersToTwip(10),
              footer: convertMillimetersToTwip(10),
            },
          },
        },
        headers: { default: buildHeader(escritorio) },
        footers: { default: buildFooter(escritorio) },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  const numeroSlug = (input.contrato.numeroContrato ?? "sem-numero")
    .replace(/[^a-zA-Z0-9-]/g, "-")
    .toLowerCase();
  const nomeArquivo = `aditivo_${numeroSlug}_${input.tipo.toLowerCase()}_${stamp}.docx`;

  return { buffer, nomeArquivo };
}

// convertInchesToTwip nao e usado diretamente, importado caso queiramos mudar.
void convertInchesToTwip;
void LevelFormat;
