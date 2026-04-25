import {
  CamaraTce,
  Grau,
  Risco,
  TipoProcesso,
  TipoProcessoTce,
  Tribunal,
} from "@prisma/client";
import { z } from "zod";

export const processoInputSchema = z.object({
  numero: z
    .string()
    .min(1, "Informe o numero do processo")
    .max(50, "Numero muito longo"),
  tipo: z.nativeEnum(TipoProcesso),
  tribunal: z.nativeEnum(Tribunal),
  juizo: z.string().min(1, "Informe o juizo"),
  grau: z.nativeEnum(Grau),
  fase: z.string().min(1, "Selecione a fase"),
  resultado: z.string().nullish(),
  risco: z.nativeEnum(Risco),
  valor: z
    .union([z.string(), z.number()])
    .nullish()
    .transform((v) => {
      if (v === null || v === undefined || v === "") return null;
      const n = typeof v === "number" ? v : Number(String(v).replace(/\./g, "").replace(",", "."));
      return Number.isFinite(n) ? n : null;
    }),
  dataDistribuicao: z
    .union([z.string(), z.date()])
    .transform((v) => (v instanceof Date ? v : new Date(v))),
  objeto: z.string().min(1, "Informe o objeto da acao"),
  gestorId: z.string().min(1, "Selecione o gestor"),
  advogadoId: z.string().min(1, "Selecione o advogado responsavel"),
});

export type ProcessoInput = z.infer<typeof processoInputSchema>;

export const gestorInputSchema = z.object({
  nome: z.string().min(1, "Informe o nome"),
  cpf: z
    .string()
    .max(20)
    .nullish()
    .transform((v) => (v ? v.trim() : null) || null),
  municipio: z.string().min(1, "Informe o municipio"),
  cargo: z.string().min(1, "Informe o cargo"),
  email: z
    .string()
    .max(120)
    .nullish()
    .transform((v) => (v ? v.trim() : null) || null),
  telefone: z
    .string()
    .max(40)
    .nullish()
    .transform((v) => (v ? v.trim() : null) || null),
  observacoes: z.string().nullish(),
});

export type GestorInput = z.infer<typeof gestorInputSchema>;

export const acaoAutomaticaSchema = z.object({
  tipoPrazo: z.string().min(1),
  data: z
    .union([z.string(), z.date()])
    .transform((v) => (v instanceof Date ? v : new Date(v))),
  origemFase: z.string().optional(),
});

export const andamentoInputSchema = z.object({
  data: z
    .union([z.string(), z.date()])
    .transform((v) => (v instanceof Date ? v : new Date(v))),
  grau: z.nativeEnum(Grau),
  fase: z.string().min(1, "Selecione a fase"),
  resultado: z.string().nullish(),
  texto: z.string().min(1, "Descreva o andamento"),
  acoes: z.array(acaoAutomaticaSchema).optional().default([]),
});

export type AndamentoInput = z.infer<typeof andamentoInputSchema>;

export const prazoCreateSchema = z.object({
  processoId: z.string().min(1, "Selecione o processo"),
  tipo: z.string().min(1, "Informe o tipo"),
  data: z
    .union([z.string(), z.date()])
    .transform((v) => (v instanceof Date ? v : new Date(v))),
  hora: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  advogadoRespId: z.string().min(1, "Selecione o advogado responsavel"),
});

export type PrazoCreateInput = z.infer<typeof prazoCreateSchema>;

export const prazoUpdateSchema = z.object({
  cumprido: z.boolean().optional(),
  tipo: z.string().min(1).optional(),
  data: z
    .union([z.string(), z.date()])
    .transform((v) => (v instanceof Date ? v : new Date(v)))
    .optional(),
  hora: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  advogadoRespId: z.string().min(1, "Selecione o advogado responsavel").optional(),
});

const dateInput = z
  .union([z.string(), z.date()])
  .transform((v) => (v instanceof Date ? v : new Date(v)));

const optionalDate = z
  .union([z.string(), z.date(), z.null()])
  .nullish()
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    return v instanceof Date ? v : new Date(v);
  });

const optionalDecimal = z
  .union([z.string(), z.number(), z.null()])
  .nullish()
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    const n =
      typeof v === "number"
        ? v
        : Number(String(v).replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  });

