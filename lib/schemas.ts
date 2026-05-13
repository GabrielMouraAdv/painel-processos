import {
  CamaraTce,
  Grau,
  Risco,
  TipoAditivo,
  TipoHonorario,
  TipoInteressado,
  TipoProcesso,
  TipoProcessoTce,
  TipoRecursoTce,
  Tribunal,
} from "@prisma/client";
import { z } from "zod";

import { isBancaSlug } from "./bancas";

const bancasSlugSchema = z
  .array(z.string())
  .nonempty({ message: "Selecione pelo menos uma banca" })
  .transform((arr) =>
    Array.from(
      new Set(arr.map((s) => s.trim().toLowerCase()).filter((s) => s.length > 0)),
    ),
  )
  .refine((arr) => arr.length > 0 && arr.every(isBancaSlug), {
    message: "Banca invalida",
  });

const bancasSlugOptional = z
  .array(z.string())
  .optional()
  .transform((arr) => {
    if (!arr) return undefined;
    return Array.from(
      new Set(
        arr.map((s) => s.trim().toLowerCase()).filter((s) => s.length > 0),
      ),
    );
  })
  .refine((arr) => arr === undefined || arr.every(isBancaSlug), {
    message: "Banca invalida",
  });

export const processoInputSchema = z
  .object({
    numero: z
      .string()
      .min(1, "Informe o numero do processo")
      .max(50, "Numero muito longo"),
    tipo: z.nativeEnum(TipoProcesso),
    tipoLivre: z
      .string()
      .max(120)
      .nullish()
      .transform((v) => (v ? v.trim() || null : null)),
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
  })
  .superRefine((data, ctx) => {
    if (data.tipo === TipoProcesso.OUTRO && !data.tipoLivre) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tipoLivre"],
        message: "Descreva o tipo da acao",
      });
    }
  });

export type ProcessoInput = z.infer<typeof processoInputSchema>;

const optionalString = (max: number) =>
  z
    .string()
    .max(max)
    .nullish()
    .transform((v) => (v ? v.trim() || null : null));

export const gestorInputSchema = z
  .object({
    tipoInteressado: z
      .nativeEnum(TipoInteressado)
      .optional()
      .default(TipoInteressado.PESSOA_FISICA),
    // PF
    nome: z.string().nullish(),
    cpf: optionalString(20),
    cargo: z.string().nullish(),
    municipio: z.string().nullish(),
    // PJ
    razaoSocial: optionalString(160),
    nomeFantasia: optionalString(160),
    cnpj: optionalString(20),
    ramoAtividade: optionalString(120),
    municipioIds: z.array(z.string()).optional().default([]),
    // Comum
    email: optionalString(120),
    telefone: optionalString(40),
    observacoes: z.string().nullish(),
  })
  .superRefine((data, ctx) => {
    if (data.tipoInteressado === TipoInteressado.PESSOA_FISICA) {
      if (!data.nome || !data.nome.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["nome"],
          message: "Informe o nome",
        });
      }
      if (!data.cargo || !data.cargo.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cargo"],
          message: "Informe o cargo",
        });
      }
      if (!data.municipio || !data.municipio.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["municipio"],
          message: "Informe o municipio",
        });
      }
    } else {
      if (!data.razaoSocial || !data.razaoSocial.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["razaoSocial"],
          message: "Informe a razao social",
        });
      }
    }
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

export const COMPROMISSO_TIPOS = [
  "REUNIAO",
  "AUDIENCIA",
  "SUSTENTACAO",
  "DESPACHO_PRESENCIAL",
  "VIAGEM",
  "PESSOAL",
  "OUTRO",
] as const;
export type CompromissoTipo = (typeof COMPROMISSO_TIPOS)[number];

export const COMPROMISSO_CATEGORIAS = [
  "ESCRITORIO",
  "PROFISSIONAL_PRIVADO",
  "PESSOAL",
] as const;
export type CompromissoCategoria = (typeof COMPROMISSO_CATEGORIAS)[number];

