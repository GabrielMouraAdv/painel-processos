import { cn } from "@/lib/utils";

// Numero do processo padronizado (Direcao A): fonte mono, ano em destaque,
// digito/zeros atenuados e sufixo de recurso (ED001, RO002...) como etiqueta.
//   TCE:  19100290-2  /  19100290-2RO001
//   CNJ:  0000523-30.2017.8.17.2180
export function NumeroProcesso({
  numero,
  tamanho = "normal",
  className,
}: {
  numero: string;
  tamanho?: "normal" | "grande";
  className?: string;
}) {
  const base = cn(
    "whitespace-nowrap font-mono tracking-tight text-brand-tinta",
    tamanho === "grande" ? "text-3xl font-medium md:text-4xl" : "text-sm",
    className,
  );

  const tce = /^(\d{2})(\d{5,6})(-\d)([A-Z]{2,3}\d{3})?$/.exec(numero);
  if (tce) {
    const [, ano, seq, dv, sufixo] = tce;
    return (
      <span className={base} aria-label={`Processo ${numero}`}>
        <span className="font-semibold text-brand-navy">{ano}</span>
        {seq}
        <span className="text-slate-400">{dv}</span>
        {sufixo && (
          <span
            className={cn(
              "ml-1 rounded bg-accent px-1 align-middle font-semibold text-brand-navy",
              tamanho === "grande" ? "text-xl" : "text-[11px]",
            )}
          >
            {sufixo}
          </span>
        )}
      </span>
    );
  }

  const cnj = /^(0*)(\d+-\d{2}\.)(\d{4})(\.\d\.\d{2}\.\d{4})$/.exec(numero);
  if (cnj) {
    const [, zeros, seq, ano, origem] = cnj;
    return (
      <span className={base} aria-label={`Processo ${numero}`}>
        <span className="text-slate-400">{zeros}</span>
        {seq}
        <span className="font-semibold text-brand-navy">{ano}</span>
        <span className="text-slate-400">{origem}</span>
      </span>
    );
  }

  return <span className={base}>{numero}</span>;
}
