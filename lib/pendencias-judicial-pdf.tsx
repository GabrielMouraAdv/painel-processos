import * as React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

export type PendenciaItemJudPdf = {
  tipo: "memorial" | "despacho";
  descricao: string;
};

export type ProcessoPendenciaJudPdf = {
  numero: string;
  tipoProcesso: string;
  tribunal: string;
  gestor: string;
  fase: string;
  pendencias: PendenciaItemJudPdf[];
};

export type PendenciasJudicialPdfData = {
  geradoEm: Date;
  cards: ProcessoPendenciaJudPdf[];
  resumo: {
    memorial: number;
    despacho: number;
    total: number;
  };
};

const COLOR_NAVY = "#0b2a4a";
const COLOR_GRAY_BORDER = "#cbd5e1";
const COLOR_GRAY_BG = "#f1f4f9";
const COLOR_MUTED = "#64748b";
const COLOR_TEXT = "#0f172a";
const COLOR_RED = "#b91c1c";
const COLOR_AMBER = "#b45309";

const TIPO_LABEL: Record<PendenciaItemJudPdf["tipo"], string> = {
  memorial: "Elaborar Memorial",
  despacho: "Agendar Despacho com Relator",
};

const TIPO_COLOR: Record<PendenciaItemJudPdf["tipo"], string> = {
  memorial: COLOR_AMBER,
  despacho: COLOR_AMBER,
};

function formatDateBR(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function formatDateTimeBR(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 56,
    paddingHorizontal: 32,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: COLOR_TEXT,
  },
  capaTitulo: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    textAlign: "center",
    color: COLOR_NAVY,
    letterSpacing: 1.5,
    marginTop: 4,
  },
  capaSubtitulo: {
    fontSize: 10,
    textAlign: "center",
    color: COLOR_MUTED,
    marginTop: 4,
  },
  divider: {
    marginTop: 12,
    marginBottom: 14,
    height: 2,
    backgroundColor: COLOR_NAVY,
  },
  empty: {
    fontSize: 10,
    color: COLOR_MUTED,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 30,
  },
  processoBox: {
    marginBottom: 12,
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLOR_GRAY_BORDER,
  },
  processoHeader: {
    backgroundColor: COLOR_NAVY,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  processoNumero: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: "#ffffff",
  },
  processoMeta: {
    fontSize: 9,
    color: "#dbe5f2",
    marginTop: 2,
  },
  processoBadge: {
    fontSize: 7.5,
    color: "#ffffff",
    backgroundColor: "rgba(255,255,255,0.18)",
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    alignSelf: "flex-start",
    marginTop: 3,
  },
  pendenciasList: {
    backgroundColor: "#ffffff",
    paddingVertical: 4,
  },
  pendenciaRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLOR_GRAY_BORDER,
  },
  pendenciaRowLast: {
    borderBottomWidth: 0,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  pendenciaTexto: {
    fontSize: 10,
    color: COLOR_TEXT,
    flex: 1,
  },
  pendenciaBadge: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    backgroundColor: COLOR_RED,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 2,
  },
  resumoBox: {
    marginTop: 16,
    backgroundColor: COLOR_GRAY_BG,
    borderWidth: 1,
    borderColor: COLOR_GRAY_BORDER,
    borderRadius: 4,
    padding: 12,
  },
  resumoTitulo: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: COLOR_NAVY,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  resumoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  resumoRowLast: {
    borderBottomWidth: 0,
    paddingTop: 6,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLOR_NAVY,
  },
  resumoLabel: {
    fontSize: 10,
    color: COLOR_TEXT,
  },
  resumoValor: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: COLOR_NAVY,
  },
  resumoTotalLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: COLOR_NAVY,
    textTransform: "uppercase",
  },
  resumoTotalValor: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    color: COLOR_NAVY,
  },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: COLOR_MUTED,
    borderTopWidth: 1,
    borderTopColor: COLOR_GRAY_BORDER,
    paddingTop: 5,
  },
});

function PageFooter({ geradoEm }: { geradoEm: Date }) {
  return (
    <View style={styles.footer} fixed>
      <Text>
        Gerado em {formatDateTimeBR(geradoEm)} — Confidencial — Uso interno
      </Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `Pagina ${pageNumber} de ${totalPages}`
        }
      />
    </View>
  );
}

function ProcessoPendenciasCard({
  card,
}: {
  card: ProcessoPendenciaJudPdf;
}) {
  const meta = [card.tipoProcesso, `Gestor: ${card.gestor}`].join(" • ");
  return (
    <View style={styles.processoBox} wrap={false}>
      <View style={styles.processoHeader}>
        <Text style={styles.processoNumero}>{card.numero}</Text>
        <Text style={styles.processoMeta}>{meta}</Text>
        <Text style={styles.processoMeta}>Fase: {card.fase}</Text>
        <Text style={styles.processoBadge}>{card.tribunal}</Text>
      </View>
      <View style={styles.pendenciasList}>
        {card.pendencias.map((pd, idx) => (
          <View
            key={idx}
            style={[
              styles.pendenciaRow,
              idx === card.pendencias.length - 1
                ? styles.pendenciaRowLast
                : {},
            ]}
          >
            <View
              style={[styles.bullet, { backgroundColor: TIPO_COLOR[pd.tipo] }]}
            />
            <Text style={styles.pendenciaTexto}>{TIPO_LABEL[pd.tipo]}</Text>
            <Text style={styles.pendenciaBadge}>PENDENTE</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function PendenciasJudicialDocument({
  data,
}: {
  data: PendenciasJudicialPdfData;
}) {
  const { cards, resumo, geradoEm } = data;
  return (
    <Document title="Pendencias Judiciais" author="Painel Juridico">
      <Page size="A4" style={styles.page}>
        <Text style={styles.capaTitulo}>PENDENCIAS JUDICIAIS</Text>
        <Text style={styles.capaSubtitulo}>
          Gerado em {formatDateBR(geradoEm)}
        </Text>
        <View style={styles.divider} />

        {cards.length === 0 ? (
          <Text style={styles.empty}>
            Nenhuma pendencia ativa neste recorte.
          </Text>
        ) : (
          cards.map((c, idx) => (
            <ProcessoPendenciasCard key={`${c.numero}-${idx}`} card={c} />
          ))
        )}

        {cards.length > 0 && (
          <View style={styles.resumoBox} wrap={false}>
            <Text style={styles.resumoTitulo}>Resumo de pendencias</Text>
            <View style={styles.resumoRow}>
              <Text style={styles.resumoLabel}>Memoriais pendentes</Text>
              <Text style={styles.resumoValor}>{resumo.memorial}</Text>
            </View>
            <View style={styles.resumoRow}>
              <Text style={styles.resumoLabel}>Despachos pendentes</Text>
              <Text style={styles.resumoValor}>{resumo.despacho}</Text>
            </View>
            <View style={[styles.resumoRow, styles.resumoRowLast]}>
              <Text style={styles.resumoTotalLabel}>Total</Text>
              <Text style={styles.resumoTotalValor}>{resumo.total}</Text>
            </View>
          </View>
        )}

        <PageFooter geradoEm={geradoEm} />
      </Page>
    </Document>
  );
}
