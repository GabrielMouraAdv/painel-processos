import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { TipoInteressado } from "@prisma/client";

import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gestorInputSchema } from "@/lib/schemas";

async function ensureOwned(id: string, escritorioId: string) {
  return prisma.gestor.findFirst({
    where: { id, escritorioId },
    select: { id: true, nome: true },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const existing = await ensureOwned(params.id, escritorioId);
  if (!existing)
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = gestorInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const isPj = data.tipoInteressado === TipoInteressado.PESSOA_JURIDICA;

  let municipiosValidados: { id: string; nome: string }[] = [];
  if (isPj && data.municipioIds.length > 0) {
    municipiosValidados = await prisma.municipio.findMany({
      where: { id: { in: data.municipioIds }, escritorioId },
      select: { id: true, nome: true },
    });
    if (municipiosValidados.length !== data.municipioIds.length) {
      return NextResponse.json(
        { error: "Algum municipio informado e invalido" },
        { status: 400 },
      );
    }
  }

  const nomePrincipal = isPj
    ? (data.razaoSocial as string)
    : (data.nome as string);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.gestor.update({
        where: { id: params.id },
        data: {
          tipoInteressado: data.tipoInteressado,
          nome: nomePrincipal,
          cpf: isPj ? null : (data.cpf ?? null),
          municipio: isPj ? "" : (data.municipio ?? ""),
          cargo: isPj ? "" : (data.cargo ?? ""),
          email: data.email ?? null,
          telefone: data.telefone ?? null,
          observacoes: data.observacoes ?? null,
          razaoSocial: isPj ? (data.razaoSocial ?? null) : null,
          nomeFantasia: isPj ? (data.nomeFantasia ?? null) : null,
          cnpj: isPj ? (data.cnpj ?? null) : null,
          ramoAtividade: isPj ? (data.ramoAtividade ?? null) : null,
        },
      });

      // Atualiza vinculos de municipios apenas para PJ
      if (isPj) {
        await tx.gestorMunicipio.deleteMany({
          where: { gestorId: params.id },
        });
        if (municipiosValidados.length > 0) {
          await tx.gestorMunicipio.createMany({
            data: municipiosValidados.map((m) => ({
              gestorId: params.id,
              municipioId: m.id,
            })),
          });
        }
      } else {
        // Trocou para PF: limpa eventuais vinculos antigos de PJ
        await tx.gestorMunicipio.deleteMany({
          where: { gestorId: params.id },
        });
      }
    });
    await registrarLog({
      userId: session.user.id,
      acao: ACOES.EDITAR_GESTOR,
      entidade: "Gestor",
      entidadeId: params.id,
      descricao: `${session.user.name ?? "Usuario"} editou interessado ${nomePrincipal} (${isPj ? "PJ" : "PF"})`,
      detalhes: { tipoInteressado: data.tipoInteressado },
      ip: extrairIp(req),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro";
    if (msg.includes("Unique")) {
      return NextResponse.json(
        { error: "Ja existe um interessado com esse CPF/CNPJ" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Erro ao atualizar interessado" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const existing = await ensureOwned(params.id, session.user.escritorioId);
  if (!existing)
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  const [judCount, tceCount] = await Promise.all([
    prisma.processo.count({ where: { gestorId: params.id } }),
    prisma.interessadoProcessoTce.count({ where: { gestorId: params.id } }),
  ]);
  const total = judCount + tceCount;
  if (total > 0) {
    return NextResponse.json(
      {
        error: `Nao e possivel excluir: existem ${total} processo${total === 1 ? "" : "s"} vinculado${total === 1 ? "" : "s"}. Remova ou transfira os processos antes.`,
        processosJudiciais: judCount,
        processosTce: tceCount,
      },
      { status: 409 },
    );
  }

  await prisma.gestor.delete({ where: { id: params.id } });
  await registrarLog({
    userId: session.user.id,
    acao: ACOES.EXCLUIR_GESTOR,
    entidade: "Gestor",
    entidadeId: params.id,
    descricao: `${session.user.name ?? "Usuario"} excluiu interessado ${existing.nome}`,
    ip: extrairIp(req),
  });
  return NextResponse.json({ ok: true });
}
