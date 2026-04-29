import { redirect } from "next/navigation";

// Rota legada: recursos agora sao ProcessoTce autonomos. Redireciona para
// /app/tce/processos. O usuario pode usar busca global ou listagem.
export default function SubprocessoLegadoRedirect() {
  redirect("/app/tce/processos");
}
