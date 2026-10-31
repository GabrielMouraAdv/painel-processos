// Motor do modulo "Professor temporario: piso do magisterio" (Tema 1.308/STF).
//
// Funcao pura: recebe os dados do contrato e devolve a memoria mes a mes,
// o resumo por ano e os totais. Nao depende de React nem de banco, para poder
// ser testada por script e reaproveitada no PDF.
//
// Regras (todas configuraveis pela entrada):
// - piso proporcional = piso do ano x (horas mensais / 200);
// - diferenca = piso proporcional - vencimento-base pago (nunca negativa);
// - 13º: 1/12 por mes; se a prefeitura pagou o 13º, so a diferenca; se nao, o valor todo;
// - terco de ferias: 1/36 por mes (1/3 de um salario a cada 12 meses), mesma logica;
// - ferias nao gozadas (indenizacao): 1/12 por mes do salario devido;
// - FGTS (contrato nulo, Tema 916): 8% do salario devido no mes;
// - prescricao quinquenal (Decreto 20.910/32): so meses a partir de 60 meses antes do ajuizamento;
// - correcao: IPCA-E ate 11/2021 e SELIC de 12/2021 em diante (EC 113/2021),
//   do mes seguinte ao vencimento ate o ultimo indice publicado.

import { INICIO_SELIC, IPCA_E, PISO_MAGISTERIO, SELIC, ULTIMO_MES_INDICE } from "./dados";

export type Periodo = { inicio: string; fim: string }; // "AAAA-MM"

export type EntradaPiso = {
  periodos: Periodo[];
  horasMensais: number; // 200 = 40h semanais
  vencimentoPorAno: Record<number, number>; // vencimento-base mensal pago em cada ano
  ajuizamento: string; // "AAAA-MM"
  reflexos13Ferias: boolean; // Tema 551: lei/contrato preve ou houve desvirtuamento
  pagou13: boolean;
  pagouTerco: boolean;
  feriasNaoGozadas: boolean;
  fgts: boolean;
};

export type LinhaMes = {
  mes: string;
  piso40: number;
  pisoProporcional: number;
  pago: number;
  devido: number;
  diferenca: number;
  decimoTerceiro: number;
  ferias: number; // terco + ferias nao gozadas
  fgts: number;
  principal: number;
  fator: number;
  atualizado: number;
};

export type ResumoAno = {
  ano: number;
  meses: number;
  diferenca: number;
  decimoTerceiro: number;
  ferias: number;
  fgts: number;
  principal: number;
  atualizado: number;
};

export type ResultadoPiso = {
  linhas: LinhaMes[];
  anos: ResumoAno[];
  totais: Omit<ResumoAno, "ano">;
  correcao: number; // atualizado - principal
  mesesPrescritos: number;
  inicioPrescricao: string;
  avisos: string[];
};

// ---------- datas "AAAA-MM" ----------

export function somaMeses(mes: string, n: number): string {
  const [a, m] = mes.split("-").map(Number);
  const total = a * 12 + (m - 1) + n;
  const ano = Math.floor(total / 12);
  const mm = (total % 12) + 1;
  return `${ano}-${String(mm).padStart(2, "0")}`;
}

export function mesesEntre(inicio: string, fim: string): string[] {
  const out: string[] = [];
  if (!inicio || !fim || inicio > fim) return out;
  for (let m = inicio; m <= fim; m = somaMeses(m, 1)) out.push(m);
  return out;
}

const r2 = (v: number) => Math.round(v * 100) / 100;

// Fator acumulado do mes seguinte ao vencimento ate o ultimo indice.
export function fatorCorrecao(mesVencimento: string): number {
  let f = 1;
  for (let m = somaMeses(mesVencimento, 1); m <= ULTIMO_MES_INDICE; m = somaMeses(m, 1)) {
    const taxa = m >= INICIO_SELIC ? SELIC[m] : IPCA_E[m];
    f *= 1 + (taxa ?? 0) / 100;
  }
  return f;
}

