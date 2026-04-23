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
};

export function computeTceAlertas(p: ProcessoFlags): TceAlerta[] {
  const lista: TceAlerta[] = [];
  if (p.notaTecnica) {
    lista.push({
      key: "contrarrazoes_nt",
      titulo: "Elaborar contrarrazoes a Nota Tecnica",
      descricao:
        "O processo teve Nota Tecnica juntada. Elabore contrarrazoes antes da apreciacao.",
    });
  }
  if (p.parecerMpco) {
    lista.push({
      key: "contrarrazoes_mpco",
      titulo: "Elaborar contrarrazoes ao Parecer MPCO",
      descricao:
        "Parecer do Ministerio Publico de Contas juntado. Avaliar contrarrazoes.",
    });
  }
  if (p.memorialPronto && !p.despachadoComRelator) {
    lista.push({
      key: "despacho_relator",
      titulo: "Agendar despacho com o relator",
      descricao:
        "Memorial esta pronto mas ainda nao foi despachado com o relator.",
    });
  }
  return lista;
}
