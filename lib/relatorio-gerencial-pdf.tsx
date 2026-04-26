import * as React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

export type LinhaTabela = string[];

export type TabelaRelatorio = {
  titulo: string;
  descricao?: string;
  cabecalho: string[];
  linhas: LinhaTabela[];
};

export type RelatorioGerencialData = {
  emissor: { slug: string; nome: string };
  advogadoSignatario: { nome: string; oab: string };
  geradoEm: Date;
  periodo: { de: string | null; ate: string | null };
  totalProcessos: number;
  tabelas: TabelaRelatorio[];
};

const COLOR_NAVY = "#0b2a4a";
const COLOR_NAVY_LIGHT = "#dbe5f2";
const COLOR_GRAY_BG = "#f1f4f9";
const COLOR_GRAY_BORDER = "#cbd5e1";
const COLOR_MUTED = "#64748b";
const COLOR_TEXT = "#0f172a";
const COLOR_ROW_ALT = "#f8fafc";

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 36,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: COLOR_TEXT,
  },
  capaTitulo: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    textAlign: "center",
    color: COLOR_NAVY,
    letterSpacing: 1,
    marginTop: 8,
  },
  capaEscritorio: {
    fontSize: 11,
    textAlign: "center",
    color: COLOR_MUTED,
    marginTop: 6,
  },
  divider: {
    marginTop: 14,
    marginBottom: 14,
    height: 2,
    backgroundColor: COLOR_NAVY,
  },
  metaBox: {
    backgroundColor: COLOR_GRAY_BG,
    borderWidth: 1,
    borderColor: COLOR_GRAY_BORDER,
    borderRadius: 4,
    padding: 12,
    marginBottom: 18,
  },
  metaLinha: {
    fontSize: 10,
    color: COLOR_TEXT,
    marginBottom: 3,
  },
  metaLabel: {
    color: COLOR_MUTED,
  },
  metaTotal: {
    fontFamily: "Helvetica-Bold",
    color: COLOR_NAVY,
  },
  sectionTitulo: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: COLOR_NAVY,
    backgroundColor: COLOR_NAVY_LIGHT,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginBottom: 4,
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  sectionDesc: {
    fontSize: 9,
    color: COLOR_MUTED,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  tableWrap: {
    borderWidth: 1,
    borderColor: COLOR_GRAY_BORDER,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 14,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: COLOR_GRAY_BG,
    borderBottomWidth: 1,
    borderBottomColor: COLOR_GRAY_BORDER,
  },
  tableHeaderCell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: COLOR_NAVY,
    paddingVertical: 6,
    paddingHorizontal: 8,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLOR_GRAY_BORDER,
  },
  tableRowAlt: {
    backgroundColor: COLOR_ROW_ALT,
  },
  tableCell: {
    fontSize: 10,
    color: COLOR_TEXT,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableCellLast: {
    fontFamily: "Helvetica-Bold",
    color: COLOR_NAVY,
    textAlign: "right",
  },
  empty: {
    fontSize: 9,
    color: COLOR_MUTED,
    fontStyle: "italic",
    padding: 10,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: COLOR_MUTED,
    borderTopWidth: 1,
    borderTopColor: COLOR_GRAY_BORDER,
    paddingTop: 6,
  },
  assinaturaBox: {
    marginTop: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLOR_GRAY_BORDER,
  },
  assinaturaCabecalho: {
    fontSize: 10,
    color: COLOR_TEXT,
    marginBottom: 28,
  },
  assinaturaLinha: {
    width: 240,
    borderTopWidth: 1,
    borderTopColor: COLOR_TEXT,
    marginBottom: 4,
  },
  assinaturaNome: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: COLOR_NAVY,
    letterSpacing: 0.5,
  },
  assinaturaOab: {
    fontSize: 9,
    color: COLOR_MUTED,
    marginTop: 1,
  },
});

function formatDateBR(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function formatDateLong(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}

function formatPeriodo(p: { de: string | null; ate: string | null }): string {
  if (!p.de && !p.ate) return "Sem filtro de período";
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : formatDateBR(d);
  };
  if (p.de && p.ate) return `${fmt(p.de)} a ${fmt(p.ate)}`;
  if (p.de) return `A partir de ${fmt(p.de)}`;
  return `Até ${fmt(p.ate as string)}`;
}

