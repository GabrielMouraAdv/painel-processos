import * as React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { CamaraTce } from "@prisma/client";

export type ItemPautaTcePdf = {
  numeroProcesso: string;
  tituloProcesso: string | null;
  tipoProcesso: string | null;
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

export type SessaoTcePdf = {
  data: Date;
  camara: CamaraTce;
  observacoesGerais: string | null;
  diaSemanaLabel: string;
  itens: ItemPautaTcePdf[];
};

export type PautaTcePdfData = {
  weekStart: Date;
  weekEnd: Date;
  sessoes: SessaoTcePdf[];
  geradoEm: Date;
};

const COLOR_NAVY = "#0b2a4a";
const COLOR_GRAY_BORDER = "#cbd5e1";
const COLOR_GRAY_BG = "#f1f4f9";
const COLOR_ROW_ALT = "#f8fafc";
const COLOR_MUTED = "#64748b";
const COLOR_TEXT = "#0f172a";
const COLOR_RETIRADO_BG = "#e2e8f0";

const COR_CAMARA: Record<CamaraTce, string> = {
  PRIMEIRA: "#1e40af",
  SEGUNDA: "#047857",
  PLENO: "#6b21a8",
};

const CAMARA_LABEL: Record<CamaraTce, string> = {
  PRIMEIRA: "1a Camara",
  SEGUNDA: "2a Camara",
  PLENO: "Pleno",
};

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
    paddingTop: 32,
    paddingBottom: 56,
    paddingHorizontal: 24,
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
    alignItems: "flex-start",
  },
  sessaoHeaderLeft: {
    flex: 1,
    paddingRight: 10,
    minWidth: 0,
  },
  sessaoHeaderRight: {
    flexShrink: 0,
    alignItems: "flex-end",
  },
  sessaoOrgao: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: "#ffffff",
  },
  sessaoMeta: {
    fontSize: 9,
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  continuacaoBadge: {
    fontSize: 7,
    color: "#ffffff",
    fontStyle: "italic",
    marginTop: 2,
    textAlign: "right",
  },
  obsBox: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#fffbeb",
    borderBottomWidth: 1,
    borderBottomColor: "#fde68a",
    fontSize: 9,
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
    fontSize: 10,
    color: COLOR_NAVY,
    paddingVertical: 7,
    paddingHorizontal: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLOR_GRAY_BORDER,
    alignItems: "stretch",
  },
  tableRowAlt: {
    backgroundColor: COLOR_ROW_ALT,
  },
  tableRowRetirado: {
    backgroundColor: COLOR_RETIRADO_BG,
  },
  td: {
    fontSize: 9,
    color: COLOR_TEXT,
    paddingVertical: 6,
    paddingHorizontal: 6,
    lineHeight: 1.35,
  },
  tdRetirado: {
    textDecoration: "line-through",
    color: COLOR_MUTED,
  },
  numeroFonte: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: COLOR_NAVY,
  },
  numeroParte: {
    fontSize: 8,
    color: COLOR_MUTED,
    marginTop: 2,
    lineHeight: 1.3,
  },
  flagsCell: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 2,
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
  badgeVistas: {
    backgroundColor: "#ffedd5",
    color: "#9a3412",
  },
  badgeRetirado: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
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

const COLS_TCE = [
  { key: "numero", label: "Numero", width: "21%" },
  { key: "tipo", label: "Tipo", width: "14%" },
  { key: "municipio", label: "Municipio", width: "14%" },
  { key: "relator", label: "Relator", width: "13%" },
  { key: "advogadoResp", label: "Adv.", width: "12%" },
  { key: "situacao", label: "Situacao", width: "13%" },
  { key: "observacoes", label: "Observacoes", width: "13%" },
] as const;

const ITEMS_POR_BLOCO = 14;

