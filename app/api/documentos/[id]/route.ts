import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BUCKET_DOCUMENTOS, deleteFile } from "@/lib/storage";

function pathFromUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET_DOCUMENTOS}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.substring(idx + marker.length);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json(
      { error: "Sem permissao para excluir documentos" },
      { status: 403 },
    );
  }

  const escritorioId = session.user.escritorioId;
  const url = new URL(req.url);
  const escopo = url.searchParams.get("escopo");

  if (escopo === "tce") {
    const doc = await prisma.documentoTce.findFirst({
      where: {
        id: params.id,
        processo: { escritorioId },
      },
      select: { id: true, url: true, nome: true, processo: { select: { numero: true } } },
    });
    if (!doc) {
      return NextResponse.json(
        { error: "Documento nao encontrado" },
        { status: 404 },
      );
    }
    const path = pathFromUrl(doc.url);
    if (path) {
      try {
        await deleteFile(path);
      } catch {
        // segue removendo o registro mesmo se o arquivo ja nao existir
      }
    }
    await prisma.documentoTce.delete({ where: { id: doc.id } });
    await registrarLog({
      userId: session.user.id,
      acao: ACOES.EXCLUIR_DOCUMENTO,
      entidade: "DocumentoTce",
      entidadeId: doc.id,
      descricao: `${session.user.name ?? "Usuario"} excluiu documento "${doc.nome}" do processo TCE ${doc.processo.numero}`,
      ip: extrairIp(req),
    });
    return NextResponse.json({ ok: true });
  }

  // default: judicial
  const doc = await prisma.documento.findFirst({
    where: {
      id: params.id,
      processo: { escritorioId },
    },
    select: { id: true, url: true, nome: true, processo: { select: { numero: true } } },
  });
  if (!doc) {
    return NextResponse.json(
      { error: "Documento nao encontrado" },
      { status: 404 },
    );
  }
  const path = pathFromUrl(doc.url);
  if (path) {
    try {
      await deleteFile(path);
    } catch {
      // segue removendo o registro mesmo se o arquivo ja nao existir
    }
  }
  await prisma.documento.delete({ where: { id: doc.id } });
  await registrarLog({
    userId: session.user.id,
    acao: ACOES.EXCLUIR_DOCUMENTO,
    entidade: "Documento",
    entidadeId: doc.id,
    descricao: `${session.user.name ?? "Usuario"} excluiu documento "${doc.nome}" do processo ${doc.processo.numero}`,
    ip: extrairIp(req),
  });
  return NextResponse.json({ ok: true });
}
