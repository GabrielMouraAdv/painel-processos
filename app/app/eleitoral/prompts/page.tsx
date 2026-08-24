import { GeradorPrompts } from "@/components/gerador-prompts";
import { exigirPaginaEleitoral } from "@/lib/eleitoral-server";

export const dynamic = "force-dynamic";

export default async function EleitoralPromptsPage() {
  await exigirPaginaEleitoral();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Gerador de prompts</h1>
        <p className="text-sm text-muted-foreground">
          Prompts estruturados para qualquer IA (Claude, ChatGPT, Gemini,
          NotebookLM): escolha a peça, preencha o contexto e copie o prompt
          pronto — ancorado na Lei 9.504/97, nas resolucoes do TSE e no
          Codigo Eleitoral.
        </p>
      </div>
      <GeradorPrompts modulos={["ele"]} />
    </div>
  );
}