function chunk<T>(arr: T[], size: number): T[][] {
  if (arr.length === 0) return [[]];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function municipioExercicio(it: ItemPautaTcePdf): string {
  if (it.exercicio) return `${it.municipio} (${it.exercicio})`;
  return it.municipio;
}

function ItemFlags({ item }: { item: ItemPautaTcePdf }) {
  if (!item.pedidoVistas && !item.retiradoDePauta) return null;
  return (
    <View style={styles.flagsCell}>
      {item.pedidoVistas && (
        <Text style={[styles.badge, styles.badgeVistas]}>
          Vistas
          {item.conselheiroVistas ? ` (${item.conselheiroVistas})` : ""}
        </Text>
      )}
      {item.retiradoDePauta && (
        <Text style={[styles.badge, styles.badgeRetirado]}>Retirado</Text>
      )}
    </View>
  );
}

function SessaoChunk({
  sessao,
  itens,
  blocoIdx,
  totalBlocos,
}: {
  sessao: SessaoTcePdf;
  itens: ItemPautaTcePdf[];
  blocoIdx: number;
  totalBlocos: number;
}) {
  const cor = COR_CAMARA[sessao.camara];
  const isContinuacao = blocoIdx > 0;
  return (
    <View
      style={styles.sessaoBox}
      break={isContinuacao}
      minPresenceAhead={120}
    >
      <View style={[styles.sessaoHeader, { backgroundColor: cor }]}>
        <View style={styles.sessaoHeaderLeft}>
          <Text style={styles.sessaoOrgao}>
            {CAMARA_LABEL[sessao.camara]}
          </Text>
        </View>
        <View style={styles.sessaoHeaderRight}>
          <Text style={styles.sessaoMeta}>
            {sessao.diaSemanaLabel} {formatDateBR(sessao.data)}
          </Text>
          {totalBlocos > 1 ? (
            <Text style={styles.continuacaoBadge}>
              {isContinuacao ? "(continuacao) " : ""}
              parte {blocoIdx + 1}/{totalBlocos}
            </Text>
          ) : null}
        </View>
      </View>

      {!isContinuacao && sessao.observacoesGerais ? (
        <Text style={styles.obsBox}>{sessao.observacoesGerais}</Text>
      ) : null}

      <View style={styles.table}>
        <View style={styles.tableHeader} wrap={false}>
          {COLS_TCE.map((c) => (
            <Text key={c.key} style={[styles.th, { width: c.width }]}>
              {c.label}
            </Text>
          ))}
        </View>
        {itens.length === 0 ? (
          <Text
            style={{
              fontSize: 9,
              color: COLOR_MUTED,
              fontStyle: "italic",
              padding: 8,
            }}
          >
            Sem itens cadastrados.
          </Text>
        ) : (
          itens.map((it, idx) => {
            const offset = blocoIdx * ITEMS_POR_BLOCO + idx;
            const rowStyle = it.retiradoDePauta
              ? styles.tableRowRetirado
              : offset % 2 === 1
                ? styles.tableRowAlt
                : {};
            const tdRetirado = it.retiradoDePauta ? styles.tdRetirado : {};
            return (
              <View
                key={`${it.numeroProcesso}-${offset}`}
                style={[styles.tableRow, rowStyle]}
                wrap={false}
              >
                <View style={[styles.td, { width: COLS_TCE[0].width }]}>
                  <Text style={[styles.numeroFonte, tdRetirado]}>
                    {it.numeroProcesso}
                  </Text>
                  {it.tituloProcesso && (
                    <Text style={[styles.numeroParte, tdRetirado]}>
                      {it.tituloProcesso}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.td,
                    { width: COLS_TCE[1].width },
                    tdRetirado,
                  ]}
                >
                  {it.tipoProcesso ?? "-"}
                </Text>
                <Text
                  style={[
                    styles.td,
                    { width: COLS_TCE[2].width },
                    tdRetirado,
                  ]}
                >
                  {municipioExercicio(it)}
                </Text>
                <Text
                  style={[
                    styles.td,
                    { width: COLS_TCE[3].width },
                    tdRetirado,
                  ]}
                >
                  {it.relator}
                </Text>
                <Text
                  style={[
                    styles.td,
                    { width: COLS_TCE[4].width },
                    tdRetirado,
                  ]}
                >
                  {it.advogadoResp}
                </Text>
                <Text
                  style={[
                    styles.td,
                    { width: COLS_TCE[5].width },
                    tdRetirado,
                  ]}
                >
                  {it.situacao ?? "-"}
                </Text>
                <View style={[styles.td, { width: COLS_TCE[6].width }]}>
                  <Text style={tdRetirado}>{it.observacoes ?? "-"}</Text>
                  <ItemFlags item={it} />
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

function SessaoCard({ sessao }: { sessao: SessaoTcePdf }) {
  const blocos = chunk(sessao.itens, ITEMS_POR_BLOCO);
  return (
    <>
      {blocos.map((bloco, bi) => (
        <SessaoChunk
          key={bi}
          sessao={sessao}
          itens={bloco}
          blocoIdx={bi}
          totalBlocos={blocos.length}
        />
      ))}
    </>
  );
}

export function PautaTceDocument({ data }: { data: PautaTcePdfData }) {
  const { weekStart, weekEnd, sessoes, geradoEm } = data;
  const subtitulo = `Semana de ${formatDateBR(weekStart)} a ${formatDateBR(weekEnd)}`;
  return (
    <Document title="Pauta TCE-PE" author="Painel Juridico">
      <Page size="A4" style={styles.page}>
        <Text style={styles.capaTitulo}>PAUTA TCE-PE</Text>
        <Text style={styles.capaSubtitulo}>{subtitulo}</Text>
        <View style={styles.divider} />

        {sessoes.length === 0 ? (
          <Text style={styles.empty}>
            Nenhuma sessao cadastrada nesta semana.
          </Text>
        ) : (
          sessoes.map((s, idx) => (
            <SessaoCard key={`${s.camara}-${idx}`} sessao={s} />
          ))
        )}

        <PageFooter geradoEm={geradoEm} />
      </Page>
    </Document>
  );
}
