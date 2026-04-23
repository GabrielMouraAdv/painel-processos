export const PRAZO_TIPOS = [
  "Elaborar Memorial",
  "Despacho com Relator",
  "Contestacao",
  "Replica",
  "Alegacoes Finais",
  "Embargos de Declaracao",
  "Apelacao",
  "Contrarrazoes",
  "Recurso Especial",
  "Recurso Extraordinario",
  "Agravo",
  "Audiencia",
] as const;

export const PRAZO_TIPO_OUTRO = "Outro";

export function isTipoPreset(tipo: string): boolean {
  return (PRAZO_TIPOS as readonly string[]).includes(tipo);
}
