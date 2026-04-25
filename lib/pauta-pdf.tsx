import * as React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Path,
} from "@react-pdf/renderer";

export type ItemPautaJudicialPdf = {
  numeroProcesso: string;
  tipoRecurso: string | null;
  tituloProcesso: string | null;
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
  desPedidoVistas: string | null;
  advogadoSustentacao: string | null;
  parecerMpf: boolean;
};

export type SessaoJudicialPdf = {
  data: Date;
  orgaoJulgador: string;
  tipoSessao: string;
  observacoesGerais: string | null;
  horario: string | null;
  diaSemanaLabel: string;
  itens: ItemPautaJudicialPdf[];
};

export type PautaJudicialPdfData = {
  tribunal: "TJPE" | "TRF5";
  weekStart: Date;
  weekEnd: Date;
  sessoes: SessaoJudicialPdf[];
  geradoEm: Date;
};

const COLOR_NAVY = "#0b2a4a";
const COLOR_GRAY_BORDER = "#cbd5e1";
const COLOR_GRAY_BG = "#f1f4f9";
const COLOR_ROW_ALT = "#f8fafc";
const COLOR_MUTED = "#64748b";
const COLOR_TEXT = "#0f172a";
const COLOR_RETIRADO_BG = "#e2e8f0";

const COR_DIREITO_PUBLICO = "#1e3a8a";
const COR_CRIMINAL = "#991b1b";
const COR_REGIONAL_CARUARU = "#047857";
const COR_PLENO = "#6b21a8";
const COR_TURMA_TRF5 = "#0f766e";
const COR_SECAO_TRF5 = "#be185d";

export function corDoOrgao(
  orgao: string,
  tribunal: "TJPE" | "TRF5",
): string {
  if (tribunal === "TRF5") {
    if (orgao.includes("Pleno") || orgao.includes("Plenario Virtual"))
      return COR_PLENO;
    if (orgao.includes("Secao")) return COR_SECAO_TRF5;
    return COR_TURMA_TRF5;
  }
  if (orgao.includes("Regional Caruaru")) return COR_REGIONAL_CARUARU;
  if (orgao.includes("Pleno") || orgao === "Plenario Virtual") return COR_PLENO;
  if (orgao.includes("Criminal")) return COR_CRIMINAL;
  return COR_DIREITO_PUBLICO;
}

function formatDateBR(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
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
    paddingHorizontal: 28,
    fontFamily: "Helvetica",
    fontSize: 9,
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
    fontSize: 11,
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
  sessaoBox: {
    marginBottom: 14,
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLOR_GRAY_BORDER,
  },
  sessaoHeader: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sessaoOrgao: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: "#ffffff",
    flex: 1,
  },
  sessaoMeta: {
    fontSize: 9,
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  sessaoTipoBadge: {
    fontSize: 7,
    color: "#ffffff",
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    marginTop: 2,
    fontFamily: "Helvetica-Bold",
  },
  obsBox: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#fffbeb",
    borderBottomWidth: 1,
    borderBottomColor: "#fde68a",
    fontSize: 8,
    color: "#92400e",
    fontStyle: "italic",
  },
  table: { backgroundColor: "#ffffff" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLOR_GRAY_BG,
    borderBottomWidth: 1,
    borderBottomColor: COLOR_GRAY_BORDER,
  },
  th: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: COLOR_NAVY,
    paddingVertical: 5,
    paddingHorizontal: 6,
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
  tableRowRetirado: {
    backgroundColor: COLOR_RETIRADO_BG,
  },
  td: {
    fontSize: 8,
    color: COLOR_TEXT,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tdRetirado: {
    textDecoration: "line-through",
    color: COLOR_MUTED,
  },
  numeroFonte: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: COLOR_NAVY,
  },
  flagsCell: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
  },
  badge: {
    fontSize: 6.5,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
    marginRight: 2,
    marginBottom: 1,
    fontFamily: "Helvetica-Bold",
  },
  badgeSust: {
    backgroundColor: "#dcfce7",
    color: "#15803d",
  },
  badgeVistas: {
    backgroundColor: "#ffedd5",
    color: "#9a3412",
  },
  badgeRetirado: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },
  badgeVirtual: {
    backgroundColor: "#dbeafe",
    color: "#1e40af",
  },
  badgePresencial: {
    backgroundColor: "#fef9c3",
    color: "#854d0e",
  },
  badgeMpf: {
    backgroundColor: "#e0e7ff",
    color: "#3730a3",
  },
  micWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: COLOR_MUTED,
    borderTopWidth: 1,
    borderTopColor: COLOR_GRAY_BORDER,
    paddingTop: 5,
  },
});

function MicIcon() {
  return (
    <Svg width={8} height={8} viewBox="0 0 24 24" style={{ marginRight: 2 }}>
      <Path
        d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"
        fill="#15803d"
      />
    </Svg>
  );
}

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

const COLS_JUD = [
  { key: "numero", label: "Numero", width: "16%" },
  { key: "tipoRecurso", label: "Tipo", width: "11%" },
  { key: "relator", label: "Relator", width: "16%" },
  { key: "advogadoResp", label: "Adv.", width: "13%" },
  { key: "situacao", label: "Situacao", width: "15%" },
  { key: "prognostico", label: "Prognostico", width: "13%" },
  { key: "flags", label: "Flags", width: "16%" },
] as const;

