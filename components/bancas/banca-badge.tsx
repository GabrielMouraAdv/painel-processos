import { cn } from "@/lib/utils";
import { bancaBadgeClasses, bancaDotClasses, getBanca } from "@/lib/bancas";

type Props = {
  slug: string;
  size?: "sm" | "md";
  className?: string;
};

export function BancaBadge({ slug, size = "md", className }: Props) {
  const banca = getBanca(slug);
  if (!banca) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 ring-1 ring-slate-200",
          className,
        )}
        title={`Banca desconhecida: ${slug}`}
      >
        {slug}
      </span>
    );
  }
  const sz = size === "sm" ? "px-1.5 py-0 text-[9px]" : "px-2 py-0.5 text-[10px]";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium ring-1",
        sz,
        bancaBadgeClasses(banca.cor),
        className,
      )}
      title={`${banca.nome}${banca.advogado ? ` — ${banca.advogado}` : ""}`}
    >
      {banca.nome}
    </span>
  );
}

type ListProps = {
  slugs: string[];
  size?: "sm" | "md";
  max?: number;
  className?: string;
};

export function BancaBadgeList({ slugs, size = "sm", max, className }: ListProps) {
  if (!slugs || slugs.length === 0) {
    return (
      <span className="text-[10px] italic text-slate-400">sem banca</span>
    );
  }
  const lista = max ? slugs.slice(0, max) : slugs;
  const overflow = max ? slugs.length - lista.length : 0;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      {lista.map((s) => (
        <BancaBadge key={s} slug={s} size={size} />
      ))}
      {overflow > 0 && (
        <span className="text-[10px] text-slate-500">+{overflow}</span>
      )}
    </span>
  );
}

type DotProps = {
  slug: string;
  className?: string;
};

export function BancaDot({ slug, className }: DotProps) {
  const banca = getBanca(slug);
  if (!banca) {
    return (
      <span
        className={cn("inline-block h-2 w-2 rounded-full bg-slate-300", className)}
        title={`Banca desconhecida: ${slug}`}
      />
    );
  }
  return (
    <span
      className={cn("inline-block h-2 w-2 rounded-full", bancaDotClasses(banca.cor), className)}
      title={banca.nome}
    />
  );
}