const compromissoDateTime = z
  .union([z.string(), z.date()])
  .transform((v) => (v instanceof Date ? v : new Date(v)))
  .refine((d) => !Number.isNaN(d.getTime()), { message: "Data invalida" });

export const compromissoCreateSchema = z.object({
  titulo: z.string().min(1, "Informe o titulo").max(200),
  descricao: z.string().max(2000).optional().nullable(),
  dataInicio: compromissoDateTime,
  dataFim: z
    .union([z.string(), z.date(), z.null()])
    .nullish()
    .transform((v) => {
      if (v === null || v === undefined || v === "") return null;
      const d = v instanceof Date ? v : new Date(v);
      return Number.isNaN(d.getTime()) ? null : d;
    }),
  diaInteiro: z.boolean().default(false),
  cor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor invalida")
    .optional()
    .nullable(),
  tipo: z.enum(COMPROMISSO_TIPOS),
  categoria: z.enum(COMPROMISSO_CATEGORIAS).default("ESCRITORIO"),
  escritorioResponsavelSlug: z
    .string()
    .max(60)
    .optional()
    .nullable(),
  local: z.string().max(200).optional().nullable(),
  advogadoId: z.string().min(1, "Selecione o advogado responsavel"),
  processoTceId: z.string().optional().nullable(),
  processoId: z.string().optional().nullable(),
});

export type CompromissoCreateInput = z.infer<typeof compromissoCreateSchema>;

export const compromissoUpdateSchema = compromissoCreateSchema.partial().extend({
  cumprido: z.boolean().optional(),
});

export const compromissoMoverSchema = z.object({
  id: z.string().min(1),
  origem: z.enum(["compromisso", "prazoTce", "prazoJudicial"]),
  novaData: compromissoDateTime,
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
  bancasSlug: bancasSlugSchema,
  interessados: z.array(interessadoItemSchema).optional().default([]),
  // Campos de recurso (opcionais; quando preenchidos, marcam o processo como
  // recurso autonomo vinculado a outro ProcessoTce de origem).
  ehRecurso: z.boolean().optional().default(false),
  tipoRecurso: z.nativeEnum(TipoRecursoTce).optional().nullable(),
  processoOrigemId: z.string().optional().nullable(),
});

export type ProcessoTceInput = z.infer<typeof processoTceInputSchema>;

export { bancasSlugSchema, bancasSlugOptional };

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


// ========== FINANCEIRO ==========

const decimalPositivo = z.coerce
  .number()
  .nonnegative("Valor deve ser positivo")
  .transform((v) => Number(v.toFixed(2)));

const decimalPositivoOptional = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "string" ? Number(v) : v;
    if (!Number.isFinite(n) || n < 0) return null;
    return Number(n.toFixed(2));
  });

export const contratoMunicipalInputSchema = z.object({
  municipioId: z.string().min(1, "Selecione o municipio"),
  bancasSlug: bancasSlugSchema,
  valorMensal: decimalPositivo,
  dataInicio: dateInput,
  dataFim: optionalDate,
  observacoes: z.string().optional().nullable(),
  ativo: z.boolean().optional().default(true),
  dataRenovacao: optionalDate,
  diasAvisoRenovacao: z.coerce.number().int().min(0).max(365).optional().default(60),
  observacoesRenovacao: z.string().optional().nullable(),
  numeroContrato: optionalString(60),
  cnpjContratante: optionalString(20),
  orgaoContratante: optionalString(160),
  representanteContratante: optionalString(160),
  cargoRepresentante: optionalString(120),
  objetoDoContrato: z
    .string({ message: "Informe o objeto do contrato" })
    .min(20, "O objeto do contrato deve ter pelo menos 20 caracteres"),
  // Se true (default), gera notas automaticamente apos criar
  gerarNotasAutomaticas: z.boolean().optional().default(true),
});
export type ContratoMunicipalInput = z.infer<
  typeof contratoMunicipalInputSchema
>;

