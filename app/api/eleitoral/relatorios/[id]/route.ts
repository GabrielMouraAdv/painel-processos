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

  const relatorio = await prisma.relatorioEleitoral.findFirst({
    where: { id: params.id, escritorioId: session.user.escritorioId },
  });
  if (!relatorio) {
    return NextResponse.json(
      { error: "Relatorio nao encontrado" },
      { status: 404 },
    );
  }

  const path = pathFromPublicUrl(relatorio.url);
  if (path) {
    try {
      await deleteFile(path);
    } catch {
      // arquivo pode ja ter sido removido do storage; segue a exclusao
    }
  }

  await prisma.relatorioEleitoral.delete({ where: { id: relatorio.id } });

  await registrarLog({
    userId: session.user.id,
    acao: "EXCLUIR_RELATORIO_ELEITORAL",
    entidade: "RelatorioEleitoral",
    entidadeId: relatorio.id,
    descricao: `Excluiu relatorio eleitoral "${relatorio.titulo}"`,
  });

  return NextResponse.json({ ok: true });
}
