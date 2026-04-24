const PALAVRAS_INTIMACAO = [
  "intimacao",
  "intimação",
  "intima-se",
  "ciencia",
  "ciência",
  "prazo",
  "contestacao",
  "contestação",
  "manifestacao",
  "manifestação",
];

const PALAVRAS_DECISAO = [
  "sentenca",
  "sentença",
  "acordao",
  "acórdão",
  "decisao",
  "decisão",
];

function normaliza(texto: string): string {
  return texto.toLowerCase();
}

export function detectaIntimacao(conteudo: string | null | undefined): boolean {
  if (!conteudo) return false;
  const t = normaliza(conteudo);
  return PALAVRAS_INTIMACAO.some((p) => t.includes(p));
}

export function detectaDecisao(nome: string | null | undefined): boolean {
  if (!nome) return false;
  const t = normaliza(nome);
  return PALAVRAS_DECISAO.some((p) => t.includes(p));
}
