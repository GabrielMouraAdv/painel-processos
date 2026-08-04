import { NextResponse } from "next/server";

import { DOMINIO_ELEITORAL } from "@/lib/eleitoral";
import { prisma } from "@/lib/prisma";
import { ensureBucket, getPublicUrl, uploadFile } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_EXT = new Set(["pdf", "md", "docx", "doc", "txt", "html"]);

function autorizado(req: Request): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.INTEGRACAO_ELEITORAL_SECRET ?? "";
  return expected.length > 0 && auth === `Bearer ${expected}`;
}

function sanitizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(-120);
}

export async function POST(req: Request) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Formulario invalido" }, { status: 400 });
  }

  const file = form.get("file");
  const titulo = String(form.get("titulo") ?? "").trim();
  const dataReferenciaRaw = String(form.get("dataReferencia") ?? "").trim();
  const observacoes = String(form.get("observacoes") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo nao enviado" }, { status: 400 });
  }
  if (!titulo) {
    return NextResponse.json({ error: "Informe o titulo" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Arquivo acima de 20MB" }, { status: 400 });
  }
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return NextResponse.json(
      { error: "Formato nao suportado" },
      { status: 400 },
    );
  }

  const dataReferencia = dataReferenciaRaw
    ? new Date(`${dataReferenciaRaw}T12:00:00`)
    : new Date();
  if (Number.isNaN(dataReferencia.getTime())) {
    return NextResponse.json(
      { error: "Data de referencia invalida" },
      { status: 400 },
    );
  }

  // O upload automatizado e atribuido ao primeiro usuario do dominio
  // eleitoral (na pratica, gabriel@eleitoral2026.com).
  const sistema = await prisma.user.findFirst({
    where: { email: { endsWith: DOMINIO_ELEITORAL } },
    orderBy: { createdAt: "asc" },
    select: { id: true, escritorioId: true },
  });
  if (!sistema) {
    return NextResponse.json(
      { error: "Nenhum usuario eleitoral encontrado" },
      { status: 500 },
    );
  }

  const path = `eleitoral/relatorios/${Date.now()}_${sanitizeName(file.name)}`;
  const mime = file.type || "application/octet-stream";

  await ensureBucket();
  await uploadFile(await file.arrayBuffer(), path, mime);

  const relatorio = await prisma.relatorioEleitoral.create({
    data: {
      titulo,
      dataReferencia,
      nomeArquivo: file.name,
      url: getPublicUrl(path),
      mime,
      tamanho: file.size,
      observacoes: observacoes || null,
      uploadedById: sistema.id,
      escritorioId: sistema.escritorioId,
    },
  });

  return NextResponse.json({ relatorio: { id: relatorio.id } }, { status: 201 });
}
