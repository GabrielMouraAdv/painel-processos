import { Grau, Risco, TipoProcesso, Tribunal } from "@prisma/client";
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
  cpf: z.string().min(11, "CPF invalido").max(20),
  municipio: z.string().min(1, "Informe o municipio"),
  cargo: z.string().min(1, "Informe o cargo"),
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
});

export type PrazoCreateInput = z.infer<typeof prazoCreateSchema>;

export const prazoUpdateSchema = z.object({
  cumprido: z.boolean().optional(),
});

