import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

import { formatDayBR } from "@/lib/semana";

export type ItemExport = {
  numeroProcesso: string;
  tituloProcesso: string | null;
  tipoRecurso: string | null;
  partes: string | null;
  relator: string;
  advogadoResp: string;
  situacao: string | null;
  prognostico: string | null;
  sustentacaoOral: boolean;
  sessaoVirtual: boolean;
  pedidoRetPresencial: boolean;
  retiradoDePauta: boolean;
  pedidoVistas: boolean;
  advogadoSustentacao: string | null;
  desPedidoVistas: string | null;
};

export type SessaoExport = {
  id: string;
  data: Date;
  orgaoJulgador: string;
  tipoSessao: string;
  observacoesGerais: string | null;
  itens: ItemExport[];
};

const TIPO_SESSAO_LABEL: Record<string, string> = {
  presencial: "Presencial",
  virtual: "Virtual",
  plenario_virtual: "Plenario Virtual",
};

function flagsInline(it: ItemExport): string[] {
  const flags: string[] = [];
  if (it.sustentacaoOral) {
    flags.push(
      it.advogadoSustentacao
        ? `Sustentacao (${it.advogadoSustentacao})`
        : "Sustentacao",
    );
  }
  if (it.sessaoVirtual) flags.push("Virtual");
  if (it.pedidoRetPresencial) flags.push("Ret. presencial");
  if (it.retiradoDePauta) flags.push("Retirado");
  if (it.pedidoVistas) {
    flags.push(
      it.desPedidoVistas ? `Vistas (${it.desPedidoVistas})` : "Vistas",
    );
  }
  return flags;
}

function groupByOrgao(sessoes: SessaoExport[]): Map<string, SessaoExport[]> {
  const map = new Map<string, SessaoExport[]>();
  for (const s of sessoes) {
    const list = map.get(s.orgaoJulgador) ?? [];
    list.push(s);
    map.set(s.orgaoJulgador, list);
  }
  return map;
}

function cellText(text: string, opts: { bold?: boolean; size?: number } = {}) {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: opts.bold,
            size: opts.size ?? 18,
          }),
        ],
      }),
    ],
  });
}

function toIsoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function buildPautaDocx(
  sessoes: SessaoExport[],
  weekStart: Date,
  weekEnd: Date,
): Promise<Buffer> {
  const grouped = groupByOrgao(sessoes);
  const children: (Paragraph | Table)[] = [];

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "Pauta Semanal - TJPE",
          bold: true,
          size: 32,
        }),
      ],
    }),
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Semana: ${formatDayBR(toIsoDate(weekStart))} a ${formatDayBR(toIsoDate(weekEnd))}`,
          size: 22,
        }),
      ],
    }),
  );
  children.push(new Paragraph({ text: "" }));

  if (sessoes.length === 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: "Nenhuma sessao cadastrada nesta semana.",
            italics: true,
            size: 22,
          }),
        ],
      }),
    );
  }

  const orgaosOrdenados = Array.from(grouped.keys()).sort();
  for (const orgao of orgaosOrdenados) {
    const sessoesDoOrgao = grouped.get(orgao) ?? [];
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: orgao, bold: true, size: 26 })],
      }),
    );

    for (const sessao of sessoesDoOrgao) {
      const tipo =
        TIPO_SESSAO_LABEL[sessao.tipoSessao] ?? sessao.tipoSessao;
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Sessao ${tipo} — ${formatDayBR(toIsoDate(sessao.data))}`,
              bold: true,
              size: 22,
            }),
          ],
        }),
      );

      if (sessao.observacoesGerais) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: sessao.observacoesGerais,
                italics: true,
                size: 20,
              }),
            ],
          }),
        );
      }

      if (sessao.itens.length === 0) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "Sem itens cadastrados.",
                italics: true,
                size: 20,
              }),
            ],
          }),
        );
        children.push(new Paragraph({ text: "" }));
        continue;
      }

      const header = new TableRow({
        tableHeader: true,
        children: [
          cellText("Numero", { bold: true }),
          cellText("Tipo Recurso", { bold: true }),
          cellText("Relator", { bold: true }),
          cellText("Adv.", { bold: true }),
          cellText("Situacao", { bold: true }),
          cellText("Prognostico", { bold: true }),
          cellText("Flags", { bold: true }),
        ],
      });

      const rows = sessao.itens.map((it) => {
        const flags = flagsInline(it).join(", ") || "-";
        const numero = it.tituloProcesso
          ? `${it.numeroProcesso}\n${it.tituloProcesso}`
          : it.numeroProcesso;
        return new TableRow({
          children: [
            cellText(numero),
            cellText(it.tipoRecurso ?? "-"),
            cellText(it.relator),
            cellText(it.advogadoResp),
            cellText(it.situacao ?? "-"),
            cellText(it.prognostico ?? "-"),
            cellText(flags),
          ],
        });
      });

      children.push(
        new Table({
          rows: [header, ...rows],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
      );
      children.push(new Paragraph({ text: "" }));
    }
  }

  const doc = new Document({
    creator: "Painel Juridico",
    title: "Pauta Semanal TJPE",
    styles: {
      default: {
        document: {
          run: { font: "Calibri" },
        },
      },
    },
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}

export function buildPautaWhatsApp(
  sessoes: SessaoExport[],
  weekStart: Date,
  weekEnd: Date,
): string {
  const grouped = groupByOrgao(sessoes);
  const lines: string[] = [];

  lines.push(
    `*Pauta Semanal - TJPE*`,
    `_Semana: ${formatDayBR(toIsoDate(weekStart))} a ${formatDayBR(toIsoDate(weekEnd))}_`,
    "",
  );

  if (sessoes.length === 0) {
    lines.push("_Nenhuma sessao cadastrada nesta semana._");
    return lines.join("\n");
  }

  const orgaosOrdenados = Array.from(grouped.keys()).sort();
  for (const orgao of orgaosOrdenados) {
    const sessoesDoOrgao = grouped.get(orgao) ?? [];
    lines.push(`*${orgao}*`);
    for (const sessao of sessoesDoOrgao) {
      const tipo =
        TIPO_SESSAO_LABEL[sessao.tipoSessao] ?? sessao.tipoSessao;
      lines.push(
        `_${formatDayBR(toIsoDate(sessao.data))} — ${tipo}${sessao.itens.length > 0 ? ` (${sessao.itens.length} item${sessao.itens.length === 1 ? "" : "s"})` : ""}_`,
      );
      if (sessao.observacoesGerais) {
        lines.push(`> ${sessao.observacoesGerais}`);
      }
      if (sessao.itens.length === 0) {
        lines.push("_Sem itens cadastrados._");
      } else {
        sessao.itens.forEach((it, idx) => {
          const flags = flagsInline(it);
          const header = `${idx + 1}. *${it.numeroProcesso}*${it.tipoRecurso ? ` (${it.tipoRecurso})` : ""}`;
          lines.push(header);
          if (it.tituloProcesso) lines.push(`   ${it.tituloProcesso}`);
          if (it.partes) lines.push(`   ${it.partes}`);
          lines.push(`   Relator: ${it.relator}`);
          lines.push(`   Adv: ${it.advogadoResp}`);
          if (it.situacao) lines.push(`   Situacao: ${it.situacao}`);
          if (it.prognostico) lines.push(`   Prognostico: ${it.prognostico}`);
          if (flags.length > 0) lines.push(`   Flags: ${flags.join(", ")}`);
        });
      }
      lines.push("");
    }
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
