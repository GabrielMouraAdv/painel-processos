import * as React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

export type ItemPautaJudicialPdf = {
  numeroProcesso: string;
  tipoRecurso: string | null;
  tituloProcesso: string | null;
  partes: string | null;
  relator: string;
  advogadoResp: string;
  advogadoOab: string | null;
  situacao: string | null;
  prognostico: string | null;
  observacoes: string | null;
  providencia: string | null;
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
const COLOR_BORDER = "#000000";
const COLOR_GRAY_BG = "#f3f4f6";
const COLOR_ROW_ALT = "#fafafa";
const COLOR_MUTED = "#64748b";
const COLOR_TEXT = "#0f172a";
const COLOR_RED = "#b91c1c";
const COLOR_GREEN = "#15803d";

const TIPO_SESSAO_LABEL: Record<string, string> = {
  presencial: "Presencial",
  virtual: "Virtual",
  plenario_virtual: "Plenário Virtual",
};

function formatDateBR(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

function formatDayMonthBR(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
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

const DIAS_SEMANA_LONGO: Record<number, string> = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
};

function diaSemanaLongo(d: Date): string {
  return DIAS_SEMANA_LONGO[d.getUTCDay()] ?? "";
}

const MARGIN_PT = 57; // ~2cm

const styles = StyleSheet.create({
  page: {
    paddingTop: MARGIN_PT,
    paddingBottom: MARGIN_PT + 16,
    paddingHorizontal: MARGIN_PT,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: COLOR_TEXT,
  },
  capaTitulo: {
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
    textAlign: "center",
    color: COLOR_NAVY,
    letterSpacing: 1,
  },
  capaSubtitulo: {
    fontSize: 10,
    textAlign: "center",
    color: COLOR_MUTED,
    marginTop: 3,
  },
  divider: {
    marginTop: 8,
    marginBottom: 16,
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
  sessaoSubtitulo: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 14,
    marginBottom: 6,
  },
  sessaoSubtituloOrgao: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: COLOR_NAVY,
  },
  sessaoSubtituloData: {
    fontSize: 10,
    color: COLOR_TEXT,
    marginLeft: 6,
  },
  table: {
    borderWidth: 0.7,
    borderColor: COLOR_BORDER,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLOR_GRAY_BG,
    borderBottomWidth: 0.7,
    borderBottomColor: COLOR_BORDER,
  },
  th: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: COLOR_NAVY,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRightWidth: 0.5,
    borderRightColor: COLOR_BORDER,
  },
  thLast: {
    borderRightWidth: 0,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR_BORDER,
    alignItems: "stretch",
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableRowAlt: {
    backgroundColor: COLOR_ROW_ALT,
  },
  td: {
    fontSize: 9,
    color: COLOR_TEXT,
    paddingVertical: 4,
    paddingHorizontal: 4,
    lineHeight: 1.3,
    borderRightWidth: 0.5,
    borderRightColor: COLOR_BORDER,
  },
  tdLast: {
    borderRightWidth: 0,
  },
  numeroFonte: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: COLOR_NAVY,
  },
  numeroParte: {
    fontSize: 8,
    color: COLOR_MUTED,
    marginTop: 1,
    lineHeight: 1.25,
  },
  responsavelOab: {
    fontSize: 7.5,
    color: COLOR_MUTED,
    marginTop: 1,
  },
  partesTexto: {
    fontSize: 8,
    color: COLOR_MUTED,
    fontStyle: "italic",
    marginTop: 2,
  },
  badgeFlagsBox: {
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
  badgeSusten: {
    backgroundColor: "#dbeafe",
    color: "#1e40af",
  },
  badgeVirtual: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
  },
  badgeRetPresencial: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  badgeMpf: {
    backgroundColor: "#ede9fe",
    color: "#5b21b6",
  },
  badgeVistas: {
    backgroundColor: "#ffedd5",
    color: "#9a3412",
  },
  badgeRetirado: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },
  obsGeraisTitulo: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: COLOR_NAVY,
    marginTop: 18,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  obsGeraisSessao: {
    marginBottom: 10,
  },
  obsGeraisSessaoTitulo: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: COLOR_NAVY,
    marginBottom: 3,
  },
  obsGeraisTexto: {
    fontSize: 9,
    color: COLOR_TEXT,
    lineHeight: 1.4,
    textAlign: "justify",
  },
  footer: {
    position: "absolute",
    bottom: 22,
    left: MARGIN_PT,
    right: MARGIN_PT,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: COLOR_MUTED,
    borderTopWidth: 0.5,
    borderTopColor: COLOR_BORDER,
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
          `Página ${pageNumber} de ${totalPages}`
        }
      />
    </View>
  );
}

