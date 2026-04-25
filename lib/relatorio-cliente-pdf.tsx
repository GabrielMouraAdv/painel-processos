import * as React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

export type RelatorioStatusFiltro = "ativos" | "todos";

export type ProcessoJudicialItem = {
  numero: string;
  tribunal: string;
  tipo: string;
  fase: string;
  valor: number | null;
  advogado: string;
  risco: "ALTO" | "MEDIO" | "BAIXO";
  ultimosAndamentos: { data: Date; texto: string; fase: string }[];
  prazos: {
    tipo: string;
    data: Date;
    advogado: string | null;
    diasRestantes: number;
  }[];
  proximaSessao: { data: Date; orgao: string; tribunal: string } | null;
};

export type ProcessoTceItem = {
  numero: string;
  tipo: string;
  exercicio: string | null;
  camara: string;
  relator: string | null;
  faseAtual: string;
  status: {
    notaTecnica: boolean;
    parecerMpco: boolean;
    despachado: boolean;
    memorialPronto: boolean;
  };
  ultimosAndamentos: { data: Date; descricao: string; fase: string }[];
  prazos: {
    tipo: string;
    dataVencimento: Date;
    advogado: string | null;
    diasRestantes: number;
  }[];
};

export type RelatorioClienteData = {
  emissor: { slug: string; nome: string };
  advogadoSignatario: { nome: string; oab: string };
  cliente: {
    tipo: "gestor" | "municipio";
    nome: string;
    cargo?: string | null;
    municipio?: string | null;
  };
  geradoEm: Date;
  status: RelatorioStatusFiltro;
  resumo: {
    totalProcessos: number;
    ativos: number;
    comPrazoAberto: number;
    altoRisco: number;
    emPauta: number;
  };
  incluiJudicial: boolean;
  incluiTce: boolean;
  judiciais: ProcessoJudicialItem[];
  tce: ProcessoTceItem[];
};

const COLOR_NAVY = "#0b2a4a";
const COLOR_NAVY_LIGHT = "#dbe5f2";
const COLOR_GRAY_BG = "#f1f4f9";
const COLOR_GRAY_BORDER = "#cbd5e1";
const COLOR_BLUE_BG = "#e6efff";
const COLOR_BLUE_BORDER = "#93c5fd";
const COLOR_RED = "#b91c1c";
const COLOR_AMBER = "#b45309";
const COLOR_GREEN = "#15803d";
const COLOR_MUTED = "#64748b";
const COLOR_TEXT = "#0f172a";

const RISCO_COLOR: Record<"ALTO" | "MEDIO" | "BAIXO", string> = {
  ALTO: COLOR_RED,
  MEDIO: COLOR_AMBER,
  BAIXO: COLOR_GREEN,
};

