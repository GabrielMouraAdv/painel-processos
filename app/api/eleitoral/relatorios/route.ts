import { NextResponse } from "next/server";

import { registrarLog } from "@/lib/audit-log";
import { exigirSessaoEleitoral } from "@/lib/eleitoral";
import { prisma } from "@/lib/prisma";
import { ensureBucket, getPublicUrl, uploadFile } from "@/lib/storage";

const MAX_BYTES = 20 * 1024 * 1024;

// Relatorios chegam como .pdf ou .md (fluxo de monitoramento), mas
// aceitamos tambem .docx/.txt/.html por conveniencia.
const ALLOWED_EXT = new Set(["pdf", "md", "docx", "doc", "txt", "html"]);

function sanitizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(-120);
}

export async function GET() {
  const session = await exigirSessaoEleitoral();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const relatorios = await prisma.relatorioEleitoral.findMany({
    where: { escritorioId: session.user.escritorioId },
    orderBy: [{ dataReferencia: "desc" }, { createdAt: "desc" }],
    include: { uploadedBy: { select: { id: true, nome: true } } },
  });

  return NextResponse.json({ relatorios });
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
  const titulo = String(form.get("titulo") ?? "").trim();
  const dataReferenciaRaw = String(form.get("dataReferencia") ?? "").trim();
  const observacoes = String(form.get("observacoes") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo nao enviado" }, { status: 400 });
  }
  if (!titulo) {
    return NextResponse.json(
      { error: "Informe o titulo do relatorio" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Arquivo acima de 20MB" },
      { status: 400 },
    );
  }

  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return NextResponse.json(
      { error: "Formato nao suportado. Use PDF, MD, DOCX, TXT ou HTML." },
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
      uploadedById: session.user.id,
      escritorioId,
    },
    include: { uploadedBy: { select: { id: true, nome: true } } },
  });

  await registrarLog({
    userId: session.user.id,
    acao: "UPLOAD_RELATORIO_ELEITORAL",
    entidade: "RelatorioEleitoral",
    entidadeId: relatorio.id,
    descricao: `Enviou relatorio eleitoral "${titulo}" (${file.name})`,
  });

  return NextResponse.json({ relatorio }, { status: 201 });
}
