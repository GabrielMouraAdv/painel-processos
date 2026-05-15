import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { podeAcessarFinanceiro } from "@/lib/financeiro";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";

function extractPathFromUrl(url: string): string | null {
  const m = /\/storage\/v1\/object\/public\/[^/]+\/(.+)$/.exec(url);
  return m ? decodeURIComponent(m[1]) : null;
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    if (
      !podeAcessarFinanceiro(session.user.role, session.user.email ?? null)
    ) {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
    }
    const nota = await prisma.notaFiscal.findFirst({
      where: {
        id: params.id,
        contrato: { municipio: { escritorioId: session.user.escritorioId } },
      },
      select: { id: true, arquivoUrl: true },
    });
    if (!nota) {
      return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
    }
    if (nota.arquivoUrl) {
      const path = extractPathFromUrl(nota.arquivoUrl);
      if (path) {
        try {
          await deleteFile(path);
        } catch (e) {
          console.warn("[delete arquivo nota] falha ao remover do storage:", e);
        }
      }
    }
    await prisma.notaFiscal.update({
      where: { id: nota.id },
      data: {
        arquivoUrl: null,
        arquivoNome: null,
        arquivoTipo: null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/financeiro/notas/[id]/arquivo] erro:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 },
    );
  }
}
