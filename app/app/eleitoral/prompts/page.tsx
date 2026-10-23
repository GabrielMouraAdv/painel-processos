import { GeradorPrompts } from "@/components/gerador-prompts";
import { exigirPaginaEleitoral } from "@/lib/eleitoral-server";
import { PaginaCabecalho } from "@/components/pagina-cabecalho";

export const dynamic = "force-dynamic";

export default async function EleitoralPromptsPage() {
  await exigirPaginaEleitoral();

  return (
    <div className="space-y-6">
      <PaginaCabecalho
        compacto
        secao="Eleitoral 2026"
        titulo="Gerador de prompts"
        descricao="Prompts estruturados para qualquer IA: escolha a peça, preencha o contexto e copie o prompt pronto, ancorado na Lei 9.504/97, nas resoluções do TSE e no Código Eleitoral."
      />
      <GeradorPrompts modulos={["ele"]} />
    </div>
  );
}