function ItemBadges({ item }: { item: ItemPautaJudicialPdf }) {
  return (
    <View style={styles.flagsCell}>
      {item.sustentacaoOral && (
        <View style={[styles.badge, styles.badgeSust, styles.micWrap]}>
          <MicIcon />
          <Text>Sust.</Text>
        </View>
      )}
      {item.pedidoVistas && (
        <Text style={[styles.badge, styles.badgeVistas]}>
          Vistas
          {item.desPedidoVistas ? ` (${item.desPedidoVistas})` : ""}
        </Text>
      )}
      {item.retiradoDePauta && (
        <Text style={[styles.badge, styles.badgeRetirado]}>Retirado</Text>
      )}
      {item.sessaoVirtual && (
        <Text style={[styles.badge, styles.badgeVirtual]}>Virtual</Text>
      )}
      {item.pedidoRetPresencial && (
        <Text style={[styles.badge, styles.badgePresencial]}>Ret. presencial</Text>
      )}
      {item.parecerMpf && (
        <Text style={[styles.badge, styles.badgeMpf]}>MPF</Text>
      )}
    </View>
  );
}

function SessaoCard({
  sessao,
  tribunal,
}: {
  sessao: SessaoJudicialPdf;
  tribunal: "TJPE" | "TRF5";
}) {
  const cor = corDoOrgao(sessao.orgaoJulgador, tribunal);
  const tipoLabel =
    sessao.tipoSessao === "virtual"
      ? "Virtual"
      : sessao.tipoSessao === "plenario_virtual"
        ? "Plenario Virtual"
        : "Presencial";
  return (
    <View style={styles.sessaoBox} wrap={false}>
      <View style={[styles.sessaoHeader, { backgroundColor: cor }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sessaoOrgao}>{sessao.orgaoJulgador}</Text>
          <Text style={styles.sessaoTipoBadge}>{tipoLabel.toUpperCase()}</Text>
        </View>
        <Text style={styles.sessaoMeta}>
          {sessao.diaSemanaLabel} {formatDateBR(sessao.data)}
          {sessao.horario ? `  •  ${sessao.horario}` : ""}
        </Text>
      </View>

      {sessao.observacoesGerais ? (
        <Text style={styles.obsBox}>{sessao.observacoesGerais}</Text>
      ) : null}

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          {COLS_JUD.map((c) => (
            <Text key={c.key} style={[styles.th, { width: c.width }]}>
              {c.label}
            </Text>
          ))}
        </View>
        {sessao.itens.length === 0 ? (
          <Text
            style={{
              fontSize: 8,
              color: COLOR_MUTED,
              fontStyle: "italic",
              padding: 8,
            }}
          >
            Sem itens cadastrados.
          </Text>
        ) : (
          sessao.itens.map((it, idx) => {
            const rowStyle = it.retiradoDePauta
              ? styles.tableRowRetirado
              : idx % 2 === 1
                ? styles.tableRowAlt
                : {};
            const tdRetirado = it.retiradoDePauta ? styles.tdRetirado : {};
            return (
              <View
                key={`${it.numeroProcesso}-${idx}`}
                style={[styles.tableRow, rowStyle]}
                wrap={false}
              >
                <View style={[styles.td, { width: COLS_JUD[0].width }]}>
                  <Text style={[styles.numeroFonte, tdRetirado]}>
                    {it.numeroProcesso}
                  </Text>
                  {(it.partes || it.tituloProcesso) && (
                    <Text
                      style={[
                        { fontSize: 7, color: COLOR_MUTED },
                        tdRetirado,
                      ]}
                    >
                      {it.partes ?? it.tituloProcesso}
                    </Text>
                  )}
                </View>
                <Text style={[styles.td, { width: COLS_JUD[1].width }, tdRetirado]}>
                  {it.tipoRecurso ?? "-"}
                </Text>
                <Text style={[styles.td, { width: COLS_JUD[2].width }, tdRetirado]}>
                  {it.relator}
                </Text>
                <Text style={[styles.td, { width: COLS_JUD[3].width }, tdRetirado]}>
                  {it.advogadoResp}
                </Text>
                <Text style={[styles.td, { width: COLS_JUD[4].width }, tdRetirado]}>
                  {it.situacao ?? "-"}
                </Text>
                <Text style={[styles.td, { width: COLS_JUD[5].width }, tdRetirado]}>
                  {it.prognostico ?? "-"}
                </Text>
                <View style={[styles.td, { width: COLS_JUD[6].width }]}>
                  <ItemBadges item={it} />
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

export function PautaJudicialDocument({
  data,
}: {
  data: PautaJudicialPdfData;
}) {
  const { tribunal, weekStart, weekEnd, sessoes, geradoEm } = data;
  const subtitulo = `${tribunal} — Semana de ${formatDateBR(weekStart)} a ${formatDateBR(weekEnd)}`;
  return (
    <Document
      title={`Pauta da Semana — ${tribunal}`}
      author="Painel Juridico"
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.capaTitulo}>PAUTA DA SEMANA</Text>
        <Text style={styles.capaSubtitulo}>{subtitulo}</Text>
        <View style={styles.divider} />

        {sessoes.length === 0 ? (
          <Text style={styles.empty}>
            Nenhuma sessao cadastrada nesta semana.
          </Text>
        ) : (
          sessoes.map((s, idx) => (
            <SessaoCard
              key={`${s.orgaoJulgador}-${idx}`}
              sessao={s}
              tribunal={tribunal}
            />
          ))
        )}

        <PageFooter geradoEm={geradoEm} />
      </Page>
    </Document>
  );
}