export const contratoMunicipalUpdateSchema = z.object({
  municipioId: z.string().min(1).optional(),
  bancasSlug: bancasSlugOptional,
  valorMensal: decimalPositivo.optional(),
  dataInicio: dateInput.optional(),
  dataFim: optionalDate,
  observacoes: z.string().optional().nullable(),
  ativo: z.boolean().optional(),
  dataRenovacao: optionalDate,
  diasAvisoRenovacao: z.coerce.number().int().min(0).max(365).optional(),
  observacoesRenovacao: z.string().optional().nullable(),
  numeroContrato: optionalString(60),
  cnpjContratante: optionalString(20),
  orgaoContratante: optionalString(160),
  representanteContratante: optionalString(160),
  cargoRepresentante: optionalString(120),
  objetoDoContrato: z.string().min(20).optional(),
});

export const aditivoInputSchema = z.object({
  tipo: z.nativeEnum(TipoAditivo),
  justificativa: z.string().min(10, "Descreva a justificativa"),
  fundamento: z.string().min(10, "Informe o fundamento legal"),
  escritorioSlug: z.string().min(1, "Selecione o escritorio emissor"),
  advogadoIdx: z.coerce.number().int().min(0).optional().default(0),
});
export type AditivoInput = z.infer<typeof aditivoInputSchema>;

export const renovarContratoSchema = z.object({
  novaDataFim: dateInput,
  novoValorMensal: decimalPositivo.optional(),
  novaDataRenovacao: optionalDate,
});

export const notaFiscalInputSchema = z.object({
  contratoId: z.string().min(1, "Selecione o contrato"),
  numeroNota: z.string().optional().nullable(),
  dataEmissao: optionalDate,
  mesReferencia: z.coerce.number().int().min(1).max(12),
  anoReferencia: z.coerce.number().int().min(2023).max(2030),
  valorNota: decimalPositivo,
  dataVencimento: dateInput,
  pago: z.boolean().optional().default(false),
  dataPagamento: optionalDate,
  valorPago: decimalPositivoOptional,
  observacoes: z.string().optional().nullable(),
});
export type NotaFiscalInput = z.infer<typeof notaFiscalInputSchema>;

export const notaFiscalUpdateSchema = z.object({
  numeroNota: z.string().optional().nullable(),
  dataEmissao: optionalDate,
  mesReferencia: z.coerce.number().int().min(1).max(12).optional(),
  anoReferencia: z.coerce.number().int().min(2023).max(2030).optional(),
  valorNota: decimalPositivo.optional(),
  dataVencimento: dateInput.optional(),
  pago: z.boolean().optional(),
  dataPagamento: optionalDate,
  valorPago: decimalPositivoOptional,
  observacoes: z.string().optional().nullable(),
});

export const honorarioPessoalInputSchema = z.object({
  clienteNome: z.string().min(1, "Nome do cliente obrigatorio"),
  clienteCpf: z.string().optional().nullable(),
  bancasSlug: bancasSlugSchema,
  tipoHonorario: z.nativeEnum(TipoHonorario),
  descricaoCausa: z.string().min(1, "Descreva a causa"),
  valorTotal: decimalPositivo,
  dataContrato: dateInput,
  dataVencimento: optionalDate,
  pago: z.boolean().optional().default(false),
  dataPagamento: optionalDate,
  valorPago: decimalPositivoOptional,
  observacoes: z.string().optional().nullable(),
});
export type HonorarioPessoalInput = z.infer<
  typeof honorarioPessoalInputSchema
>;

export const honorarioPessoalUpdateSchema = z.object({
  clienteNome: z.string().min(1).optional(),
  clienteCpf: z.string().optional().nullable(),
  bancasSlug: bancasSlugOptional,
  tipoHonorario: z.nativeEnum(TipoHonorario).optional(),
  descricaoCausa: z.string().min(1).optional(),
  valorTotal: decimalPositivo.optional(),
  dataContrato: dateInput.optional(),
  dataVencimento: optionalDate,
  pago: z.boolean().optional(),
  dataPagamento: optionalDate,
  valorPago: decimalPositivoOptional,
  observacoes: z.string().optional().nullable(),
});