const COLS_JUD = [
  { key: "numero", label: "Nº do Processo", width: "16%" },
  { key: "tipoRecurso", label: "Tipo de Recurso", width: "10%" },
  { key: "relator", label: "Relator", width: "10%" },
  { key: "orgaoData", label: "Órgão/Data", width: "10%" },
  { key: "tribunal", label: "Tribunal", width: "6%" },
  { key: "responsavel", label: "Adv.", width: "11%" },
  { key: "situacao", label: "Situação", width: "19%" },
  { key: "providencia", label: "Observações/Providência", width: "18%" },
] as const;

const ITEMS_POR_BLOCO = 8;

function chunk<T>(arr: T[], size: number): T[][] {
  if (arr.length === 0) return [[]];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// =================== Markdown bold ===================

type Segmento = { text: string; bold: boolean };

function parseBold(text: string): Segmento[] {
  const out: Segmento[] = [];
  let i = 0;
  while (i < text.length) {
    const start = text.indexOf("**", i);
    if (start === -1) {
      out.push({ text: text.slice(i), bold: false });
      break;
    }
    if (start > i) out.push({ text: text.slice(i, start), bold: false });
    const end = text.indexOf("**", start + 2);
    if (end === -1) {
      out.push({ text: text.slice(start), bold: false });
      break;
    }
    out.push({ text: text.slice(start + 2, end), bold: true });
    i = end + 2;
  }
  return out;
}

function corDoBold(t: string): string | null {
  const s = t.toLowerCase();
  if (
    /alto risco|altamente desfavor[aá]vel|perigoso|condena[cç][aã]o|procedente|seguran[cç]a denegada|denegada a ordem|cautelar deferida/i.test(
      s,
    )
  ) {
    return COLOR_RED;
  }
  if (
    /baixo risco|favor[aá]vel|improcedente|absolvi[cç][aã]o|prescri[cç][aã]o|extin[cç][aã]o|seguran[cç]a concedida|concedida a ordem|cautelar (n[aã]o concedida|indeferida)/i.test(
      s,
    )
  ) {
    return COLOR_GREEN;
  }
  return null;
}

function RichText({
  text,
  baseStyle,
}: {
  text: string;
  baseStyle?: object;
}) {
  const segs = parseBold(text);
  return (
    <Text style={baseStyle as never}>
      {segs.map((s, i) => {
        if (!s.bold) return <Text key={i}>{s.text}</Text>;
        const cor = corDoBold(s.text);
        const style: { fontFamily: string; color?: string } = {
          fontFamily: "Helvetica-Bold",
        };
        if (cor) style.color = cor;
        return (
          <Text key={i} style={style}>
            {s.text}
          </Text>
        );
      })}
    </Text>
  );
}

// =================== Componentes ===================

function ItemFlags({ item }: { item: ItemPautaJudicialPdf }) {
  const algumaFlag =
    item.sustentacaoOral ||
    item.sessaoVirtual ||
    item.pedidoRetPresencial ||
    item.parecerMpf ||
    item.pedidoVistas ||
    item.retiradoDePauta;
  if (!algumaFlag) return null;
  return (
    <View style={styles.badgeFlagsBox}>
      {item.sustentacaoOral && (
        <Text style={[styles.badge, styles.badgeSusten]}>
          Sustentacao
          {item.advogadoSustentacao ? ` (${item.advogadoSustentacao})` : ""}
        </Text>
      )}
      {item.sessaoVirtual && (
        <Text style={[styles.badge, styles.badgeVirtual]}>Virtual</Text>
      )}
      {item.pedidoRetPresencial && (
        <Text style={[styles.badge, styles.badgeRetPresencial]}>
          Pedido p/ presencial
        </Text>
      )}
      {item.parecerMpf && (
        <Text style={[styles.badge, styles.badgeMpf]}>MPF</Text>
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
    </View>
  );
}

function CelulaSituacao({ item }: { item: ItemPautaJudicialPdf }) {
  const partes: string[] = [];
  if (item.prognostico) partes.push(item.prognostico);
  if (item.situacao) partes.push(item.situacao);
  return (
    <View>
      {partes.length === 0 ? (
        <Text>-</Text>
      ) : (
        partes.map((p, i) => (
          <View key={i} style={i > 0 ? { marginTop: 3 } : undefined}>
            <RichText text={p} />
          </View>
        ))
      )}
      <ItemFlags item={item} />
    </View>
  );
}

function CelulaProvidencia({ item }: { item: ItemPautaJudicialPdf }) {
  const partes: string[] = [];
  if (item.providencia) partes.push(item.providencia);
  if (item.observacoes) partes.push(item.observacoes);
  return (
    <View>
      {partes.length === 0 ? (
        <Text>-</Text>
      ) : (
        partes.map((p, i) => (
          <View key={i} style={i > 0 ? { marginTop: 3 } : undefined}>
            <RichText text={p} />
          </View>
        ))
      )}
      {item.partes && (
        <Text style={styles.partesTexto}>Partes: {item.partes}</Text>
      )}
    </View>
  );
}

function SessaoChunk({
  sessao,
  itens,
  blocoIdx,
  totalBlocos,
  tribunal,
}: {
  sessao: SessaoJudicialPdf;
  itens: ItemPautaJudicialPdf[];
  blocoIdx: number;
  totalBlocos: number;
  tribunal: "TJPE" | "TRF5";
}) {
  const isContinuacao = blocoIdx > 0;
  const horarioStr = sessao.horario ? ` ${sessao.horario}` : "";
  const tipoStr =
    TIPO_SESSAO_LABEL[sessao.tipoSessao] ?? sessao.tipoSessao;
  return (
    <View break={isContinuacao}>
      <View style={styles.sessaoSubtitulo}>
        <Text style={styles.sessaoSubtituloOrgao}>{sessao.orgaoJulgador}</Text>
        <Text style={styles.sessaoSubtituloData}>
          ({diaSemanaLongo(sessao.data)}, {formatDayMonthBR(sessao.data)}
          {horarioStr}) — {tipoStr}
          {totalBlocos > 1
            ? ` — parte ${blocoIdx + 1}/${totalBlocos}${isContinuacao ? " (continuação)" : ""}`
            : ""}
        </Text>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader} wrap={false}>
          {COLS_JUD.map((c, i) => (
            <Text
              key={c.key}
              style={[
                styles.th,
                { width: c.width },
                i === COLS_JUD.length - 1 ? styles.thLast : {},
              ]}
            >
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
            const isLast = idx === itens.length - 1;
            const rowStyle = [
              styles.tableRow,
              offset % 2 === 1 ? styles.tableRowAlt : {},
              isLast ? styles.tableRowLast : {},
            ];
            const colWidths = COLS_JUD.map((c) => c.width);
            return (
              <View
                key={`${it.numeroProcesso}-${offset}`}
                style={rowStyle}
                wrap={false}
              >
                <View style={[styles.td, { width: colWidths[0] }]}>
                  <Text style={styles.numeroFonte}>{it.numeroProcesso}</Text>
                  {it.tituloProcesso && (
                    <Text style={styles.numeroParte}>{it.tituloProcesso}</Text>
                  )}
                </View>
                <Text style={[styles.td, { width: colWidths[1] }]}>
                  {it.tipoRecurso ?? "-"}
                </Text>
                <Text style={[styles.td, { width: colWidths[2] }]}>
                  {it.relator || "-"}
                </Text>
                <Text style={[styles.td, { width: colWidths[3] }]}>
                  {sessao.orgaoJulgador}
                  {"\n"}
                  {formatDayMonthBR(sessao.data)}
                </Text>
                <Text style={[styles.td, { width: colWidths[4] }]}>
                  {tribunal}
                </Text>
                <View style={[styles.td, { width: colWidths[5] }]}>
                  <Text>{it.advogadoResp || "-"}</Text>
                  {it.advogadoOab && (
                    <Text style={styles.responsavelOab}>{it.advogadoOab}</Text>
                  )}
                </View>
                <View style={[styles.td, { width: colWidths[6] }]}>
                  <CelulaSituacao item={it} />
                </View>
                <View
                  style={[
                    styles.td,
                    { width: colWidths[7] },
                    styles.tdLast,
                  ]}
                >
                  <CelulaProvidencia item={it} />
                </View>
              </View>
            );
          })
        )}
      </View>
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
          tribunal={tribunal}
        />
      ))}
    </>
  );
}

