import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import { calcularDataVencimento } from "@/lib/dias-uteis";
import { prisma } from "@/lib/prisma";
import { processoTceInputSchema } from "@/lib/schemas";
import {
  getPrazoRecursoPorTipo,
  prazoAutomaticoDaFase,
} from "@/lib/tce-config";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;
  const userId = session.user.id;

  const body = await req.json().catch(() => null);
  const parsed = processoTceInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  if (data.municipioId) {
    const m = await prisma.municipio.findFirst({
      where: { id: data.municipioId, escritorioId },
      select: { id: true },
    });
    if (!m) {
      return NextResponse.json(
        { error: "Municipio nao encontrado" },
        { status: 400 },
      );
    }
  }

  if (data.interessados.length > 0) {
    const ids = data.interessados.map((i) => i.gestorId);
    const encontrados = await prisma.gestor.findMany({
      where: { id: { in: ids }, escritorioId },
      select: { id: true },
    });
    if (encontrados.length !== ids.length) {
      return NextResponse.json(
        { error: "Interessado invalido" },
        { status: 400 },
      );
    }
  }

  // Validacao do processoOrigemId quando for recurso
  if (data.ehRecurso && data.processoOrigemId) {
    const origem = await prisma.processoTce.findFirst({
      where: { id: data.processoOrigemId, escritorioId },
      select: { id: true },
    });
    if (!origem) {
      return NextResponse.json(
        { error: "Processo de origem nao encontrado" },
        { status: 400 },
      );
    }
  }

  try {
    const processo = await prisma.processoTce.create({
      data: {
        numero: data.numero,
        tipo: data.tipo,
        municipioId: data.municipioId || null,
        relator: data.relator || null,
        camara: data.camara,
        faseAtual: data.faseAtual,
        conselheiroSubstituto: data.conselheiroSubstituto || null,
        notaTecnica: data.notaTecnica ?? false,
        parecerMpco: data.parecerMpco ?? false,
        despachadoComRelator: data.despachadoComRelator ?? false,
        memorialPronto: data.memorialPronto ?? false,
        exercicio: data.exercicio || null,
        valorAutuado: data.valorAutuado ?? null,
        objeto: data.objeto,
        dataAutuacao: data.dataAutuacao ?? null,
        dataIntimacao: data.dataIntimacao ?? null,
        bancasSlug: data.bancasSlug,
        ehRecurso: data.ehRecurso ?? false,
        tipoRecurso: data.tipoRecurso ?? null,
        processoOrigemId: data.processoOrigemId ?? null,
        escritorioId,
        interessados: {
          create: data.interessados.map((i) => ({
            gestorId: i.gestorId,
            cargo: i.cargo,
          })),
        },
      },
      select: { id: true },
    });

    // Para recursos, prefere a configuracao por tipoRecurso (contrarrazoes)
    // quando ha dataIntimacao; caso contrario cai no prazoAutomaticoDaFase.
    if (data.dataIntimacao) {
      const prazoCfgRecurso =
        data.ehRecurso && data.tipoRecurso
          ? getPrazoRecursoPorTipo(data.tipoRecurso)
          : null;
      const prazoConfig =
        prazoCfgRecurso ?? prazoAutomaticoDaFase(data.tipo, data.faseAtual);
      if (prazoConfig) {
        await prisma.prazoTce.create({
          data: {
            processoId: processo.id,
            tipo: prazoConfig.tipo,
            dataIntimacao: data.dataIntimacao,
            dataVencimento: calcularDataVencimento(
              data.dataIntimacao,
              prazoConfig.diasUteis,
            ),
            diasUteis: prazoConfig.diasUteis,
            prorrogavel: prazoConfig.prorrogavel,
            advogadoRespId: userId,
            observacoes: data.ehRecurso
              ? `Prazo gerado automaticamente do recurso.`
              : `Prazo gerado automaticamente da fase ${data.faseAtual}.`,
          },
        });
      }
    }

    // Se for recurso, registra um andamento no processo de origem
    if (data.ehRecurso && data.processoOrigemId && data.tipoRecurso) {
      await prisma.andamentoTce.create({
        data: {
          processoId: data.processoOrigemId,
          data: data.dataAutuacao ?? new Date(),
          fase: "recurso_interposto",
          descricao: `Recurso ${data.tipoRecurso} interposto — processo ${data.numero}.`,
          autorId: userId,
        },
      });
    }

    let municipioNome = "";
    if (data.municipioId) {
      const m = await prisma.municipio.findUnique({
        where: { id: data.municipioId },
        select: { nome: true },
      });
      municipioNome = m?.nome ?? "";
    }
    await registrarLog({
      userId,
      acao: ACOES.CRIAR_PROCESSO_TCE,
      entidade: "ProcessoTce",
      entidadeId: processo.id,
      descricao: `${session.user.name ?? "Usuario"} criou processo TCE ${data.numero}${municipioNome ? ` (${municipioNome} - ${data.tipo})` : ` (${data.tipo})`}`,
      detalhes: { numero: data.numero, tipo: data.tipo, camara: data.camara, municipioId: data.municipioId, ehRecurso: data.ehRecurso },
      ip: extrairIp(req),
    });

    return NextResponse.json({ id: processo.id }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro";
    if (msg.includes("Unique")) {
      return NextResponse.json(
        { error: "Ja existe um processo com esse numero" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Erro ao criar processo" }, { status: 500 });
  }
}
