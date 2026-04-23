import { CamaraTce } from "@prisma/client";
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
import { TCE_CAMARA_LABELS } from "@/lib/tce-config";

export type ItemTceExport = {
  numeroProcesso: string;
  tituloProcesso: string | null;
  municipio: string;
  exercicio: string | null;
  relator: string;
  advogadoResp: string;
  situacao: string | null;
  observacoes: string | null;
  prognostico: string | null;
  providencia: string | null;
  retiradoDePauta: boolean;
  pedidoVistas: boolean;
  conselheiroVistas: string | null;
};

export type SessaoTceExport = {
  id: string;
  data: Date;
  camara: CamaraTce;
  observacoesGerais: string | null;
  itens: ItemTceExport[];
};

const CAMARA_ORDEM: Record<CamaraTce, number> = {
  PRIMEIRA: 1,
  SEGUNDA: 2,
  PLENO: 3,
};

function flagsInline(it: ItemTceExport): string[] {
  const flags: string[] = [];
  if (it.retiradoDePauta) flags.push("Retirado");
  if (it.pedidoVistas) {
    flags.push(
      it.conselheiroVistas
        ? `Vistas (${it.conselheiroVistas})`
        : "Vistas",
    );
  }
  return flags;
}

function groupByCamara(
  sessoes: SessaoTceExport[],
): Map<CamaraTce, SessaoTceExport[]> {
  const map = new Map<CamaraTce, SessaoTceExport[]>();
  for (const s of sessoes) {
    const list = map.get(s.camara) ?? [];
    list.push(s);
    map.set(s.camara, list);
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

function municipioExercicio(it: ItemTceExport): string {
  if (it.exercicio) return `${it.municipio} (${it.exercicio})`;
  return it.municipio;
}

export async function buildPautaTceDocx(
  sessoes: SessaoTceExport[],
  weekStart: Date,
  weekEnd: Date,
): Promise<Buffer> {
  const grouped = groupByCamara(sessoes);
  const children: (Paragraph | Table)[] = [];

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "Pauta Semanal - TCE",
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

  const camarasOrdenadas = Array.from(grouped.keys()).sort(
    (a, b) => CAMARA_ORDEM[a] - CAMARA_ORDEM[b],
  );
  for (const camara of camarasOrdenadas) {
    const sessoesDaCamara = grouped.get(camara) ?? [];
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: TCE_CAMARA_LABELS[camara],
            bold: true,
            size: 26,
          }),
        ],
      }),
    );

    for (const sessao of sessoesDaCamara) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Sessao — ${formatDayBR(toIsoDate(sessao.data))}`,
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
          cellText("Municipio/Exerc.", { bold: true }),
          cellText("Relator", { bold: true }),
          cellText("Adv.", { bold: true }),
          cellText("Situacao", { bold: true }),
          cellText("Prognostico", { bold: true }),
          cellText("Providencia", { bold: true }),
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
            cellText(municipioExercicio(it)),
            cellText(it.relator),
            cellText(it.advogadoResp),
            cellText(it.situacao ?? "-"),
            cellText(it.prognostico ?? it.observacoes ?? "-"),
            cellText(it.providencia ?? "-"),
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
    title: "Pauta Semanal TCE",
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

export function buildPautaTceWhatsApp(
  sessoes: SessaoTceExport[],
  weekStart: Date,
  weekEnd: Date,
): string {
  const grouped = groupByCamara(sessoes);
  const lines: string[] = [];

  lines.push(
    `*Pauta Semanal - TCE*`,
    `_Semana: ${formatDayBR(toIsoDate(weekStart))} a ${formatDayBR(toIsoDate(weekEnd))}_`,
    "",
  );

  if (sessoes.length === 0) {
    lines.push("_Nenhuma sessao cadastrada nesta semana._");
    return lines.join("\n");
  }

  const camarasOrdenadas = Array.from(grouped.keys()).sort(
    (a, b) => CAMARA_ORDEM[a] - CAMARA_ORDEM[b],
  );
  for (const camara of camarasOrdenadas) {
    const sessoesDaCamara = grouped.get(camara) ?? [];
    lines.push(`*${TCE_CAMARA_LABELS[camara]}*`);
    for (const sessao of sessoesDaCamara) {
      lines.push(
        `_${formatDayBR(toIsoDate(sessao.data))}${sessao.itens.length > 0 ? ` (${sessao.itens.length} item${sessao.itens.length === 1 ? "" : "s"})` : ""}_`,
      );
      if (sessao.observacoesGerais) {
        lines.push(`> ${sessao.observacoesGerais}`);
      }
      if (sessao.itens.length === 0) {
        lines.push("_Sem itens cadastrados._");
      } else {
        sessao.itens.forEach((it, idx) => {
          const flags = flagsInline(it);
          const header = `${idx + 1}. *${it.numeroProcesso}*`;
          lines.push(header);
          if (it.tituloProcesso) lines.push(`   ${it.tituloProcesso}`);
          lines.push(`   Municipio: ${municipioExercicio(it)}`);
          lines.push(`   Relator: ${it.relator}`);
          lines.push(`   Adv: ${it.advogadoResp}`);
          if (it.situacao) lines.push(`   Situacao: ${it.situacao}`);
          const prog = it.prognostico ?? it.observacoes;
          if (prog) lines.push(`   Prognostico: ${prog}`);
          if (it.providencia) lines.push(`   Providencia: ${it.providencia}`);
          if (flags.length > 0) lines.push(`   Flags: ${flags.join(", ")}`);
        });
      }
      lines.push("");
    }
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
