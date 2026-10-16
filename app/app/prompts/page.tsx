import { GeradorPrompts } from "@/components/gerador-prompts";

export const dynamic = "force-dynamic";

export default function PromptsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Gerador de prompts</h1>
        <p className="text-sm text-muted-foreground">
          Prompts estruturados para qualquer IA (Claude, ChatGPT, Gemini,
          NotebookLM) em três passos: escolha a peça, preencha o contexto e
          copie o prompt pronto — TCE-PE, Eleitoral e Contencioso, com prazos
          e fundamentos conferidos.
        </p>
      </div>
      <GeradorPrompts />
    </div>
  );
}
