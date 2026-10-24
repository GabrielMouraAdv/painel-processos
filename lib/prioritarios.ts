import { diaDe, hojeDia } from "@/lib/datas";
import { prisma } from "@/lib/prisma";

// Processos prioritarios (Processo.prioritario = true): a lista de improbidade e
// criminal que os socios acompanham. A situacao e derivada do que o painel sabe,
// na ordem de prioridade combinada:
//   1. em pauta de julgamento (ItemPautaJudicial em sessao de hoje em diante)
//   2. com prazo em aberto (Prazo nao cumprido nem dispensado)
//   3. concluso para julgamento/sentenca ou para decisao (ultimo movimento "Conclusao")
//   4. parado (sem nenhum dos anteriores, inclusive "Conclusao para despacho"; os mais antigos primeiro)

export type CategoriaPrioritario = "em_pauta" | "prazo_aberto" | "concluso" | "parado";

export const CATEGORIA_PRIORITARIO_LABELS: Record<CategoriaPrioritario, string> = {
  em_pauta: "Em pauta de julgamento",
  prazo_aberto: "Com prazo em aberto",
  concluso: "Conclusos para julgamento ou decisão",
  parado: "Parados",
};

export type Prioritario = {
  id: string;
  numero: string;
  tribunal: string;
  tipo: string;
  cliente: string;
  advogado: string;
  // Objeto do processo, resumido para caber na coluna (ate ~90 caracteres).
  objeto: string;
  categoria: CategoriaPrioritario;
  // Texto curto da situacao (ex.: "Pauta TRF5 · 2ª Turma · 28/10", "Prazo: Contestação · 29/10",
  // "Concluso para julgamento desde 11/06", "Sem movimento há 93 dias").
  situacao: string;
  // Dia (aaaa-mm-dd) que ordena dentro da categoria.
  dia: string | null;
  ultimoMovimento: { dia: string; texto: string } | null;
  // Ultima peca tipica da defesa registrada nos movimentos (contestacao, apelacao,
  // contraminuta, embargos...). O DataJud nao diz quem protocolou: pode ser de corréu.
  ultimaPeca: { dia: string; texto: string } | null;
  naoLidos: number;
  destaque: boolean; // em pauta esta semana ou prazo vencendo em ate 3 dias
};

const diasEntre = (a: string, b: string) =>
  Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86400000);

function rotuloConclusao(complementos: string | null): string {
  const c = (complementos ?? "").toLowerCase();
  if (c.includes("julgamento") || c.includes("sentença") || c.includes("sentenca")) return "Concluso para julgamento";
  if (c.includes("decis")) return "Concluso para decisão";
  if (c.includes("despacho")) return "Concluso para despacho";
  return "Concluso";
}

// So a conclusao para julgamento/sentenca ou para decisao e prioritaria.
// "Conclusao para despacho" (e a conclusao sem complemento) e rotina do cartorio:
// o processo continua na categoria "parado", com o rotulo informando a conclusao.
function conclusaoPrioritaria(complementos: string | null): boolean {
  const c = (complementos ?? "").toLowerCase();
  return c.includes("julgamento") || c.includes("sentença") || c.includes("sentenca") || c.includes("decis");
}

// Pecas tipicas da defesa, pelo complemento do movimento (sem acento, minusculas).
const PECAS_DEFESA: [RegExp, string][] = [
  [/contestac/, "Contestação"],
  [/defesa (previa|preliminar)/, "Defesa prévia"],
  [/alegacoes finais|memoriais/, "Alegações finais"],
  [/embargos de declarac/, "Embargos de declaração"],
  [/apelac/, "Apelação"],
  [/recurso especial/, "Recurso especial"],
  [/recurso extraordinario/, "Recurso extraordinário"],
  [/agravo/, "Agravo"],
  [/contraminuta/, "Contraminuta"],
  [/contra-?razoes|contrarrazoes/, "Contrarrazões"],
];
const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
function pecaDefesa(nomeMovimento: string, complementos: string | null): string | null {
  if (!/^(petic|documento|juntada)/i.test(semAcento(nomeMovimento))) return null;
  const c = semAcento(complementos ?? "");
  if (!c) return null;
  for (const [re, rotulo] of PECAS_DEFESA) if (re.test(c)) return rotulo;
  return null;
}

// Objeto do processo em uma frase curta (sem quebras, ate 90 caracteres).
function resumirObjeto(objeto: string | null | undefined): string {
  const t = (objeto ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= 90) return t;
  const corte = t.slice(0, 90);
  return `${corte.slice(0, Math.max(40, corte.lastIndexOf(" ")))}…`;
}

function pesoConclusao(complementos: string | null): number {
  const c = (complementos ?? "").toLowerCase();
  if (c.includes("julgamento") || c.includes("sentença") || c.includes("sentenca")) return 0;
  if (c.includes("decis")) return 1;
  return 2;
}

