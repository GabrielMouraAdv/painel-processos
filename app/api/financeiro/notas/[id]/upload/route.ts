import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomUUID } from "node:crypto";

import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import { podeAcessarFinanceiro } from "@/lib/financeiro";
import { prisma } from "@/lib/prisma";
import {
  deleteFile,
  ensureBucket,
  getPublicUrl,
  uploadFile,
} from "@/lib/storage";

const TIPOS_PERMITIDOS = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/xml",
  "text/xml",
]);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function extensao(name: string, mime: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  if (m) return m[1].toLowerCase();
  if (mime === "application/pdf") return "pdf";
  if (mime === "application/xml" || mime === "text/xml") return "xml";
  if (mime === "image/png") return "png";
  return "jpg";
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    if (
      !podeAcessarFinanceiro(session.user.role, session.user.bancaSlug ?? null)
    ) {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
    }

    // Verifica nota + ownership
    const nota = await prisma.notaFiscal.findFirst({
      where: {
        id: params.id,
        contrato: { municipio: { escritorioId: session.user.escritorioId } },
      },
      select: {
        id: true,
        contratoId: true,
        arquivoUrl: true,
      },
    });
    if (!nota) {
      return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
    }

    const form = await req.formData().catch(() => null);
    if (!form) {
      return NextResponse.json({ error: "Body invalido" }, { status: 400 });
    }
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Arquivo obrigatorio (campo 'file')" },
        { status: 400 },
      );
    }
    if (!TIPOS_PERMITIDOS.has(file.type)) {
      return NextResponse.json(
        { error: `Tipo nao permitido: ${file.type}. Use PDF, JPG, PNG ou XML.` },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `Arquivo grande demais (${Math.round(file.size / 1024 / 1024)} MB). Limite 10 MB.` },
        { status: 400 },
      );
    }

    await ensureBucket();

    // Se ja tinha arquivo, remove o antigo
    if (nota.arquivoUrl) {
      const path = extractPathFromUrl(nota.arquivoUrl);
      if (path) {
        try {
          await deleteFile(path);
        } catch (e) {
          console.warn("[upload nota] falha ao remover antigo:", e);
        }
      }
    }

    const ext = extensao(file.name, file.type);
    const path = `notas-fiscais/${nota.contratoId}/${nota.id}-${randomUUID()}.${ext}`;
    const buffer = await file.arrayBuffer();
    await uploadFile(buffer, path, file.type);

    const url = getPublicUrl(path);

    await prisma.notaFiscal.update({
      where: { id: nota.id },
      data: {
        arquivoUrl: url,
        arquivoNome: file.name,
        arquivoTipo: file.type,
      },
    });

    await registrarLog({
      userId: session.user.id,
      acao: ACOES.UPLOAD_NOTA_FISCAL,
      entidade: "NotaFiscal",
      entidadeId: nota.id,
      descricao: `${session.user.name ?? "Usuario"} fez upload do arquivo "${file.name}" da nota fiscal`,
      detalhes: { tamanho: file.size, tipo: file.type },
      ip: extrairIp(req),
    });

    return NextResponse.json(
      { ok: true, arquivoUrl: url, arquivoNome: file.name, arquivoTipo: file.type },
      { status: 200 },
    );
  } catch (err) {
    console.error("[POST /api/financeiro/notas/[id]/upload] erro:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno no upload" },
      { status: 500 },
    );
  }
}

// Extrai o path do bucket a partir de uma URL publica do Supabase
function extractPathFromUrl(url: string): string | null {
  const m = /\/storage\/v1\/object\/public\/[^/]+\/(.+)$/.exec(url);
  return m ? decodeURIComponent(m[1]) : null;
}
