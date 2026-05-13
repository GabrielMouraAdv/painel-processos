export type EventoOrigem = "compromisso" | "prazoTce" | "prazoJudicial";

export type CompromissoCategoriaEvento =
  | "ESCRITORIO"
  | "PROFISSIONAL_PRIVADO"
  | "PESSOAL";

export type CalendarEvento = {
  id: string;
  origem: EventoOrigem;
  titulo: string;
  descricao: string | null;
  dataInicio: string;
  dataFim: string | null;
  diaInteiro: boolean;
  cor: string | null;
  tipo: string | null;
  categoria: CompromissoCategoriaEvento | null;
  privado: boolean;
  escritorioResponsavelSlug: string | null;
  local: string | null;
  cumprido: boolean;
  dispensado: boolean;
  advogado: { id: string; nome: string } | null;
  processoRef: {
    tipo: "tce" | "judicial";
    id: string;
    numero: string;
  } | null;
};