function ObservacoesGeraisSection({
  sessoes,
}: {
  sessoes: SessaoJudicialPdf[];
}) {
  const comObs = sessoes.filter(
    (s) => s.observacoesGerais && s.observacoesGerais.trim(),
  );
  if (comObs.length === 0) return null;
  return (
    <View>
      <Text style={styles.obsGeraisTitulo}>OBSERVAÇÕES GERAIS</Text>
      {comObs.map((s, i) => (
        <View key={i} style={styles.obsGeraisSessao} wrap={false}>
          <Text style={styles.obsGeraisSessaoTitulo}>
            {s.orgaoJulgador} —{" "}
            {diaSemanaLongo(s.data)}, {formatDayMonthBR(s.data)}
          </Text>
          <RichText
            text={s.observacoesGerais ?? ""}
            baseStyle={styles.obsGeraisTexto}
          />
        </View>
      ))}
    </View>
  );
}

export function PautaJudicialDocument({
  data,
}: {
  data: PautaJudicialPdfData;
}) {
  const { tribunal, weekStart, weekEnd, sessoes, geradoEm } = data;

  let inicio = weekStart;
  let fim = weekEnd;
  if (sessoes.length > 0) {
    const datas = sessoes.map((s) => s.data.getTime()).sort((a, b) => a - b);
    inicio = new Date(datas[0]);
    fim = new Date(datas[datas.length - 1]);
  }
  const titulo = `PAUTA - ${formatDayMonthBR(inicio)} a ${formatDateBR(fim)}`;

  return (
    <Document
      title={`Pauta da Semana — ${tribunal}`}
      author="Painel Jurídico"
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.capaTitulo}>{titulo}</Text>
        <Text style={styles.capaSubtitulo}>{tribunal}</Text>
        <View style={styles.divider} />

        {sessoes.length === 0 ? (
          <Text style={styles.empty}>
            Nenhuma sessao cadastrada nesta semana.
          </Text>
        ) : (
          <>
            {sessoes.map((s, idx) => (
              <SessaoCard
                key={`${s.orgaoJulgador}-${idx}`}
                sessao={s}
                tribunal={tribunal}
              />
            ))}
            <ObservacoesGeraisSection sessoes={sessoes} />
          </>
        )}

        <PageFooter geradoEm={geradoEm} />
      </Page>
    </Document>
  );
}
