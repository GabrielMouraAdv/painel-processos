import { GeradorPrompts } from "@/components/gerador-prompts";
import { PaginaCabecalho } from "@/components/pagina-cabecalho";

export const dynamic = "force-dynamic";

export default function PromptsPage() {
  return (
    <div className="space-y-6">
      <PaginaCabecalho
        compacto
        secao="Escritório"
        titulo="Modelos de peça"
        descricao="Prompts estruturados para qualquer IA (Claude, ChatGPT, Gemini, NotebookLM) em três passos: escolha a peça, preencha o contexto e copie o prompt pronto. TCE-PE, Eleitoral e Contencioso, com prazos e fundamentos conferidos."
      />
      <GeradorPrompts />
    </div>
  );
}
