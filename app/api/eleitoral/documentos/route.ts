import { NextResponse } from "next/server";

import { registrarLog } from "@/lib/audit-log";
import { exigirSessaoEleitoral } from "@/lib/eleitoral";
import { CATEGORIAS_DOCUMENTO_ELEITORAL } from "@/lib/eleitoral-labels";
import { prisma } from "@/lib/prisma";
import { ensureBucket, getPublicUrl, uploadFile } from "@/lib/storage";

const MAX_BYTES = 20 * 1024 * 1024;

const ALLOWED_EXT = new Set([
  "pdf",
  "doc",
  "docx",
  "odt",
  "txt",
  "md",
  "jpg",
  "jpeg",
  "png",
  "mp4",
  "mp3",
  "zip",
]);

const CATEGORIAS_VALIDAS = new Set<string>(
  CATEGORIAS_DOCUMENTO_ELEITORAL.map((c) => c.value),
);

function sanitizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(-120);
}

export async function POST(req: Request) {
  const session = await exigirSessaoEleitoral();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Formulario invalido" }, { status: 400 });
  }

  const file = form.get("file");
  const processoId = String(form.get("processoId") ?? "").trim();
  const nome = String(form.get("nome") ?? "").trim();
  const categoriaRaw = String(form.get("categoria") ?? "OUTRO").trim();
  const observacoes = String(form.get("observacoes") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo nao enviado" }, { status: 400 });
  }
  if (!processoId) {
    return NextResponse.json({ error: "Processo nao informado" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Arquivo acima de 20MB" }, { status: 400 });
  }

  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return NextResponse.json(
      {
        error:
          "Formato nao suportado. Use PDF, DOC/DOCX, TXT, MD, imagem, MP4, MP3 ou ZIP.",
      },
      { status: 400 },
    );
  }

  const categoria = CATEGORIAS_VALIDAS.has(categoriaRaw) ? categoriaRaw : "OUTRO";

  const processo = await prisma.processoEleitoral.findFirst({
    where: { id: processoId, escritorioId },
    select: { id: true, numero: true },
  });
  if (!processo) {
    return NextResponse.json(
      { error: "Processo nao encontrado" },
      { status: 404 },
    );
  }

  const path = `eleitoral/processos/${processo.id}/${Date.now()}_${sanitizeName(file.name)}`;
  const mime = file.type || "application/octet-stream";

  await ensureBucket();
  await uploadFile(await file.arrayBuffer(), path, mime);

  const documento = await prisma.documentoEleitoral.create({
    data: {
      processoId: processo.id,
      nome: nome || file.name,
      categoria,
      nomeArquivo: file.name,
      url: getPublicUrl(path),
      mime,
      tamanho: file.size,
      observacoes: observacoes || null,
      uploadedById: session.user.id,
    },
    include: { uploadedBy: { select: { id: true, nome: true } } },
  });

  await registrarLog({
    userId: session.user.id,
    acao: "UPLOAD_DOCUMENTO_ELEITORAL",
    entidade: "DocumentoEleitoral",
    entidadeId: documento.id,
    descricao: `Enviou a peca "${documento.nome}" no processo ${processo.numero}`,
  });

  return NextResponse.json({ documento }, { status: 201 });
}
