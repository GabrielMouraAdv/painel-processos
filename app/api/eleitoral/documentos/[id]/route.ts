import { NextResponse } from "next/server";

import { registrarLog } from "@/lib/audit-log";
import { exigirSessaoEleitoral } from "@/lib/eleitoral";
import { prisma } from "@/lib/prisma";
import { BUCKET_DOCUMENTOS, deleteFile } from "@/lib/storage";

type Params = { params: { id: string } };

function pathFromPublicUrl(url: string): string | null {
  const marker = `/object/public/${BUCKET_DOCUMENTOS}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await exigirSessaoEleitoral();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const documento = await prisma.documentoEleitoral.findFirst({
    where: {
      id: params.id,
      processo: { escritorioId: session.user.escritorioId },
    },
  });
  if (!documento) {
    return NextResponse.json(
      { error: "Documento nao encontrado" },
      { status: 404 },
    );
  }

  const path = pathFromPublicUrl(documento.url);
  if (path) {
    try {
      await deleteFile(path);
    } catch {
      // arquivo pode ja ter sido removido do storage; segue a exclusao
    }
  }

  await prisma.documentoEleitoral.delete({ where: { id: documento.id } });

  await registrarLog({
    userId: session.user.id,
    acao: "EXCLUIR_DOCUMENTO_ELEITORAL",
    entidade: "DocumentoEleitoral",
    entidadeId: documento.id,
    descricao: `Excluiu a peca "${documento.nome}"`,
  });

  return NextResponse.json({ ok: true });
}