export function calcularPiso(e: EntradaPiso): ResultadoPiso {
  const avisos: string[] = [];
  const inicioPrescricao = somaMeses(e.ajuizamento, -60);
  const proporcao = Math.max(0, e.horasMensais) / 200;

  // Une os periodos sem contar mes repetido.
  const todos = new Set<string>();
  for (const p of e.periodos) for (const m of mesesEntre(p.inicio, p.fim)) todos.add(m);
  const meses = Array.from(todos).sort();

  let mesesPrescritos = 0;
  const semPiso = new Set<number>();
  const semVencimento = new Set<number>();
  const linhas: LinhaMes[] = [];

  for (const mes of meses) {
    if (mes < inicioPrescricao) {
      mesesPrescritos++;
      continue;
    }
    if (mes > e.ajuizamento) continue;
    const ano = Number(mes.slice(0, 4));
    const piso40 = PISO_MAGISTERIO[ano];
    if (piso40 == null) {
      semPiso.add(ano);
      continue;
    }
    const pago = e.vencimentoPorAno[ano];
    if (pago == null || Number.isNaN(pago)) semVencimento.add(ano);
    const pagoMes = pago ?? 0;

    const pisoProporcional = piso40 * proporcao;
    const devido = Math.max(pisoProporcional, pagoMes);
    const diferenca = devido - pagoMes;

    const decimoTerceiro = e.reflexos13Ferias ? (e.pagou13 ? diferenca : devido) / 12 : 0;
    const terco = e.reflexos13Ferias ? (e.pagouTerco ? diferenca : devido) / 36 : 0;
    const feriasInd = e.reflexos13Ferias && e.feriasNaoGozadas ? devido / 12 : 0;
    const fgts = e.fgts ? devido * 0.08 : 0;

    const principal = diferenca + decimoTerceiro + terco + feriasInd + fgts;
    const fator = fatorCorrecao(mes);

    // Linhas sem arredondamento: so o resumo e a tela arredondam.
    linhas.push({
      mes,
      piso40,
      pisoProporcional,
      pago: pagoMes,
      devido,
      diferenca,
      decimoTerceiro,
      ferias: terco + feriasInd,
      fgts,
      principal,
      fator,
      atualizado: principal * fator,
    });
  }

  const porAno = new Map<number, ResumoAno>();
  for (const l of linhas) {
    const ano = Number(l.mes.slice(0, 4));
    const a = porAno.get(ano) ?? {
      ano,
      meses: 0,
      diferenca: 0,
      decimoTerceiro: 0,
      ferias: 0,
      fgts: 0,
      principal: 0,
      atualizado: 0,
    };
    a.meses++;
    a.diferenca += l.diferenca;
    a.decimoTerceiro += l.decimoTerceiro;
    a.ferias += l.ferias;
    a.fgts += l.fgts;
    a.principal += l.principal;
    a.atualizado += l.atualizado;
    porAno.set(ano, a);
  }
  const anos = Array.from(porAno.values())
    .sort((x, y) => x.ano - y.ano)
    .map((a) => ({
      ...a,
      diferenca: r2(a.diferenca),
      decimoTerceiro: r2(a.decimoTerceiro),
      ferias: r2(a.ferias),
      fgts: r2(a.fgts),
      principal: r2(a.principal),
      atualizado: r2(a.atualizado),
    }));

  const soma = (k: keyof Omit<ResumoAno, "ano">) => r2(anos.reduce((s, a) => s + a[k], 0));
  const totais = {
    meses: anos.reduce((s, a) => s + a.meses, 0),
    diferenca: soma("diferenca"),
    decimoTerceiro: soma("decimoTerceiro"),
    ferias: soma("ferias"),
    fgts: soma("fgts"),
    principal: soma("principal"),
    atualizado: soma("atualizado"),
  };

  if (mesesPrescritos > 0)
    avisos.push(
      `${mesesPrescritos} ${mesesPrescritos === 1 ? "mês ficou" : "meses ficaram"} fora do cálculo pela prescrição quinquenal (antes de ${fmtMes(inicioPrescricao)}).`,
    );
  if (semPiso.size > 0)
    avisos.push(
      `Sem valor de piso cadastrado para ${Array.from(semPiso).join(", ")}: meses ignorados.`,
    );
  if (semVencimento.size > 0)
    avisos.push(
      `Vencimento pago não informado para ${Array.from(semVencimento).join(", ")}: considerado R$ 0, o que superestima a diferença.`,
    );
  if (e.fgts && e.reflexos13Ferias)
    avisos.push(
      "FGTS (contrato nulo, Tema 916) somado a 13º e férias (Tema 551): a cumulação é discutida nos tribunais; apresente como cenário máximo.",
    );
  if (e.ajuizamento > ULTIMO_MES_INDICE)
    avisos.push(`Correção até ${fmtMes(ULTIMO_MES_INDICE)}, último índice publicado.`);

  return {
    linhas,
    anos,
    totais,
    correcao: r2(totais.atualizado - totais.principal),
    mesesPrescritos,
    inicioPrescricao,
    avisos,
  };
}

const NOMES_MES = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

export function fmtMes(mes: string): string {
  const [a, m] = mes.split("-");
  return `${NOMES_MES[Number(m) - 1]}/${a}`;
}

export function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