export async function carregarPrioritarios(escritorioId: string): Promise<Prioritario[]> {
  const hoje = hojeDia();
  const inicioHoje = new Date(`${hoje}T00:00:00Z`);

  const processos = await prisma.processo.findMany({
    where: { escritorioId, prioritario: true },
    select: {
      id: true, numero: true, tribunal: true, tipo: true, objeto: true,
      gestor: { select: { nome: true } },
      advogado: { select: { nome: true } },
      prazos: {
        where: { cumprido: false, dispensado: false },
        orderBy: { data: "asc" },
        take: 1,
        select: { tipo: true, data: true },
      },
      itensPautaJudicial: {
        where: { retiradoDePauta: false, sessao: { data: { gte: inicioHoje } } },
        orderBy: { sessao: { data: "asc" } },
        take: 1,
        select: { sessao: { select: { data: true, tribunal: true, orgaoJulgador: true } } },
      },
      // O primeiro e o ultimo movimento; os demais servem para achar a ultima peca da defesa.
      movimentacoesAuto: {
        orderBy: { dataMovimento: "desc" },
        take: 40,
        select: { nomeMovimento: true, complementos: true, dataMovimento: true },
      },
      publicacoesDjen: {
        orderBy: { dataPublicacao: "desc" },
        take: 1,
        select: { dataPublicacao: true, tipoComunicacao: true },
      },
      _count: { select: { movimentacoesAuto: { where: { lida: false } } } },
    },
  });

  const lista: Prioritario[] = processos.map((p) => {
    const mov = p.movimentacoesAuto[0] ?? null;
    const pub = p.publicacoesDjen[0] ?? null;
    // Ultimo evento conhecido: o mais recente entre movimento (DataJud) e intimacao (DJEN).
    let ultimo: Prioritario["ultimoMovimento"] = null;
    if (mov) ultimo = { dia: diaDe(mov.dataMovimento), texto: [mov.nomeMovimento, mov.complementos].filter(Boolean).join(" · ") };
    if (pub && (!ultimo || diaDe(pub.dataPublicacao) > ultimo.dia)) {
      ultimo = { dia: diaDe(pub.dataPublicacao), texto: `${pub.tipoComunicacao || "Intimação"} publicada no DJEN` };
    }

    let ultimaPeca: Prioritario["ultimaPeca"] = null;
    for (const m of p.movimentacoesAuto) {
      const rotulo = pecaDefesa(m.nomeMovimento, m.complementos);
      if (rotulo) {
        ultimaPeca = { dia: diaDe(m.dataMovimento), texto: rotulo };
        break;
      }
    }

    const base = {
      id: p.id, numero: p.numero, tribunal: p.tribunal, tipo: p.tipo,
      cliente: p.gestor?.nome ?? "—", advogado: p.advogado?.nome ?? "—",
      objeto: resumirObjeto(p.objeto),
      ultimoMovimento: ultimo, ultimaPeca, naoLidos: p._count.movimentacoesAuto,
    };

    const pauta = p.itensPautaJudicial[0];
    if (pauta) {
      const dia = diaDe(pauta.sessao.data);
      return {
        ...base, categoria: "em_pauta", dia,
        situacao: `Pauta ${pauta.sessao.tribunal} · ${pauta.sessao.orgaoJulgador} · ${dia.split("-").reverse().slice(0, 2).join("/")}`,
        destaque: diasEntre(hoje, dia) <= 7,
      };
    }
    const prazo = p.prazos[0];
    if (prazo) {
      const dia = diaDe(prazo.data);
      const falta = diasEntre(hoje, dia);
      return {
        ...base, categoria: "prazo_aberto", dia,
        situacao: `Prazo: ${prazo.tipo} · ${dia.split("-").reverse().slice(0, 2).join("/")}${falta < 0 ? " (vencido)" : falta === 0 ? " (hoje)" : ""}`,
        destaque: falta <= 3,
      };
    }
    const concluso = !!mov && /^conclus/i.test(mov.nomeMovimento);
    if (mov && concluso && conclusaoPrioritaria(mov.complementos)) {
      const dia = diaDe(mov.dataMovimento);
      return {
        ...base, categoria: "concluso", dia,
        situacao: `${rotuloConclusao(mov.complementos)} desde ${dia.split("-").reverse().slice(0, 2).join("/")} (${diasEntre(dia, hoje)} dias)`,
        destaque: false,
      };
    }
    const dia = ultimo?.dia ?? null;
    // Se o ultimo evento conhecido e a propria conclusao (para despacho), o rotulo diz isso.
    const ultimoEhConclusao = concluso && !!mov && dia === diaDe(mov.dataMovimento);
    return {
      ...base, categoria: "parado", dia,
      situacao: !dia
        ? "Sem movimento registrado"
        : ultimoEhConclusao
          ? `${rotuloConclusao(mov!.complementos)} desde ${dia.split("-").reverse().slice(0, 2).join("/")} (${diasEntre(dia, hoje)} dias)`
          : `Sem movimento há ${diasEntre(dia, hoje)} dias`,
      destaque: false,
    };
  });

  const ordemCat: Record<CategoriaPrioritario, number> = { em_pauta: 0, prazo_aberto: 1, concluso: 2, parado: 3 };
  return lista.sort((a, b) => {
    if (ordemCat[a.categoria] !== ordemCat[b.categoria]) return ordemCat[a.categoria] - ordemCat[b.categoria];
    if (a.categoria === "concluso" && b.categoria === "concluso") {
      const pa = pesoConclusao(a.situacao), pb = pesoConclusao(b.situacao);
      if (pa !== pb) return pa - pb;
    }
    // em pauta e prazo: o mais proximo primeiro; concluso e parado: o mais antigo primeiro.
    const da = a.dia ?? "9999-99-99", db = b.dia ?? "9999-99-99";
    if (a.categoria === "parado") return (a.dia ?? "0000") < (b.dia ?? "0000") ? -1 : 1;
    return da < db ? -1 : da > db ? 1 : a.numero.localeCompare(b.numero);
  });
}
