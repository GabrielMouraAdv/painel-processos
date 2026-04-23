import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ensureBucket,
  getPublicUrl,
  uploadFile,
} from "@/lib/storage";

const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

function sanitizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(-120);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;
  const userId = session.user.id;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Formulario invalido" },
      { status: 400 },
    );
  }

  const file = form.get("file");
  const escopo = String(form.get("escopo") ?? "").toLowerCase();
  const processoId = String(form.get("processoId") ?? "").trim();
  const tipo = String(form.get("tipo") ?? "").trim();
  const nomeRaw = String(form.get("nome") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Arquivo nao enviado" },
      { status: 400 },
    );
  }
  if (escopo !== "judicial" && escopo !== "tce") {
    return NextResponse.json(
      { error: "Escopo invalido. Use 'judicial' ou 'tce'." },
      { status: 400 },
    );
  }
  if (!processoId) {
    return NextResponse.json(
      { error: "Informe o processo" },
      { status: 400 },
    );
  }
  if (!tipo) {
    return NextResponse.json(
      { error: "Informe o tipo de documento" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Arquivo maior que 10MB" },
      { status: 400 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Arquivo vazio" }, { status: 400 });
  }
  if (!ALLOWED_MIMES.has(file.type)) {
    return NextResponse.json(
      {
        error:
          "Tipo de arquivo nao permitido. Envie PDF, DOC, DOCX, JPG ou PNG.",
      },
      { status: 400 },
    );
  }

  if (escopo === "judicial") {
    const proc = await prisma.processo.findFirst({
      where: { id: processoId, escritorioId },
      select: { id: true },
    });
    if (!proc) {
      return NextResponse.json(
        { error: "Processo nao encontrado" },
        { status: 404 },
      );
    }
  } else {
    const proc = await prisma.processoTce.findFirst({
      where: { id: processoId, escritorioId },
      select: { id: true },
    });
    if (!proc) {
      return NextResponse.json(
        { error: "Processo TCE nao encontrado" },
        { status: 404 },
      );
    }
  }

  try {
    await ensureBucket();
  } catch {
    // segue — se falhar, o upload abaixo retornara erro claro
  }

  const originalName = file.name || "arquivo";
  const nomeFinal = (nomeRaw || originalName).slice(0, 200);
  const timestamp = Date.now();
  const safeName = sanitizeName(originalName);
  const path = `${escopo}/${processoId}/${timestamp}-${safeName}`;

  const arrayBuffer = await file.arrayBuffer();

  try {
    await uploadFile(arrayBuffer, path, file.type);
  } catch (e) {
    const message = e instanceof Error ? e.message : "erro desconhecido";
    return NextResponse.json(
      { error: `Falha no upload: ${message}` },
      { status: 500 },
    );
  }

  const url = getPublicUrl(path);

  if (escopo === "judicial") {
    const doc = await prisma.documento.create({
      data: {
        processoId,
        nome: nomeFinal,
        url,
        tipo,
        tamanho: file.size,
        uploadedBy: userId,
      },
      select: { id: true },
    });
    return NextResponse.json({ id: doc.id, url, path }, { status: 201 });
  }

  const doc = await prisma.documentoTce.create({
    data: {
      processoTceId: processoId,
      nome: nomeFinal,
      url,
      tipo,
      tamanho: file.size,
      uploadedBy: userId,
    },
    select: { id: true },
  });
  return NextResponse.json({ id: doc.id, url, path }, { status: 201 });
}