function PageFooter({ geradoEm }: { geradoEm: Date }) {
  return (
    <View style={styles.footer} fixed>
      <Text>
        Gerado em {formatDateBR(geradoEm)} — Confidencial — Uso interno
      </Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `Página ${pageNumber} de ${totalPages}`
        }
      />
    </View>
  );
}

function Tabela({ tabela }: { tabela: TabelaRelatorio }) {
  const cols = tabela.cabecalho.length;
  const lastIdx = cols - 1;

  // larguras: ultima coluna (numerica) menor
  const widths = tabela.cabecalho.map((_, i) => {
    if (i === lastIdx) return "20%";
    return `${80 / Math.max(1, cols - 1)}%`;
  });

  return (
    <>
      <Text style={styles.sectionTitulo}>{tabela.titulo}</Text>
      {tabela.descricao ? (
        <Text style={styles.sectionDesc}>{tabela.descricao}</Text>
      ) : null}
      <View style={styles.tableWrap}>
        <View style={styles.tableHeaderRow}>
          {tabela.cabecalho.map((h, i) => (
            <Text
              key={h}
              style={[
                styles.tableHeaderCell,
                {
                  width: widths[i],
                  textAlign: i === lastIdx ? "right" : "left",
                },
              ]}
            >
              {h}
            </Text>
          ))}
        </View>
        {tabela.linhas.length === 0 ? (
          <Text style={styles.empty}>
            Nenhum dado no recorte selecionado.
          </Text>
        ) : (
          tabela.linhas.map((linha, idx) => (
            <View
              key={idx}
              style={[
                styles.tableRow,
                idx % 2 === 1 ? styles.tableRowAlt : {},
                idx === tabela.linhas.length - 1
                  ? { borderBottomWidth: 0 }
                  : {},
              ]}
              wrap={false}
            >
              {linha.map((cel, i) => (
                <Text
                  key={i}
                  style={[
                    styles.tableCell,
                    { width: widths[i] },
                    i === lastIdx ? styles.tableCellLast : {},
                  ]}
                >
                  {cel}
                </Text>
              ))}
            </View>
          ))
        )}
      </View>
    </>
  );
}

export function RelatorioGerencialDocument({
  data,
}: {
  data: RelatorioGerencialData;
}) {
  const {
    emissor,
    advogadoSignatario,
    geradoEm,
    periodo,
    totalProcessos,
    tabelas,
  } = data;
  return (
    <Document title="Relatório Gerencial de Processos" author={emissor.nome}>
      <Page size="A4" style={styles.page}>
        {/* Slot futuro para header.png em
            public/escritorios/{emissor.slug}/header.png */}
        <Text style={styles.capaTitulo}>RELATÓRIO GERENCIAL</Text>
        <Text style={styles.capaEscritorio}>{emissor.nome}</Text>
        <View style={styles.divider} />

        <View style={styles.metaBox}>
          <Text style={styles.metaLinha}>
            <Text style={styles.metaLabel}>Período: </Text>
            {formatPeriodo(periodo)}
          </Text>
          <Text style={styles.metaLinha}>
            <Text style={styles.metaLabel}>Gerado em: </Text>
            {formatDateLong(geradoEm)}
          </Text>
          <Text style={styles.metaLinha}>
            <Text style={styles.metaLabel}>Total no recorte: </Text>
            <Text style={styles.metaTotal}>{totalProcessos}</Text>
          </Text>
        </View>

        {tabelas.map((t) => (
          <Tabela key={t.titulo} tabela={t} />
        ))}

        {/* Slot futuro para footer.png em
            public/escritorios/{emissor.slug}/footer.png */}
        <View style={styles.assinaturaBox} wrap={false}>
          <Text style={styles.assinaturaCabecalho}>Atenciosamente,</Text>
          <View style={styles.assinaturaLinha} />
          <Text style={styles.assinaturaNome}>
            {advogadoSignatario.nome.toUpperCase()}
          </Text>
          <Text style={styles.assinaturaOab}>{advogadoSignatario.oab}</Text>
        </View>

        <PageFooter geradoEm={geradoEm} />
      </Page>
    </Document>
  );
}