const RISCO_LABEL: Record<"ALTO" | "MEDIO" | "BAIXO", string> = {
  ALTO: "Risco Alto",
  MEDIO: "Risco Medio",
  BAIXO: "Risco Baixo",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 36,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: COLOR_TEXT,
  },
  // Capa
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
  clienteBox: {
    backgroundColor: COLOR_GRAY_BG,
    borderWidth: 1,
    borderColor: COLOR_GRAY_BORDER,
    borderRadius: 4,
    padding: 14,
    marginBottom: 16,
  },
  clienteLabel: {
    fontSize: 9,
    color: COLOR_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  clienteNome: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    color: COLOR_NAVY,
    marginTop: 2,
  },
  clienteLinha: {
    fontSize: 10,
    color: COLOR_TEXT,
    marginTop: 4,
  },
  // Resumo
  resumoBox: {
    backgroundColor: COLOR_BLUE_BG,
    borderWidth: 1,
    borderColor: COLOR_BLUE_BORDER,
    borderRadius: 4,
    padding: 12,
    marginBottom: 18,
  },
  resumoTitulo: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: COLOR_NAVY,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  resumoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  resumoItem: {
    width: "20%",
    paddingVertical: 4,
    paddingRight: 4,
  },
  resumoValor: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    color: COLOR_NAVY,
  },
  resumoLabel: {
    fontSize: 8,
    color: COLOR_MUTED,
    marginTop: 1,
  },
  // Section
  sectionTitulo: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: COLOR_NAVY,
    backgroundColor: COLOR_NAVY_LIGHT,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginBottom: 10,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  // Processo card
  processoCard: {
    borderWidth: 1,
    borderColor: COLOR_GRAY_BORDER,
    borderRadius: 4,
    marginBottom: 10,
    overflow: "hidden",
  },
  processoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  processoNumero: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: "#ffffff",
  },
  processoRiscoBadge: {
    fontSize: 8,
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 2,
  },
  processoBody: {
    padding: 10,
    backgroundColor: "#ffffff",
  },
  metaLinha: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 6,
  },
  metaItem: {
    fontSize: 9,
    color: COLOR_TEXT,
    marginRight: 12,
    marginBottom: 2,
  },
  metaLabel: {
    color: COLOR_MUTED,
  },
  subTitulo: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: COLOR_NAVY,
    marginTop: 6,
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  bullet: {
    fontSize: 9,
    color: COLOR_TEXT,
    marginLeft: 4,
    marginBottom: 2,
  },
  bulletData: {
    fontFamily: "Helvetica-Bold",
    color: COLOR_NAVY,
  },
  bulletMuted: {
    color: COLOR_MUTED,
    fontSize: 8,
  },
  // Status TCE
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
    marginBottom: 4,
  },
  statusBadge: {
    fontSize: 8,
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 2,
    marginRight: 4,
    marginBottom: 2,
    fontFamily: "Helvetica-Bold",
  },
  statusOn: {
    backgroundColor: "#dcfce7",
    color: COLOR_GREEN,
  },
  statusOff: {
    backgroundColor: "#f1f5f9",
    color: COLOR_MUTED,
  },
  // Empty
  empty: {
    fontSize: 9,
    color: COLOR_MUTED,
    fontStyle: "italic",
    marginBottom: 10,
  },
  // Footer
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
  prazoUrg: {
    color: COLOR_RED,
    fontFamily: "Helvetica-Bold",
  },
  prazoProx: {
    color: COLOR_AMBER,
  },
  // Assinatura
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

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function formatDateShort(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(d);
}

function formatDateLong(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}

function formatCurrency(v: number | null): string {
  if (v === null || v === undefined) return "Nao informado";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

function diasLabel(dias: number): string {
  if (dias < 0) return `atrasado ${-dias}d`;
  if (dias === 0) return "vence hoje";
  if (dias === 1) return "1 dia";
  return `${dias} dias`;
}

function diasStyle(dias: number) {
  if (dias <= 7) return styles.prazoUrg;
  if (dias <= 14) return styles.prazoProx;
  return undefined;
}

function PageFooter({ geradoEm }: { geradoEm: Date }) {
  return (
    <View style={styles.footer} fixed>
      <Text>Gerado em {formatDate(geradoEm)} — Confidencial — Uso interno</Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `Pagina ${pageNumber} de ${totalPages}`
        }
      />
    </View>
  );
}

function StatusTceBadges({
  status,
}: {
  status: ProcessoTceItem["status"];
}) {
  const items: { label: string; on: boolean }[] = [
    { label: "Nota Tecnica", on: status.notaTecnica },
    { label: "Parecer MPCO", on: status.parecerMpco },
    { label: "Despachado", on: status.despachado },
    { label: "Memorial pronto", on: status.memorialPronto },
  ];
  return (
    <View style={styles.statusRow}>
      {items.map((it) => (
        <Text
          key={it.label}
          style={[
            styles.statusBadge,
            it.on ? styles.statusOn : styles.statusOff,
          ]}
        >
          {it.on ? "OK " : "-- "}
          {it.label}
        </Text>
      ))}
    </View>
  );
}

