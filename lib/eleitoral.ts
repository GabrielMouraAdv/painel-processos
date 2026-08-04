import { getServerSession, type Session } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { consultarProcesso } from "@/lib/datajud";
import { prisma } from "@/lib/prisma";

// ============================================================
// Permissoes: o modulo eleitoral e um "painel dentro do painel".
// So enxerga (e so enxerga ele) quem loga com e-mail do dominio
// dedicado @eleitoral2026.com.
// ============================================================

export const DOMINIO_ELEITORAL = "@eleitoral2026.com";

export function isUsuarioEleitoral(
  email: string | null | undefined,
): boolean {
  if (!email) return false;
  return email.toLowerCase().trim().endsWith(DOMINIO_ELEITORAL);
}

/** Sessao valida E usuario do dominio eleitoral; caso contrario, null. */
export async function exigirSessaoEleitoral(): Promise<Session | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  if (!isUsuarioEleitoral(session.user.email)) return null;
  return session;
}

// Labels e helpers de data (client-safe) vivem em lib/eleitoral-labels.ts.
export {
  CLASSES_ELEITORAIS,
  POLOS_ELEITORAIS,
  STATUS_ELEITORAIS,
  labelClasseEleitoral,
  labelPoloEleitoral,
  labelStatusEleitoral,
} from "@/lib/eleitoral-labels";

// ============================================================
// Schemas (zod)
// ============================================================

const classeEnum = z.enum([
  "REPRESENTACAO",
  "AIJE",
  "AIME",
  "PETICAO",
  "MANDADO_SEGURANCA",
  "RECURSO",
  "OUTRO",
]);

export const processoEleitoralCreateSchema = z.object({
  numero: z.string().trim().min(10, "Informe o numero do processo"),
  classe: classeEnum.default("REPRESENTACAO"),
  apelido: z.string().trim().max(200).optional().nullable(),
  parteAutora: z.string().trim().min(1, "Informe a parte autora"),
  parteRe: z.string().trim().min(1, "Informe a parte re"),
  polo: z.enum(["ATIVO", "PASSIVO"]).default("PASSIVO"),
  objeto: z.string().trim().min(1, "Informe o objeto"),
  relator: z.string().trim().optional().nullable(),
  coordenadorId: z.string().optional().nullable(),
  advogadoRespId: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  /** Quando o cadastro nasce da triagem, a deteccao e marcada como CADASTRADO. */
  deteccaoId: z.string().optional().nullable(),
});

export const processoEleitoralUpdateSchema = processoEleitoralCreateSchema
  .omit({ deteccaoId: true })
  .partial()
  .extend({
    status: z.enum(["EM_TRAMITACAO", "JULGADO", "ARQUIVADO"]).optional(),
    resultado: z.string().optional().nullable(),
  });

const statusPrazoEnum = z.enum([
  "PENDENTE",
  "IMPORTANTE",
  "EM_ELABORACAO",
  "ENVIADO_REVISAO",
  "CUMPRIDO",
  "PERDIDO",
  "DISPENSADO",
]);

export const prazoEleitoralCreateSchema = z.object({
  processoId: z.string().min(1),
  tarefa: z.string().trim().min(1, "Informe a tarefa"),
  data: z.coerce.date(),
  hora: z.string().trim().optional().nullable(),
  responsavelId: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  status: statusPrazoEnum.default("PENDENTE"),
});

export const prazoEleitoralUpdateSchema = z.object({
  tarefa: z.string().trim().min(1).optional(),
  data: z.coerce.date().optional(),
  hora: z.string().trim().nullable().optional(),
  responsavelId: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
  cumprido: z.boolean().optional(),
  status: statusPrazoEnum.optional(),
});

/**
 * `status` e a fonte da verdade; `cumprido` continua existindo para as
 * telas/contagens antigas. Aqui mantemos os dois coerentes: mexeu em um,
 * o outro acompanha.
 */
export function sincronizarStatusPrazo(input: {
  status?: z.infer<typeof statusPrazoEnum>;
  cumprido?: boolean;
}): { status?: z.infer<typeof statusPrazoEnum>; cumprido?: boolean } {
  if (input.status !== undefined) {
    return { status: input.status, cumprido: input.status === "CUMPRIDO" };
  }
  if (input.cumprido !== undefined) {
    return {
      cumprido: input.cumprido,
      status: input.cumprido ? "CUMPRIDO" : "PENDENTE",
    };
  }
  return {};
}

// ============================================================
// Movimentos via Datajud (TRE-PE)
// ============================================================

export type SincronizacaoMovimentos = {
  novos: number;
  total: number;
  erro?: string;
};

/**
 * Consulta o Datajud (endpoint publico do CNJ para o TRE-PE) e grava os
 * movimentos que ainda nao existem no banco. Idempotente: movimentos ja
 * gravados sao ignorados pela unique (processoId, dataHora, nome).
 */
export async function sincronizarMovimentosEleitoral(
  processoId: string,
): Promise<SincronizacaoMovimentos> {
  const processo = await prisma.processoEleitoral.findUnique({
    where: { id: processoId },
    select: { id: true, numero: true },
  });
  if (!processo) {
    return { novos: 0, total: 0, erro: "Processo nao encontrado" };
  }

  const resultado = await consultarProcesso(processo.numero, "TRE-PE");
  if (!resultado) {
    return {
      novos: 0,
      total: 0,
      erro: "Datajud indisponivel ou processo nao localizado no TRE-PE",
    };
  }

  const rows = resultado.movimentos
    .map((m) => {
      const dataHora = new Date(m.dataHora);
      if (!m.nome || Number.isNaN(dataHora.getTime())) return null;
      return {
        processoId: processo.id,
        codigo: m.codigo,
        nome: m.nome,
        complemento: m.complementos.length ? m.complementos.join("; ") : null,
        dataHora,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  let novos = 0;
  if (rows.length > 0) {
    const res = await prisma.movimentoEleitoral.createMany({
      data: rows,
      skipDuplicates: true,
    });
    novos = res.count;
  }

  await prisma.processoEleitoral.update({
    where: { id: processo.id },
    data: {
      datajudClasse: resultado.classe,
      datajudOrgao: resultado.orgaoJulgador,
      ultimaConsultaDatajud: new Date(),
    },
  });

  return { novos, total: rows.length };
}
