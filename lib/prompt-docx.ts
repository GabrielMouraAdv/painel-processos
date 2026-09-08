/**
 * Gera e baixa o prompt em .docx (client-side).
 * A lib `docx` e carregada sob demanda para nao pesar o bundle da pagina.
 */

/** Monta o .docx a partir do texto do prompt (linhas "# X" viram titulos). */
export async function gerarPromptDocx(texto: string): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun } = await import("docx");

  const paragrafos = texto.split("\n").map((linha) => {
    if (linha.startsWith("# ")) {
      return new Paragraph({
        spacing: { before: 280, after: 120 },
        children: [
          new TextRun({ text: linha.replace(/^#\s*/, ""), bold: true, size: 24 }),
        ],
      });
    }
    return new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: linha, size: 22 })],
    });
  });

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22 } },
      },
    },
    sections: [{ children: paragrafos }],
  });

  return Packer.toBlob(doc);
}

/** Dispara o download do .docx no navegador. */
export async function baixarPromptDocx(texto: string, nomeArquivo: string) {
  const blob = await gerarPromptDocx(texto);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nomeArquivo}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // revoga depois do clique para nao cancelar o download em curso
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
