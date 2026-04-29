// Cadastro central das bancas que patrocinam processos no painel.
// Cada `ProcessoTce` (incluindo recursos, que tambem sao ProcessoTce com
// ehRecurso=true) carrega `bancasSlug: string[]`, onde cada slug aponta
// para um item desta lista.
//
// Util tanto para filtros de UI (badge colorido + multi-select) quanto para
// validacao server-side. Nao confunda com `lib/escritorios-emissores.ts`,
// que controla a identidade visual de PDFs (cabecalho, rodape, assinatura).
// Os dois tem slugs em comum por convencao, mas tem propositos diferentes.

export type BancaCor =
  | "blue"
  | "green"
  | "purple"
  | "orange"
  | "pink"
  | "amber";

export type Banca = {
  slug: string;
  nome: string;
  advogado: string;
  oab: string;
  cor: BancaCor;
};

export const BANCAS: Banca[] = [
  {
    slug: "filipe-campos",
    nome: "Filipe Campos Advocacia",
    advogado: "Filipe Fernandes Campos",
    oab: "OAB/PE 31.509",
    cor: "blue",
  },
  {
    slug: "porto-rodrigues",
    nome: "Porto e Rodrigues Advocacia",
    advogado: "Julio Tiago de C. Rodrigues",
    oab: "OAB/PE 23.610",
    cor: "green",
  },
  {
    slug: "gabriel-moura",
    nome: "Gabriel Moura Advocacia",
    advogado: "Gabriel Vidal de Moura",
    oab: "OAB/PE 58.958",
    cor: "purple",
  },
  {
    slug: "paulo-maciel",
    nome: "Paulo Maciel Advocacia",
    advogado: "Paulo Maciel",
    oab: "",
    cor: "orange",
  },
  {
    slug: "heloisa",
    nome: "Heloisa Cavalcanti Advocacia",
    advogado: "Maria Heloisa Leal Cavalcanti",
    oab: "OAB/PE 63.060",
    cor: "pink",
  },
  {
    slug: "henrique",
    nome: "Henrique Arruda Advocacia",
    advogado: "Henrique Moura de Arruda",
    oab: "OAB/PE 50.695",
    cor: "amber",
  },
];

const BANCAS_BY_SLUG = new Map(BANCAS.map((b) => [b.slug, b]));
export const BANCA_SLUGS_VALIDOS: readonly string[] = BANCAS.map((b) => b.slug);
const BANCA_SLUGS_SET = new Set(BANCA_SLUGS_VALIDOS);

export function getBanca(slug: string): Banca | null {
  return BANCAS_BY_SLUG.get(slug) ?? null;
}

export function isBancaSlug(slug: string): boolean {
  return BANCA_SLUGS_SET.has(slug);
}

// Filtra/normaliza um array de slugs vindos do client (ex.: searchParams.banca).
// Aceita string unica, array ou string com virgulas. Sempre devolve unique slugs validos.
export function parseBancasParam(
  raw: string | string[] | undefined | null,
): string[] {
  if (!raw) return [];
  const lista = Array.isArray(raw) ? raw : raw.split(",");
  const set = new Set<string>();
  for (const item of lista) {
    const norm = item.trim().toLowerCase();
    if (BANCA_SLUGS_SET.has(norm)) set.add(norm);
  }
  return Array.from(set);
}

// Mapeia BancaCor -> classes Tailwind para badge solido (com hover).
// Mantenha sincronizado com tailwind.config (nao usamos JIT-only para nao perder build).
const BADGE_CLASSES: Record<BancaCor, string> = {
  blue: "bg-blue-100 text-blue-800 ring-blue-200",
  green: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  purple: "bg-purple-100 text-purple-800 ring-purple-200",
  orange: "bg-orange-100 text-orange-800 ring-orange-200",
  pink: "bg-pink-100 text-pink-800 ring-pink-200",
  amber: "bg-amber-100 text-amber-900 ring-amber-200",
};

export function bancaBadgeClasses(cor: BancaCor): string {
  return BADGE_CLASSES[cor];
}

// Versao "dot" — circulo colorido pequeno (para listas densas)
const DOT_CLASSES: Record<BancaCor, string> = {
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
  pink: "bg-pink-500",
  amber: "bg-amber-500",
};

export function bancaDotClasses(cor: BancaCor): string {
  return DOT_CLASSES[cor];
}