function ProcessoJudicialCard({ p }: { p: ProcessoJudicialItem }) {
  const headerColor = RISCO_COLOR[p.risco];
  return (
    <View style={styles.processoCard} wrap={false}>
      <View style={[styles.processoHeader, { backgroundColor: headerColor }]}>
        <Text style={styles.processoNumero}>{p.numero}</Text>
        <Text style={styles.processoRiscoBadge}>{RISCO_LABEL[p.risco]}</Text>
      </View>
      <View style={styles.processoBody}>
        <View style={styles.metaLinha}>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Tribunal: </Text>
            {p.tribunal}
          </Text>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Tipo: </Text>
            {p.tipo}
          </Text>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Fase: </Text>
            {p.fase}
          </Text>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Valor: </Text>
            {formatCurrency(p.valor)}
          </Text>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Advogado: </Text>
            {p.advogado}
          </Text>
        </View>

        {p.proximaSessao && (
          <>
            <Text style={styles.subTitulo}>Proxima sessao</Text>
            <Text style={styles.bullet}>
              <Text style={styles.bulletData}>
                {formatDate(p.proximaSessao.data)}
              </Text>
              {" — "}
              {p.proximaSessao.tribunal} — {p.proximaSessao.orgao}
            </Text>
          </>
        )}

        <Text style={styles.subTitulo}>Ultimos andamentos</Text>
        {p.ultimosAndamentos.length === 0 ? (
          <Text style={styles.bulletMuted}>Sem andamentos registrados.</Text>
        ) : (
          p.ultimosAndamentos.map((a, i) => (
            <Text key={i} style={styles.bullet}>
              <Text style={styles.bulletData}>{formatDateShort(a.data)}</Text>
              {" — "}
              {a.texto}
              {a.fase ? (
                <Text style={styles.bulletMuted}> ({a.fase})</Text>
              ) : null}
            </Text>
          ))
        )}

        <Text style={styles.subTitulo}>Prazos em aberto</Text>
        {p.prazos.length === 0 ? (
          <Text style={styles.bulletMuted}>Sem prazos em aberto.</Text>
        ) : (
          p.prazos.map((pr, i) => (
            <Text key={i} style={styles.bullet}>
              <Text style={styles.bulletData}>{pr.tipo}</Text>
              {" — vence "}
              {formatDateShort(pr.data)}
              {" — "}
              <Text style={diasStyle(pr.diasRestantes)}>
                {diasLabel(pr.diasRestantes)}
              </Text>
              {pr.advogado ? (
                <Text style={styles.bulletMuted}> — {pr.advogado}</Text>
              ) : null}
            </Text>
          ))
        )}
      </View>
    </View>
  );
}

function ProcessoTceCard({ p }: { p: ProcessoTceItem }) {
  return (
    <View style={styles.processoCard} wrap={false}>
      <View style={[styles.processoHeader, { backgroundColor: COLOR_NAVY }]}>
        <Text style={styles.processoNumero}>{p.numero}</Text>
        <Text style={styles.processoRiscoBadge}>{p.tipo}</Text>
      </View>
      <View style={styles.processoBody}>
        <View style={styles.metaLinha}>
          {p.exercicio ? (
            <Text style={styles.metaItem}>
              <Text style={styles.metaLabel}>Exercicio: </Text>
              {p.exercicio}
            </Text>
          ) : null}
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Camara: </Text>
            {p.camara}
          </Text>
          {p.relator ? (
            <Text style={styles.metaItem}>
              <Text style={styles.metaLabel}>Relator: </Text>
              {p.relator}
            </Text>
          ) : null}
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Fase: </Text>
            {p.faseAtual}
          </Text>
        </View>

        <StatusTceBadges status={p.status} />

        <Text style={styles.subTitulo}>Ultimos andamentos</Text>
        {p.ultimosAndamentos.length === 0 ? (
          <Text style={styles.bulletMuted}>Sem andamentos registrados.</Text>
        ) : (
          p.ultimosAndamentos.map((a, i) => (
            <Text key={i} style={styles.bullet}>
              <Text style={styles.bulletData}>{formatDateShort(a.data)}</Text>
              {" — "}
              {a.descricao}
              {a.fase ? (
                <Text style={styles.bulletMuted}> ({a.fase})</Text>
              ) : null}
            </Text>
          ))
        )}

        <Text style={styles.subTitulo}>Prazos em aberto</Text>
        {p.prazos.length === 0 ? (
          <Text style={styles.bulletMuted}>Sem prazos em aberto.</Text>
        ) : (
          p.prazos.map((pr, i) => (
            <Text key={i} style={styles.bullet}>
              <Text style={styles.bulletData}>{pr.tipo}</Text>
              {" — vence "}
              {formatDateShort(pr.dataVencimento)}
              {" — "}
              <Text style={diasStyle(pr.diasRestantes)}>
                {diasLabel(pr.diasRestantes)}
              </Text>
              {pr.advogado ? (
                <Text style={styles.bulletMuted}> — {pr.advogado}</Text>
              ) : null}
            </Text>
          ))
        )}
      </View>
    </View>
  );
}