export const municipioInputSchema = z.object({
  nome: z.string().min(1, "Informe o nome"),
  uf: z.string().min(2, "UF invalida").max(2, "UF deve ter 2 letras"),
  cnpjPrefeitura: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

export type MunicipioInput = z.infer<typeof municipioInputSchema>;

const interessadoItemSchema = z.object({
  gestorId: z.string().min(1, "Selecione o gestor"),
  cargo: z.string().min(1, "Informe o cargo"),
});

export const processoTceInputSchema = z.object({
  numero: z.string().min(1, "Informe o numero"),
  tipo: z.nativeEnum(TipoProcessoTce),
  municipioId: z.string().optional().nullable(),
  relator: z.string().optional().nullable(),
  camara: z.nativeEnum(CamaraTce),
  faseAtual: z.string().min(1, "Selecione a fase"),
  conselheiroSubstituto: z.string().optional().nullable(),
  notaTecnica: z.boolean().optional().default(false),
  parecerMpco: z.boolean().optional().default(false),
  despachadoComRelator: z.boolean().optional().default(false),
  memorialPronto: z.boolean().optional().default(false),
  exercicio: z.string().optional().nullable(),
  valorAutuado: optionalDecimal,
  objeto: z.string().min(1, "Informe o objeto"),
  dataAutuacao: optionalDate,
  dataIntimacao: optionalDate,
  interessados: z.array(interessadoItemSchema).optional().default([]),
});

export type ProcessoTceInput = z.infer<typeof processoTceInputSchema>;

export const processoTceUpdateSchema = z.object({
  numero: z.string().min(1).optional(),
  tipo: z.nativeEnum(TipoProcessoTce).optional(),
  municipioId: z.string().optional().nullable(),
  relator: z.string().optional().nullable(),
  camara: z.nativeEnum(CamaraTce).optional(),
  faseAtual: z.string().min(1).optional(),
  conselheiroSubstituto: z.string().optional().nullable(),
  notaTecnica: z.boolean().optional(),
  parecerMpco: z.boolean().optional(),
  despachadoComRelator: z.boolean().optional(),
  memorialPronto: z.boolean().optional(),
  exercicio: z.string().optional().nullable(),
  valorAutuado: optionalDecimal,
  objeto: z.string().min(1).optional(),
  dataAutuacao: optionalDate,
  dataIntimacao: optionalDate,
});

export const andamentoTceInputSchema = z.object({
  processoId: z.string().min(1),
  data: dateInput,
  fase: z.string().min(1, "Selecione a fase"),
  descricao: z.string().min(1, "Descreva o andamento"),
  atualizarFaseProcesso: z.boolean().optional().default(true),
  gerarPrazoAutomatico: z.boolean().optional().default(false),
  dataIntimacao: optionalDate,
  advogadoRespId: z.string().optional().nullable(),
});

export type AndamentoTceInput = z.infer<typeof andamentoTceInputSchema>;

export const prazoTceCreateSchema = z.object({
  processoId: z.string().min(1),
  tipo: z.string().min(1, "Informe o tipo"),
  dataIntimacao: dateInput,
  dataVencimento: dateInput,
  diasUteis: z.coerce.number().int().min(1, "Dias uteis invalidos"),
  prorrogavel: z.boolean().optional().default(true),
  prorrogacaoPedida: z.boolean().optional().default(false),
  dataProrrogacao: optionalDate,
  cumprido: z.boolean().optional().default(false),
  advogadoRespId: z.string().min(1, "Selecione o advogado responsavel"),
  observacoes: z.string().optional().nullable(),
});

export type PrazoTceCreateInput = z.infer<typeof prazoTceCreateSchema>;

export const prazoTceUpdateSchema = z.object({
  tipo: z.string().min(1).optional(),
  dataIntimacao: dateInput.optional(),
  dataVencimento: dateInput.optional(),
  diasUteis: z.coerce.number().int().min(1).optional(),
  prorrogavel: z.boolean().optional(),
  prorrogacaoPedida: z.boolean().optional(),
  dataProrrogacao: optionalDate,
  cumprido: z.boolean().optional(),
  advogadoRespId: z.string().min(1, "Selecione o advogado responsavel").optional(),
  observacoes: z.string().optional().nullable(),
});

export const interessadoTceInputSchema = z.object({
  processoId: z.string().min(1),
  gestorId: z.string().min(1),
  cargo: z.string().min(1, "Informe o cargo"),
});

export const sessaoPautaInputSchema = z.object({
  data: dateInput,
  camara: z.nativeEnum(CamaraTce),
  observacoesGerais: z.string().optional().nullable(),
});

export type SessaoPautaInput = z.infer<typeof sessaoPautaInputSchema>;

export const sessaoPautaUpdateSchema = z.object({
  data: dateInput.optional(),
  camara: z.nativeEnum(CamaraTce).optional(),
  observacoesGerais: z.string().optional().nullable(),
});

export const itemPautaInputSchema = z.object({
  sessaoId: z.string().min(1, "Selecione a sessao"),
  numeroProcesso: z.string().min(1, "Informe o numero do processo"),
  tituloProcesso: z.string().optional().nullable(),
  municipio: z.string().min(1, "Informe o municipio"),
  exercicio: z.string().optional().nullable(),
  relator: z.string().min(1, "Informe o relator"),
  advogadoResp: z.string().min(1, "Informe o advogado responsavel"),
  situacao: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  prognostico: z.string().optional().nullable(),
  providencia: z.string().optional().nullable(),
  retiradoDePauta: z.boolean().optional().default(false),
  pedidoVistas: z.boolean().optional().default(false),
  conselheiroVistas: z.string().optional().nullable(),
  processoTceId: z.string().optional().nullable(),
  ordem: z.coerce.number().int().optional(),
});

export type ItemPautaInput = z.infer<typeof itemPautaInputSchema>;

export const itemPautaUpdateSchema = z.object({
  numeroProcesso: z.string().min(1).optional(),
  tituloProcesso: z.string().optional().nullable(),
  municipio: z.string().min(1).optional(),
  exercicio: z.string().optional().nullable(),
  relator: z.string().min(1).optional(),
  advogadoResp: z.string().min(1).optional(),
  situacao: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  prognostico: z.string().optional().nullable(),
  providencia: z.string().optional().nullable(),
  retiradoDePauta: z.boolean().optional(),
  pedidoVistas: z.boolean().optional(),
  conselheiroVistas: z.string().optional().nullable(),
  processoTceId: z.string().optional().nullable(),
  ordem: z.coerce.number().int().optional(),
});

export const sessaoJudicialInputSchema = z.object({
  data: dateInput,
  tribunal: z.string().min(1, "Informe o tribunal"),
  orgaoJulgador: z.string().min(1, "Selecione o orgao julgador"),
  tipoSessao: z
    .enum(["presencial", "virtual", "plenario_virtual"])
    .optional()
    .default("presencial"),
  observacoesGerais: z.string().optional().nullable(),
});

export type SessaoJudicialInput = z.infer<typeof sessaoJudicialInputSchema>;

export const sessaoJudicialUpdateSchema = z.object({
  data: dateInput.optional(),
  tribunal: z.string().min(1).optional(),
  orgaoJulgador: z.string().min(1).optional(),
  tipoSessao: z
    .enum(["presencial", "virtual", "plenario_virtual"])
    .optional(),
  observacoesGerais: z.string().optional().nullable(),
});

export const itemPautaJudicialInputSchema = z.object({
  sessaoId: z.string().min(1, "Selecione a sessao"),
  numeroProcesso: z.string().min(1, "Informe o numero do processo"),
  tituloProcesso: z.string().optional().nullable(),
  tipoRecurso: z.string().optional().nullable(),
  partes: z.string().optional().nullable(),
  relator: z.string().min(1, "Informe o relator"),
  advogadoResp: z.string().min(1, "Informe o advogado responsavel"),
  situacao: z.string().optional().nullable(),
  prognostico: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  providencia: z.string().optional().nullable(),
  sustentacaoOral: z.boolean().optional().default(false),
  advogadoSustentacao: z.string().optional().nullable(),
  sessaoVirtual: z.boolean().optional().default(false),
  pedidoRetPresencial: z.boolean().optional().default(false),
  retiradoDePauta: z.boolean().optional().default(false),
  pedidoVistas: z.boolean().optional().default(false),
  desPedidoVistas: z.string().optional().nullable(),
  parecerMpf: z.boolean().optional().default(false),
  processoId: z.string().optional().nullable(),
  ordem: z.coerce.number().int().optional(),
});

export type ItemPautaJudicialInput = z.infer<
  typeof itemPautaJudicialInputSchema
>;

export const itemPautaJudicialUpdateSchema = z.object({
  numeroProcesso: z.string().min(1).optional(),
  tituloProcesso: z.string().optional().nullable(),
  tipoRecurso: z.string().optional().nullable(),
  partes: z.string().optional().nullable(),
  relator: z.string().min(1).optional(),
  advogadoResp: z.string().min(1).optional(),
  situacao: z.string().optional().nullable(),
  prognostico: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  providencia: z.string().optional().nullable(),
  sustentacaoOral: z.boolean().optional(),
  advogadoSustentacao: z.string().optional().nullable(),
  sessaoVirtual: z.boolean().optional(),
  pedidoRetPresencial: z.boolean().optional(),
  retiradoDePauta: z.boolean().optional(),
  pedidoVistas: z.boolean().optional(),
  desPedidoVistas: z.string().optional().nullable(),
  parecerMpf: z.boolean().optional(),
  processoId: z.string().optional().nullable(),
  ordem: z.coerce.number().int().optional(),
});

