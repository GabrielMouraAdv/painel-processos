import { PaginaCabecalho } from "@/components/pagina-cabecalho";
import { MUNICIPIOS } from "@/lib/simulador/municipios";

import { SimuladorPisoView } from "./simulador-piso-view";

// Simulador de direitos de servidores municipais, para conduzir reunioes com
// grupos de servidores. Uso interno (fica atras do login do painel).
export default function SimuladorPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-3 py-4 sm:px-6 sm:py-8 md:px-8 print:max-w-none print:p-0">
      <PaginaCabecalho
        compacto
        secao="Captação · uso interno"
        titulo="Simulador de direitos"
        descricao="Estimativa ilustrativa do que o servidor teria a receber, por município. Não é cálculo de liquidação."
        className="print:hidden"
      />
      <SimuladorPisoView municipios={MUNICIPIOS} />
    </div>
  );
}
