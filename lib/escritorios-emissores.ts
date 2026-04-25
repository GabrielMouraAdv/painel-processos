export type AdvogadoEmissor = {
  nome: string;
  oab: string;
};

export type EscritorioEmissor = {
  slug: string;
  nome: string;
  advogados: AdvogadoEmissor[];
};

export const ESCRITORIOS_EMISSORES: EscritorioEmissor[] = [
  {
    slug: "gabriel-moura",
    nome: "Gabriel Moura Advocacia",
    advogados: [
      { nome: "Gabriel Vidal de Moura", oab: "OAB/PE 58.958" },
    ],
  },
  {
    slug: "filipe-campos",
    nome: "Filipe Campos Advocacia",
    advogados: [
      { nome: "Filipe Fernandes Campos", oab: "OAB/PE 31.509" },
    ],
  },
  {
    slug: "porto-rodrigues",
    nome: "Porto e Rodrigues Advocacia",
    advogados: [
      { nome: "Julio Tiago de C. Rodrigues", oab: "OAB/PE 23.610" },
      { nome: "Carlos Porto de Barros", oab: "OAB/PE 4.581" },
    ],
  },
];

export function findEscritorio(slug: string): EscritorioEmissor | null {
  return ESCRITORIOS_EMISSORES.find((e) => e.slug === slug) ?? null;
}

export function resolveEmissor(
  slug: string,
  advogadoIdx: number,
): { escritorio: EscritorioEmissor; advogado: AdvogadoEmissor } | null {
  const esc = findEscritorio(slug);
  if (!esc) return null;
  const adv = esc.advogados[advogadoIdx] ?? esc.advogados[0];
  if (!adv) return null;
  return { escritorio: esc, advogado: adv };
}

// Estrutura preparada para receber imagens em
//   public/escritorios/<slug>/header.png
//   public/escritorios/<slug>/footer.png
//   public/escritorios/<slug>/marca-dagua.png
// Quando os arquivos existirem, os geradores de PDF poderao consumi-las
// via path no filesystem (renderToBuffer roda no servidor).
export function imagensEscritorioPaths(slug: string) {
  return {
    header: `public/escritorios/${slug}/header.png`,
    footer: `public/escritorios/${slug}/footer.png`,
    marcaDagua: `public/escritorios/${slug}/marca-dagua.png`,
  };
}
