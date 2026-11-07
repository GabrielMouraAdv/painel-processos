// Marcas "Nota tecnica" e "Parecer MPCO" do ProcessoTce a partir do texto de um andamento.
//
// Regra combinada com o Gabriel (06/11/2026):
// - Nota tecnica: nota tecnica juntada/registrada ou parecer (tecnico) da DEX.
// - Parecer MPCO: so parecer (inclusive "parecer opinativo") do MPCO/MPC. A "cota" do
//   MPCO NAO conta (costuma ser pedido de diligencia).
// - Pedido ou solicitacao de nota tecnica/parecer nao conta (o documento ainda nao existe).
// A marca so e ligada automaticamente; nunca e desligada por aqui.

const PEDIDO = /(solicitad[ao]s?|solicitando|solicita[çc][ãa]o\s+de|pedido\s+de|aguarda(ndo)?)\s+(a\s+|o\s+|de\s+|da\s+|ao\s+|à\s+)?(nova\s+)?(nota\s+t[ée]cnica|parecer|opinativo)/i;

const NOTA_TECNICA = /(nota\s+t[ée]cnica|parecer\s+(t[ée]cnico\s+)?(da|de)\s+dex\b|parecer\s+t[ée]cnico)/i;

const PARECER_MPCO =
  /(parecer(es)?[^.;]{0,20}(mpco|minist[ée]rio\s+p[úu]blico\s+de\s+contas|\bmpc\b)|opinativos?[^.;]{0,20}(do\s+|da\s+)?(mpco|\bmpc\b)\s*(em\b|de\b|juntad|emitid|\()|pareceres\s+opinativos)/i;

export type MarcasAndamento = { notaTecnica: boolean; parecerMpco: boolean };

export function marcasDoAndamento(descricao: string | null | undefined): MarcasAndamento {
  const t = (descricao ?? "").replace(/\s+/g, " ");
  // Frase a frase: "solicitado parecer da DEX (16/09); parecer da DEX em 02/10" tem um pedido e um parecer.
  const frases = t.split(/[.;]|\s+e\s+(?=parecer|nota)/i);
  let notaTecnica = false;
  let parecerMpco = false;
  for (const f of frases) {
    // Tira so o trecho do pedido ("solicitada nota tecnica") e le o resto da frase.
    const sem = f.replace(new RegExp(PEDIDO.source, "gi"), " ");
    if (NOTA_TECNICA.test(sem)) notaTecnica = true;
    if (PARECER_MPCO.test(sem)) parecerMpco = true;
  }
  return { notaTecnica, parecerMpco };
}

// Campos a ligar no processo (so os que ainda estao desligados).
export function camposMarcas(
  processo: { notaTecnica: boolean; parecerMpco: boolean },
  descricoes: (string | null | undefined)[],
): Partial<MarcasAndamento> {
  const out: Partial<MarcasAndamento> = {};
  for (const d of descricoes) {
    const m = marcasDoAndamento(d);
    if (m.notaTecnica && !processo.notaTecnica) out.notaTecnica = true;
    if (m.parecerMpco && !processo.parecerMpco) out.parecerMpco = true;
  }
  return out;
}