export function RelatorioClienteDocument({
  data,
}: {
  data: RelatorioClienteData;
}) {
  const {
    emissor,
    advogadoSignatario,
    cliente,
    geradoEm,
    resumo,
    judiciais,
    tce,
    incluiJudicial,
    incluiTce,
    status,
  } = data;

  return (
    <Document
      title={`Relatorio de Processos — ${cliente.nome}`}
      author={emissor.nome}
    >
      <Page size="A4" style={styles.page}>
        {/* Capa
            Slot futuro para header.png em
            public/escritorios/{emissor.slug}/header.png */}
        <Text style={styles.capaTitulo}>RELATORIO DE PROCESSOS</Text>
        <Text style={styles.capaEscritorio}>{emissor.nome}</Text>
        <View style={styles.divider} />

        {/* Cliente */}
        <View style={styles.clienteBox}>
          <Text style={styles.clienteLabel}>
            {cliente.tipo === "gestor" ? "Gestor" : "Municipio"}
          </Text>
          <Text style={styles.clienteNome}>{cliente.nome}</Text>
          {cliente.tipo === "gestor" && cliente.cargo ? (
            <Text style={styles.clienteLinha}>
              <Text style={styles.metaLabel}>Cargo: </Text>
              {cliente.cargo}
            </Text>
          ) : null}
          {cliente.tipo === "gestor" && cliente.municipio ? (
            <Text style={styles.clienteLinha}>
              <Text style={styles.metaLabel}>Municipio de atuacao: </Text>
              {cliente.municipio}
            </Text>
          ) : null}
          <Text style={styles.clienteLinha}>
            <Text style={styles.metaLabel}>Gerado em: </Text>
            {formatDateLong(geradoEm)}
          </Text>
          <Text style={styles.clienteLinha}>
            <Text style={styles.metaLabel}>Recorte: </Text>
            {status === "ativos"
              ? "Apenas processos ativos"
              : "Todos os processos (incluindo encerrados)"}
          </Text>
        </View>

        {/* Resumo executivo */}
        <View style={styles.resumoBox}>
          <Text style={styles.resumoTitulo}>Resumo executivo</Text>
          <View style={styles.resumoGrid}>
            <View style={styles.resumoItem}>
              <Text style={styles.resumoValor}>{resumo.totalProcessos}</Text>
              <Text style={styles.resumoLabel}>Total de processos</Text>
            </View>
            <View style={styles.resumoItem}>
              <Text style={styles.resumoValor}>{resumo.ativos}</Text>
              <Text style={styles.resumoLabel}>Ativos</Text>
            </View>
            <View style={styles.resumoItem}>
              <Text style={styles.resumoValor}>{resumo.comPrazoAberto}</Text>
              <Text style={styles.resumoLabel}>Com prazo em aberto</Text>
            </View>
            <View style={styles.resumoItem}>
              <Text style={styles.resumoValor}>{resumo.altoRisco}</Text>
              <Text style={styles.resumoLabel}>Alto risco</Text>
            </View>
            <View style={styles.resumoItem}>
              <Text style={styles.resumoValor}>{resumo.emPauta}</Text>
              <Text style={styles.resumoLabel}>Em pauta</Text>
            </View>
          </View>
        </View>

        {incluiJudicial && (
          <>
            <Text style={styles.sectionTitulo}>Processos Judiciais</Text>
            {judiciais.length === 0 ? (
              <Text style={styles.empty}>
                Nenhum processo judicial no recorte selecionado.
              </Text>
            ) : (
              judiciais.map((p) => (
                <ProcessoJudicialCard key={p.numero} p={p} />
              ))
            )}
          </>
        )}

        {incluiTce && (
          <>
            <Text style={styles.sectionTitulo}>
              Processos Tribunal de Contas
            </Text>
            {tce.length === 0 ? (
              <Text style={styles.empty}>
                Nenhum processo TCE no recorte selecionado.
              </Text>
            ) : (
              tce.map((p, i) => <ProcessoTceCard key={`${p.numero}-${i}`} p={p} />)
            )}
          </>
        )}

        {/* Assinatura
            Slot futuro para footer.png em
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
