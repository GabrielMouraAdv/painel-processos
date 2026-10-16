export type TceAlerta = {
  key: "contrarrazoes_nt" | "contrarrazoes_mpco" | "despacho_relator";
  titulo: string;
  descricao: string;
};

type ProcessoFlags = {
  notaTecnica: boolean;
  parecerMpco: boolean;
  despachadoComRelator: boolean;
  memorialPronto: boolean;
  despachoDispensado?: boolean;
  contrarrazoesNtApresentadas?: boolean;
  contrarrazoesNtDispensadas?: boolean;
  contrarrazoesMpcoApresentadas?: boolean;
  contrarrazoesMpcoDispensadas?: boolean;
};

export function computeTceAlertas(p: ProcessoFlags): TceAlerta[] {
  const lista: TceAlerta[] = [];
  // Contrarrazoes ja apresentadas ou dispensadas nao geram alerta.
  if (
    p.notaTecnica &&
    !p.contrarrazoesNtApresentadas &&
    !p.contrarrazoesNtDispensadas
  ) {
    lista.push({
      key: "contrarrazoes_nt",
      titulo: "Elaborar contrarrazões a Nota Técnica",
      descricao:
        "O processo teve Nota Tecnica juntada. Elabore contrarrazoes antes da apreciacao.",
    });
  }
  if (
    p.parecerMpco &&
    !p.contrarrazoesMpcoApresentadas &&
    !p.contrarrazoesMpcoDispensadas
  ) {
    lista.push({
      key: "contrarrazoes_mpco",
      titulo: "Elaborar contrarrazões ao Parecer MPCO",
      descricao:
        "Parecer do Ministerio Publico de Contas juntado. Avaliar contrarrazoes.",
    });
  }
  if (p.memorialPronto && !p.despachadoComRelator && !p.despachoDispensado) {
    lista.push({
      key: "despacho_relator",
      titulo: "Agendar despacho com o relator",
      descricao:
        "Memorial esta pronto mas ainda nao foi despachado com o relator.",
    });
  }
  return lista;
}
